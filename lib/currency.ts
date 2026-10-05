import type { Currency, Locale } from "./types";

/** Default display rate for CRC. Catalog prices stay in USD. */
export const USD_CRC_RATE = 453;
export const CRC_ROUND = 500;
export const USD_CRC_RATE_MIN = 100;
export const USD_CRC_RATE_MAX = 2000;

export function parseUsdCrcRate(raw: unknown, fallback = USD_CRC_RATE) {
  const value =
    typeof raw === "number" ? raw : Number(String(raw ?? "").trim().replace(",", "."));
  if (!Number.isFinite(value)) return fallback;
  return Math.min(USD_CRC_RATE_MAX, Math.max(USD_CRC_RATE_MIN, Math.round(value * 100) / 100));
}

export function usdToCrc(usd: number, rate = USD_CRC_RATE) {
  const raw = usd * rate;
  return Math.round(raw / CRC_ROUND) * CRC_ROUND;
}

export function usdToCrcExact(usd: number, rate = USD_CRC_RATE) {
  return Math.round(usd * rate);
}

export function crcToUsd(crc: number, rate = USD_CRC_RATE) {
  return Math.round((crc / rate) * 100) / 100;
}

export function formatMoney(usd: number, currency: Currency, rate = USD_CRC_RATE) {
  if (currency === "usd") return `$${usd}`;
  const crc = String(usdToCrc(usd, rate));
  const grouped = crc.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `₡${grouped}`;
}

export function currencyRateNote(rate: number, locale: Locale) {
  const shown = Number.isInteger(rate) ? String(rate) : String(rate);
  return locale === "en"
    ? `Reference ₡${shown} per USD, rounded to ₡500. SINPE in colones; USDC in dollars.`
    : `Referencia ₡${shown} por USD, redondeado a ₡500. SINPE en colones; USDC en dólares.`;
}
