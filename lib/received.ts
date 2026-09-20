import type { LivePosition, ReceivedCurrency, ReceivedMethod } from "./types";
import { USD_CRC_RATE, crcToUsd, usdToCrcExact } from "./currency";

const METHODS: ReceivedMethod[] = ["sinpe", "crypto", "in_kind"];
const CURRENCIES: ReceivedCurrency[] = ["usd", "crc"];

export function parseReceivedAmount(value: unknown) {
  const raw = typeof value === "number" ? value : Number(String(value).trim().replace(",", "."));
  if (!Number.isFinite(raw) || raw <= 0 || raw > 5_000_000) throw new Error("INVALID_AMOUNT");
  return Math.round(raw * 100) / 100;
}

export function parseReceivedMethod(value: unknown): ReceivedMethod {
  const method = String(value ?? "").trim();
  if (METHODS.includes(method as ReceivedMethod)) return method as ReceivedMethod;
  throw new Error("INVALID_METHOD");
}

export function parseReceivedCurrency(value: unknown): ReceivedCurrency {
  const currency = String(value ?? "").trim();
  if (CURRENCIES.includes(currency as ReceivedCurrency)) return currency as ReceivedCurrency;
  throw new Error("INVALID_CURRENCY");
}

export function parseReceivedInKindItems(value: unknown, method: ReceivedMethod | "") {
  const items = String(value ?? "").trim().replace(/\s+/g, " ");
  if (method !== "in_kind") return "";
  if (items.length < 2 || items.length > 200) throw new Error("INVALID_IN_KIND");
  return items;
}

export function receivedMethodLabel(method: ReceivedMethod | "") {
  if (method === "sinpe") return "SINPE";
  if (method === "crypto") return "crypto";
  if (method === "in_kind") return "en especie";
  return "";
}

export function formatReceivedMoney(amount: number, currency: ReceivedCurrency | "") {
  const formatted = amount.toLocaleString(currency === "crc" ? "es-CR" : "en-US", {
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  });
  return currency === "crc" ? `₡${formatted}` : `$${formatted}`;
}

export function guessReceivedMethod(network: string): ReceivedMethod | "" {
  if (network === "sinpe") return "sinpe";
  if (network === "evm" || network === "stellar" || network === "solana") return "crypto";
  return "";
}

export function defaultReceivedCurrency(method: ReceivedMethod | "") {
  return method === "sinpe" ? "crc" : "usd";
}

export function summarizeReceived(spots: LivePosition[]) {
  const sold = spots.filter((spot) => spot.status === "sold");
  let usd = 0;
  let crc = 0;
  let inKindUsd = 0;
  let inKindCrc = 0;
  let inKind = 0;
  for (const spot of sold) {
    if (!spot.receivedConfirmedAt || !spot.receivedAmount) continue;
    const kind = spot.receivedMethod === "in_kind";
    if (kind) inKind += 1;
    if (spot.receivedCurrency === "crc") {
      if (kind) inKindCrc += spot.receivedAmount;
      else crc += spot.receivedAmount;
    } else if (kind) {
      inKindUsd += spot.receivedAmount;
    } else {
      usd += spot.receivedAmount;
    }
  }
  return {
    usd,
    crc,
    inKind,
    inKindUsd,
    inKindCrc,
    missing: sold.filter((spot) => !spot.receivedConfirmedAt).length,
    sold: sold.length,
  };
}

export function formatReceivedBookkeeping(spots: LivePosition[]) {
  const summary = summarizeReceived(spots);
  const cashUsdTotal = Math.round((summary.usd + crcToUsd(summary.crc)) * 100) / 100;
  const cashCrcTotal = usdToCrcExact(summary.usd) + summary.crc;
  const kindUsdTotal = Math.round((summary.inKindUsd + crcToUsd(summary.inKindCrc)) * 100) / 100;
  const kindCrcTotal = usdToCrcExact(summary.inKindUsd) + summary.inKindCrc;
  const cash = `${formatReceivedMoney(cashUsdTotal, "usd")} · ${formatReceivedMoney(cashCrcTotal, "crc")}`;
  const recorded = `${formatReceivedMoney(summary.usd, "usd")} USD + ${formatReceivedMoney(summary.crc, "crc")} CRC`;
  const kindParts: string[] = [];
  if (kindUsdTotal) kindParts.push(formatReceivedMoney(kindUsdTotal, "usd"));
  if (kindCrcTotal) kindParts.push(formatReceivedMoney(kindCrcTotal, "crc"));
  const kind = summary.inKind
    ? `${summary.inKind} patrocinio${summary.inKind === 1 ? "" : "s"} · aprox. ${kindParts.join(" · ")}`
    : "";
  return {
    ...summary,
    cashUsdTotal,
    cashCrcTotal,
    kindUsdTotal,
    kindCrcTotal,
    cash,
    recorded,
    kind,
    rateNote: `tipo ₡${USD_CRC_RATE} por USD`,
    line: cash,
  };
}
