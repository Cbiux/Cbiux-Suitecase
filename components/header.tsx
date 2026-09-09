"use client";

import { SITE } from "@/lib/config";
import { useLanguage } from "./language-provider";
import { useInventory } from "./inventory-provider";
import { ThemeToggle } from "./theme-toggle";
import { CurrencyToggle } from "./currency-toggle";
import { BrandLogo } from "./brand-logo";

export function Header() {
  const { locale, setLocale, dict } = useLanguage();
  const { openClaim, data } = useInventory();
  const firstAvailable = data?.positions.find((p) => p.status === "available");

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="shell flex h-14 items-center justify-between gap-3 md:h-16">
        <a href="#main" className="flex items-center gap-2 text-foreground">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BrandLogo className="h-5 w-5" />
          </span>
          <span className="font-mono text-[13px] font-black tracking-[0.16em] lowercase">
            {SITE.name}
          </span>
        </a>
        <nav className="hidden items-center gap-5 md:flex" aria-label="Primary">
          <a className="mono-label hover:text-foreground" href="#positions">
            {dict.nav.positions}
          </a>
          <a className="mono-label hover:text-foreground" href="#share">
            {dict.nav.share}
          </a>
          <a className="mono-label hover:text-foreground" href="#offer">
            {dict.nav.offer}
          </a>
          <a className="mono-label hover:text-foreground" href="#included">
            {dict.nav.included}
          </a>
          <a className="mono-label hover:text-foreground" href="#vlog">
            {dict.nav.vlog}
          </a>
          <a className="mono-label hover:text-foreground" href="#how">
            {dict.nav.how}
          </a>
          <a className="mono-label hover:text-foreground" href="#trip">
            {dict.nav.trip}
          </a>
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle toDark={dict.theme.toDark} toLight={dict.theme.toLight} />
          <CurrencyToggle />
          <div className="flex overflow-hidden rounded-full border border-border bg-card">
            {(["es", "en"] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLocale(code)}
                className={`min-h-11 px-2.5 font-mono text-[10px] font-semibold tracking-[0.12em] ${
                  locale === code ? "bg-foreground text-background" : "text-muted-foreground"
                }`}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="hidden min-h-9 items-center rounded-full bg-foreground px-4 font-mono text-[10px] font-semibold tracking-[0.1em] text-background sm:inline-flex"
            onClick={() => openClaim(firstAvailable?.id ?? 1)}
          >
            {dict.nav.claim}
          </button>
        </div>
      </div>
    </header>
  );
}
