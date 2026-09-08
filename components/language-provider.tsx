"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dict: ReturnType<typeof t>;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const EVENT = "cbiux-locale";

function readLocale(): Locale {
  if (typeof window === "undefined") return "es";
  const query = new URLSearchParams(window.location.search).get("lang");
  if (query === "en" || query === "es") return query;
  const stored = window.localStorage.getItem("cbiux-locale");
  return stored === "en" || stored === "es" ? stored : "es";
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, readLocale, () => "es" as Locale);

  const setLocale = (next: Locale) => {
    window.localStorage.setItem("cbiux-locale", next);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState({}, "", url);
    document.documentElement.lang = next;
    window.dispatchEvent(new Event(EVENT));
  };

  const value = useMemo(
    () => ({ locale, setLocale, dict: t(locale) }),
    [locale],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
