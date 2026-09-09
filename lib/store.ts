import { randomBytes, timingSafeEqual } from "crypto";
import { POSITION_CATALOG } from "./positions";
import { t } from "./i18n";
import { getWallets, SINPE_HOLD_HOURS } from "./config";
import { parseComprobanteDataUrl } from "./comprobante";
import { parseArtworkDataUrl } from "./artwork";
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
  phone: "",
  logo: "",
  reservedAt: "",
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
    phone: offer.phone ?? "",
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
  let changed = false;
  for (const state of Object.values(store.positions)) {
    if (state.status !== "reserved") continue;
    // Solo hay reserva real cuando ya mandaron comprobante. El resto se libera.
    if (state.comprobante) continue;
    Object.assign(state, emptyState());
    changed = true;
  }
  return changed;
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
      phone: options.includePrivate ? state.phone : "",
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
    if (expireReservations(store)) await persist(store);
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
  phone?: string;
  logo?: string;
}) {
  return withLock(async () => {
    const store = await readStore();
    if (expireReservations(store)) await persist(store);
    const catalog = POSITION_CATALOG.find((p) => p.id === input.positionId);
    if (!catalog) throw new Error("UNKNOWN_POSITION");
    const state = store.positions[String(catalog.id)];
    if (state.status === "sold") throw new Error("SOLD");
    if (state.status === "reserved") throw new Error("RESERVED");

    const logo = input.logo ? parseArtworkDataUrl(input.logo) : "";
    if (!logo) throw new Error("MISSING_ARTWORK");
    const recoveryToken = issueCheckoutGrant({
      positionId: catalog.id,
      brand: input.brandName,
      email: input.email ?? "",
      phone: input.phone ?? "",
      hours: SINPE_HOLD_HOURS,
    });
    const reservedUntil = new Date(
      Date.now() + SINPE_HOLD_HOURS * 60 * 60_000,
    ).toISOString();

    return {
      positionId: catalog.id,
      price: catalog.price,
      recoveryToken,
      checkoutToken: token(),
      reservedUntil,
      wallets: getWallets(),
      logo,
    };
  });
}

export async function verifyPayment(input: {
  positionId: number;
  recoveryToken: string;
  txHash: string;
  network: PaymentNetwork;
  mode: "stub" | "indexer";
  logo?: string;
  comprobante?: string;
}) {
  return withLock(async () => {
    const store = await readStore();
    expireReservations(store);
    const catalog = POSITION_CATALOG.find((p) => p.id === input.positionId);
    if (!catalog) throw new Error("UNKNOWN_POSITION");
    const state = restoreReservation(store, catalog.id, input.recoveryToken, {
      logo: input.logo,
      allowCreate: true,
    });

    if (state.status === "sold") {
      return { alreadySold: true, positionId: catalog.id };
    }
    if (state.status !== "reserved") throw new Error("NOT_RESERVED");
    // USDC verificado = pago completo; el spot pasa a vendido, no a reserva suelta.

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

    const receipt = input.comprobante?.trim()
      ? parseComprobanteDataUrl(input.comprobante).dataUrl
      : state.comprobante;

    store.positions[String(catalog.id)] = {
      ...state,
      status: "sold",
      logo: input.logo ? parseArtworkDataUrl(input.logo) : state.logo,
      reservedUntil: "",
      checkoutToken: "",
      txHash: input.txHash,
      network: input.network,
      comprobante: receipt,
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
  logo?: string;
  network?: PaymentNetwork;
}) {
  return withLock(async () => {
    const store = await readStore();
    expireReservations(store);
    const catalog = POSITION_CATALOG.find((p) => p.id === input.positionId);
    if (!catalog) throw new Error("UNKNOWN_POSITION");
    if (!input.comprobante?.trim()) throw new Error("MISSING_COMPROBANTE");
    const state = restoreReservation(store, catalog.id, input.recoveryToken, {
      logo: input.logo,
      allowCreate: true,
    });
    if (state.status === "sold") throw new Error("SOLD");
    if (state.status !== "reserved") throw new Error("NOT_RESERVED");
    const receipt = parseComprobanteDataUrl(input.comprobante);
    const logo = input.logo ? parseArtworkDataUrl(input.logo) : state.logo;
    if (!logo) throw new Error("MISSING_ARTWORK");
    const network: PaymentNetwork =
      input.network === "evm" || input.network === "stellar" || input.network === "solana"
        ? input.network
        : "sinpe";

    store.positions[String(catalog.id)] = {
      ...state,
      status: "reserved",
      logo,
      network,
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
      network,
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
    expireReservations(store);
    const state = restoreReservation(store, input.positionId, input.recoveryToken);
    if (state.status !== "sold" && state.status !== "reserved") {
      throw new Error("NOT_RESERVED");
    }
    const logo = parseArtworkDataUrl(input.dataUrl);
    store.positions[String(input.positionId)] = {
      ...state,
      logo,
    };
    await persist(store);
    return { logo };
  });
}

export async function adminList() {
  return withLock(async () => {
    const store = await readStore();
    if (expireReservations(store)) await persist(store);
    return {
      positions: hydratePositions(store, "es", { includePrivate: true }),
      payments: store.payments,
      offers: store.offers ?? [],
      updatedAt: store.updatedAt,
    };
  });
}

function nextAdminLogo(input: string | undefined, current: string) {
  if (input === undefined) return current;
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return parseArtworkDataUrl(trimmed);
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
    const current = store.positions[String(catalog.id)] ?? emptyState();

    if (input.release) {
      store.positions[String(catalog.id)] = emptyState();
    } else {
      const nextStatus = input.status ?? current.status;
      if (nextStatus === "sold" && current.status !== "sold") {
        store.payments.push({
          id: token(),
          positionId: catalog.id,
          brandName: (input.sponsor ?? current.sponsor) || "admin",
          email: current.email,
          amount: catalog.price,
          network: current.network || "sinpe",
          txHash: current.txHash || "admin-accept",
          verifiedAt: new Date().toISOString(),
          mode: "manual",
        });
      }
      store.positions[String(catalog.id)] = {
        ...current,
        status: nextStatus,
        sponsor: input.sponsor ?? current.sponsor,
        logo: nextAdminLogo(input.logo, current.logo),
        reservedAt: nextStatus === "available" ? "" : current.reservedAt || new Date().toISOString(),
        reservedUntil: nextStatus === "available" || nextStatus === "sold" ? "" : current.reservedUntil,
        recoveryToken:
          nextStatus === "sold" && !current.recoveryToken
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
  phone: string;
  proposal: string;
  note?: string;
}): Promise<OfferRecord> {
  const brand = input.brand.trim();
  const email = input.email.trim();
  const phone = input.phone.trim();
  const proposal = input.proposal.trim();
  const note = input.note?.trim() ?? "";
  if (!brand || !email || !phone || !proposal) {
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
      phone,
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
  extras: { logo?: string; allowCreate?: boolean } = {},
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
  if (!extras.allowCreate) throw new Error("NOT_RESERVED");

  const logo = extras.logo ? parseArtworkDataUrl(extras.logo) : state.logo;
  store.positions[String(positionId)] = {
    ...state,
    status: "reserved",
    sponsor: grant.brand,
    email: grant.email,
    phone: grant.phone ?? state.phone,
    logo,
    reservedAt: state.reservedAt || new Date().toISOString(),
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
