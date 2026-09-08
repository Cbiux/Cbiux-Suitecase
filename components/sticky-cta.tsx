"use client";

import { useLanguage } from "./language-provider";
import { useInventory } from "./inventory-provider";
import { useCurrency } from "./currency-provider";
import { TRIP } from "@/lib/positions";

export function StickyCta() {
  const { dict } = useLanguage();
  const { format } = useCurrency();
  const { data, openClaim, claimOpen } = useInventory();
  const first = data?.positions.find((p) => p.status === "available");
  const available = data?.available ?? 0;

  if (claimOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="mono-label">
            {available} {dict.pick.spotsAvailable}
          </p>
          <p className="truncate text-sm font-medium">
            {dict.hero.signal} · {format(TRIP.startPrice)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openClaim(first?.id ?? 1)}
          className="inline-flex min-h-12 shrink-0 items-center rounded-full bg-foreground px-5 font-mono text-[11px] font-semibold tracking-[0.1em] text-background"
        >
          {dict.hero.cta}
        </button>
      </div>
    </div>
  );
}
