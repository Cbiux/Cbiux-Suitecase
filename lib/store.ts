import { randomBytes, timingSafeEqual } from "crypto";
import { POSITION_CATALOG } from "./positions";
import { t } from "./i18n";
import { getWallets, RESERVATION_MINUTES, SINPE_HOLD_HOURS } from "./config";
import { parseComprobanteDataUrl } from "./comprobante";
import { issueCheckoutGrant, readCheckoutGrant } from "./checkout-token";
import { loadStoreRaw, saveStoreRaw } from "./persist";
import type {
  InventoryResponse,
  LivePosition,
  Locale,
  OfferRecord,
  OfferStatus,
  PaymentNetwork,
  PaymentRecord,
  PositionState,
  SpotStatus,
  StoreShape,
} from "./types";

const emptyState = (): PositionState => ({
  status: "available",
  sponsor: "",
  email: "",
  logo: "",
  reservedUntil: "",
  recoveryToken: "",
  txHash: "",
  network: "",
  checkoutToken: "",
  comprobante: "",
});

function seedStore(): StoreShape {
  const positions: StoreShape["positions"] = {};
  for (const position of POSITION_CATALOG) {
    positions[String(position.id)] = emptyState();
  }
  return { positions, payments: [], offers: [], updatedAt: new Date().toISOString() };
}

let writeQueue: Promise<unknown> = Promise.resolve();

function hydrateOffer(offer: OfferRecord): OfferRecord {
  return {
    ...offer,
    status: offer.status ?? "pending",
    note: offer.note ?? "",
  };
}

async function readStore(): Promise<StoreShape> {
  try {
    const raw = await loadStoreRaw();
    if (!raw) throw new Error("empty");
    const parsed = JSON.parse(raw) as StoreShape;
    const seeded = seedStore();
    for (const position of POSITION_CATALOG) {
      const key = String(position.id);
      parsed.positions[key] = { ...emptyState(), ...parsed.positions[key] };
    }
    parsed.payments = parsed.payments ?? [];
    parsed.offers = (parsed.offers ?? []).map(hydrateOffer);
    parsed.updatedAt = parsed.updatedAt ?? seeded.updatedAt;
    return parsed;
  } catch {
    const seeded = seedStore();
    await persist(seeded);
    return seeded;
  }
}

async function persist(store: StoreShape) {
  store.updatedAt = new Date().toISOString();
  await saveStoreRaw(JSON.stringify(store, null, 2));
}

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function expireReservations(store: StoreShape) {
  const now = Date.now();
  for (const state of Object.values(store.positions)) {
    if (state.status !== "reserved") continue;
    const until = state.reservedUntil ? Date.parse(state.reservedUntil) : 0;
    if (!until || until <= now) {
      const logo = state.logo;
      Object.assign(state, emptyState(), { logo });
    }
  }
}

function token() {
  return randomBytes(24).toString("base64url");
}

export function hydratePositions(
  store: StoreShape,
  locale: Locale = "es",
  options: { includePrivate?: boolean } = {},
): LivePosition[] {
  const dict = t(locale).positions;
  return POSITION_CATALOG.slice()
    .sort((a, b) => a.id - b.id)
    .map((catalog) => {
    const state = store.positions[String(catalog.id)] ?? emptyState();
    const copy = dict[catalog.id];
    return {
      ...catalog,
      ...state,
      comprobante: options.includePrivate ? state.comprobante : "",
      name: copy.name,
      description: copy.description,
      benefits: [...copy.benefits],
      logoGuidance: copy.logoGuidance,
    };
  });
}

export async function getInventory(locale: Locale = "es"): Promise<InventoryResponse> {
  return withLock(async () => {
    const store = await readStore();
    expireReservations(store);
    await persist(store);
    const positions = hydratePositions(store, locale);
    const sold = positions.filter((p) => p.status === "sold");
    const reserved = positions.filter((p) => p.status === "reserved").length;
    const available = positions.filter((p) => p.status === "available").length;
    return {
      positions,
      committed: sold.reduce((sum, p) => sum + p.price, 0),
      available,
      reserved,
      sold: sold.length,
      total: positions.length,
      updatedAt: store.updatedAt,
      wallets: getWallets(),
    };
  });
}

export async function startCheckout(input: {
  positionId: number;
  brandName: string;
  email?: string;
}) {
  return withLock(async () => {
    const store = await readStore();
    expireReservations(store);
    const catalog = POSITION_CATALOG.find((p) => p.id === input.positionId);
    if (!catalog) throw new Error("UNKNOWN_POSITION");
    const state = store.positions[String(catalog.id)];
    if (state.status === "sold") throw new Error("SOLD");
    if (state.status === "reserved") throw new Error("RESERVED");

    const recoveryToken = issueCheckoutGrant({
      positionId: catalog.id,
      brand: input.brandName,
      email: input.email ?? "",
    });
    const checkoutToken = token();
    const reservedUntil = new Date(
      Date.now() + RESERVATION_MINUTES * 60_000,
    ).toISOString();

    store.positions[String(catalog.id)] = {
      ...state,
      status: "reserved",
      sponsor: input.brandName.trim(),
      email: input.email?.trim() ?? "",
      reservedUntil,
      recoveryToken,
      checkoutToken,
      txHash: "",
      network: "",
      comprobante: "",
    };
    await persist(store);

    return {
      positionId: catalog.id,
      price: catalog.price,
      recoveryToken,
      checkoutToken,
      reservedUntil,
      wallets: getWallets(),
    };
  });
}

export async function verifyPayment(input: {
  positionId: number;
  recoveryToken: string;
  txHash: string;
  network: PaymentNetwork;
  mode: "stub" | "indexer";
}) {
  return withLock(async () => {
    const store = await readStore();
    expireReservations(store);
    const catalog = POSITION_CATALOG.find((p) => p.id === input.positionId);
    if (!catalog) throw new Error("UNKNOWN_POSITION");
    const state = restoreReservation(store, catalog.id, input.recoveryToken);

    if (state.status === "sold") {
      return { alreadySold: true, positionId: catalog.id };
    }
    if (state.status !== "reserved") throw new Error("NOT_RESERVED");

    const reused = store.payments.some(
      (payment) => payment.txHash.toLowerCase() === input.txHash.toLowerCase(),
    );
    if (reused) throw new Error("TX_REUSED");

    const record: PaymentRecord = {
      id: token(),
      positionId: catalog.id,
      brandName: state.sponsor,
      email: state.email,
      amount: catalog.price,
      network: input.network,
      txHash: input.txHash,
      verifiedAt: new Date().toISOString(),
      mode: input.mode,
    };

    store.positions[String(catalog.id)] = {
      ...state,
      status: "sold",
      reservedUntil: "",
      checkoutToken: "",
      txHash: input.txHash,
      network: input.network,
    };
    store.payments.push(record);
    await persist(store);
    return { alreadySold: false, positionId: catalog.id, payment: record };
  });
}

export async function submitSinpe(input: {
  positionId: number;
  recoveryToken: string;
  reference?: string;
  comprobante: string;
}) {
  return withLock(async () => {
    const store = await readStore();
    expireReservations(store);
    const catalog = POSITION_CATALOG.find((p) => p.id === input.positionId);
    if (!catalog) throw new Error("UNKNOWN_POSITION");
    const state = restoreReservation(store, catalog.id, input.recoveryToken);
    if (state.status === "sold") throw new Error("SOLD");
    if (state.status !== "reserved") throw new Error("NOT_RESERVED");
    if (!input.comprobante?.trim()) throw new Error("MISSING_COMPROBANTE");
    const receipt = parseComprobanteDataUrl(input.comprobante);

    store.positions[String(catalog.id)] = {
      ...state,
      status: "reserved",
      network: "sinpe",
      txHash: input.reference?.trim() ?? "",
      comprobante: receipt.dataUrl,
      reservedUntil: new Date(
        Date.now() + SINPE_HOLD_HOURS * 60 * 60_000,
      ).toISOString(),
    };
    await persist(store);
    return {
      positionId: catalog.id,
      status: "reserved" as const,
      network: "sinpe" as const,
      reservedUntil: store.positions[String(catalog.id)].reservedUntil,
    };
  });
}

export async function publishLogo(input: {
  positionId: number;
  recoveryToken: string;
  dataUrl: string;
}) {
  return withLock(async () => {
    const store = await readStore();
    const state = store.positions[String(input.positionId)];
    if (!state || state.status !== "sold") throw new Error("NOT_SOLD");
    if (!safeEqual(state.recoveryToken, input.recoveryToken)) {
      throw new Error("BAD_TOKEN");
    }
    store.positions[String(input.positionId)] = {
      ...state,
      logo: input.dataUrl,
    };
    await persist(store);
    return { logo: input.dataUrl };
  });
}

export async function adminList() {
  return withLock(async () => {
    const store = await readStore();
    expireReservations(store);
    await persist(store);
    return {
      positions: hydratePositions(store, "es", { includePrivate: true }),
      payments: store.payments,
      offers: store.offers ?? [],
      updatedAt: store.updatedAt,
    };
  });
}

export async function adminUpdateSpot(input: {
  positionId: number;
  status?: SpotStatus;
  sponsor?: string;
  logo?: string;
  release?: boolean;
}) {
  return withLock(async () => {
    const store = await readStore();
    const catalog = POSITION_CATALOG.find((p) => p.id === input.positionId);
    if (!catalog) throw new Error("UNKNOWN_POSITION");
    const current = store.positions[String(catalog.id)];

    if (input.release) {
      store.positions[String(catalog.id)] = emptyState();
    } else {
      store.positions[String(catalog.id)] = {
        ...current,
        status: input.status ?? current.status,
        sponsor: input.sponsor ?? current.sponsor,
        logo: input.logo ?? current.logo,
        reservedUntil: input.status === "available" ? "" : current.reservedUntil,
        recoveryToken:
          input.status === "sold" && !current.recoveryToken
            ? token()
            : current.recoveryToken,
      };
    }
    await persist(store);
    return hydratePositions(store, "es").find((p) => p.id === catalog.id);
  });
}

export async function saveOffer(input: {
  brand: string;
  email: string;
  proposal: string;
  note?: string;
}): Promise<OfferRecord> {
  const brand = input.brand.trim();
  const email = input.email.trim();
  const proposal = input.proposal.trim();
  const note = input.note?.trim() ?? "";
  if (!brand || !email || !proposal) {
    throw new Error("MISSING_FIELDS");
  }
  return withLock(async () => {
    const store = await readStore();
    store.offers = store.offers ?? [];
    const record: OfferRecord = {
      id: token(),
      createdAt: new Date().toISOString(),
      brand,
      email,
      proposal,
      note,
      status: "pending",
    };
    store.offers.push(record);
    await persist(store);
    return record;
  });
}

export async function adminUpdateOffer(input: { id: string; status: OfferStatus }) {
  return withLock(async () => {
    const store = await readStore();
    const offer = store.offers.find((item) => item.id === input.id);
    if (!offer) throw new Error("UNKNOWN_OFFER");
    offer.status = input.status;
    await persist(store);
    return hydrateOffer(offer);
  });
}

function restoreReservation(
  store: StoreShape,
  positionId: number,
  recoveryToken: string,
): PositionState {
  const state = store.positions[String(positionId)];
  if (!state) throw new Error("UNKNOWN_POSITION");

  if (state.status === "sold") {
    if (safeEqual(state.recoveryToken, recoveryToken)) return state;
    throw new Error("SOLD");
  }

  if (state.status === "reserved" && safeEqual(state.recoveryToken, recoveryToken)) {
    return state;
  }

  const grant = readCheckoutGrant(recoveryToken);
  if (!grant || grant.positionId !== positionId) {
    throw new Error(state.status === "reserved" ? "RESERVED" : "BAD_TOKEN");
  }
  if (state.status === "reserved") throw new Error("RESERVED");

  store.positions[String(positionId)] = {
    ...state,
    status: "reserved",
    sponsor: grant.brand,
    email: grant.email,
    reservedUntil: new Date(grant.exp).toISOString(),
    recoveryToken,
    checkoutToken: state.checkoutToken || token(),
  };
  return store.positions[String(positionId)];
}

function safeEqual(left: string, right: string) {
  if (!left || !right) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
