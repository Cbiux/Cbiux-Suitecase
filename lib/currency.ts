import type { Currency } from "./types";

/** Display rate for CRC. Catalog prices stay in USD. */
export const USD_CRC_RATE = 453;
export const CRC_ROUND = 500;

export function usdToCrc(usd: number) {
  const raw = usd * USD_CRC_RATE;
  return Math.round(raw / CRC_ROUND) * CRC_ROUND;
}

export function formatMoney(usd: number, currency: Currency) {
  if (currency === "usd") return `$${usd}`;
  const crc = String(usdToCrc(usd));
  const grouped = crc.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `₡${grouped}`;
}
