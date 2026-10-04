import type { OfferRecord, PaymentRecord, PositionState, StoreShape } from "./types";

export function inventoryLooksEmpty(raw: string) {
  try {
    const parsed = JSON.parse(raw) as StoreShape;
    const payments = parsed.payments?.length ?? 0;
    const offers = parsed.offers?.length ?? 0;
    if (payments > 0 || offers > 0) return false;
    const positions = Object.values(parsed.positions ?? {});
    if (positions.length === 0) return true;
    return positions.every((state) => positionIsBlank(state));
  } catch {
    return false;
  }
}

function positionIsBlank(state: PositionState | undefined) {
  if (!state) return true;
  const status = state.status || "available";
  return (
    status === "available" &&
    !String(state.sponsor || "").trim() &&
    !String(state.logo || "").trim() &&
    !String(state.email || "").trim() &&
    !String(state.phone || "").trim() &&
    !String(state.comprobante || "").trim()
  );
}

function positionIsRich(state: PositionState | undefined) {
  return !positionIsBlank(state);
}

function unionById<T extends { id: string }>(primary: T[] = [], secondary: T[] = []) {
  const map = new Map<string, T>();
  for (const item of secondary) {
    if (item?.id) map.set(item.id, item);
  }
  for (const item of primary) {
    if (item?.id) map.set(item.id, item);
  }
  return [...map.values()];
}

/**
 * Keeps sponsor logos that `incomingRaw` dropped, unless that position was
 * cleared on purpose. A stale empty seed plus one new logo must not erase
 * the previous save.
 */
export function preserveDroppedLogos(
  incomingRaw: string,
  existingRaw: string,
  allowClearPositionIds: number[] = [],
) {
  let incoming: StoreShape;
  let existing: StoreShape;
  try {
    incoming = JSON.parse(incomingRaw) as StoreShape;
    existing = JSON.parse(existingRaw) as StoreShape;
  } catch {
    return incomingRaw;
  }
  const allow = new Set(allowClearPositionIds.map((id) => String(id)));
  const positions: StoreShape["positions"] = { ...(incoming.positions ?? {}) };
  for (const [id, prev] of Object.entries(existing.positions ?? {})) {
    if (!positionIsRich(prev) || allow.has(id)) continue;
    if (positionIsRich(positions[id])) continue;
    positions[id] = prev;
  }
  const payments = unionById<PaymentRecord>(incoming.payments ?? [], existing.payments ?? []);
  const offers = unionById<OfferRecord>(incoming.offers ?? [], existing.offers ?? []);
  const merged: StoreShape = {
    ...incoming,
    positions,
    payments,
    offers,
    siteContent: incoming.siteContent ?? existing.siteContent,
    updatedAt: incoming.updatedAt || existing.updatedAt,
  };
  return JSON.stringify(merged, null, 2);
}
