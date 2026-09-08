"use client";

import { useLanguage } from "./language-provider";
import { useInventory } from "./inventory-provider";
import { SuitcasePhotoStage } from "./suitcase-photo-stage";
import { padSpot, TRIP } from "@/lib/positions";
import { useCurrency } from "./currency-provider";
import { AnimatedLetters } from "./animated-letters";
import { spotOwnerLabel } from "@/lib/spot-copy";

export function PositionsBoard() {
  const { dict, locale } = useLanguage();
  const { format } = useCurrency();
  const { data, loading, setSelectedId } = useInventory();
  const available = data?.available ?? 0;
  const soldOut = Boolean(data && available === 0);

  return (
    <section id="positions" className="pb-28 pt-2 md:pb-24">
      <div className="shell">
        <div className="mb-6">
          <p className="anim-fade-up mono-label text-primary">{dict.dims.badge}</p>
          <div className="mt-2 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <h2 className="text-[clamp(32px,8vw,56px)] font-semibold tracking-[-0.05em]">
              <AnimatedLetters text={dict.pick.title} />
            </h2>
            <div className="md:text-right">
              <div className="flex items-center gap-2 md:justify-end">
                <i className={`h-1.5 w-1.5 rounded-full ${soldOut ? "bg-destructive" : "bg-[#147a4b]"}`} />
                <span className="text-sm font-medium">
                  {loading
                    ? dict.pick.checking
                    : soldOut
                      ? dict.pick.soldOut
                      : `${available} ${dict.pick.spotsAvailable}`}
                </span>
              </div>
              <small className="mono-label mt-1 block">{dict.pick.live}</small>
            </div>
          </div>
        </div>

        <SuitcasePhotoStage />

        <div className="mt-8 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat
            label={dict.sheet.starting}
            value={`${locale === "es" ? "desde" : "from"} ${format(TRIP.startPrice)}`}
          />
          <Stat label={dict.sheet.salesClose} value={dict.sheet.salesCloseValue} />
          <Stat label={dict.sheet.artwork} value={dict.sheet.artworkValue} />
          <Stat label={dict.sheet.tripDates} value={dict.sheet.tripValue} />
        </div>

        <div className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {data?.positions.map((spot) => (
            <button
              key={spot.id}
              type="button"
              onClick={() => setSelectedId(spot.id)}
              className={`spot-grid-btn min-h-16 rounded-2xl border px-3 py-3 text-left ${
                spot.status === "sold"
                  ? "border-[#147a4b] bg-[#b6efcf] dark:border-[#3dd68c] dark:bg-[#143024]"
                  : spot.status === "reserved"
                    ? "border-[#e6b800] bg-[#ffd54a] dark:border-[#ffd54a] dark:bg-[#4a3a10]"
                    : "border-border bg-card"
              }`}
            >
              <span className="font-mono text-[11px] font-semibold">{padSpot(spot.id)}</span>
              <strong className="mt-1 block text-lg tracking-tight">{format(spot.price)}</strong>
              <span className="mono-label mt-1 block normal-case tracking-[0.08em]">
                {spot.status === "sold" || spot.status === "reserved"
                  ? spotOwnerLabel(spot, dict)
                  : dict.pick.claim}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <span className="mono-label">{label}</span>
      <strong className="mt-1 block text-sm font-medium">{value}</strong>
    </div>
  );
}
