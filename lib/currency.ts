import type { Currency } from "./types";

/** Display rate for CRC. Catalog prices stay in USD. */
export const USD_CRC_RATE = 453;

export function usdToCrc(usd: number) {
  return Math.round(usd * USD_CRC_RATE);
}

export function formatMoney(usd: number, currency: Currency) {
  if (currency === "usd") return `$${usd}`;
  return `₡${usdToCrc(usd).toLocaleString("es-CR")}`;
}
