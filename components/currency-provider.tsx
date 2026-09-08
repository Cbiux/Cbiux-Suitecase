"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { formatMoney } from "@/lib/currency";
import type { Currency } from "@/lib/types";

type CurrencyContextValue = {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  format: (usd: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);
const STORAGE_KEY = "cbiux-currency";
const EVENT = "cbiux-currency";

function readCurrency(): Currency {
  if (typeof window === "undefined") return "usd";
  const query = new URLSearchParams(window.location.search).get("currency");
  if (query === "usd" || query === "crc") return query;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "usd" || stored === "crc" ? stored : "usd";
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const currency = useSyncExternalStore(subscribe, readCurrency, () => "usd" as Currency);

  const setCurrency = (next: Currency) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    const url = new URL(window.location.href);
    url.searchParams.set("currency", next);
    window.history.replaceState({}, "", url);
    window.dispatchEvent(new Event(EVENT));
  };

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      format: (usd: number) => formatMoney(usd, currency),
    }),
    [currency],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
