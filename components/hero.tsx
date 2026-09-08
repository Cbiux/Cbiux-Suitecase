"use client";

import { TRIP } from "@/lib/positions";
import { useLanguage } from "./language-provider";
import { useInventory } from "./inventory-provider";

export function Hero() {
  const { dict } = useLanguage();
  const { data, setSelectedId } = useInventory();
  const first = data?.positions.find((p) => p.status === "available");
  const chips = [
    { label: dict.hero.spots, value: String(TRIP.spotCount) },
    { label: dict.hero.from, value: "$45" },
    { label: "CABIN", value: "55×40×20" },
    { label: dict.hero.available, value: String(data?.available ?? TRIP.spotCount) },
  ];

  return (
    <section className="shell pb-8 pt-8 text-left md:pb-12 md:pt-14 md:text-center">
      <p className="mono-label text-primary">{dict.hero.kicker}</p>
      <h1 className="mt-3 max-w-[14ch] text-[clamp(40px,11vw,76px)] font-semibold leading-[0.92] tracking-[-0.055em] text-foreground md:mx-auto md:max-w-[16ch]">
        {dict.hero.titleA} {dict.hero.titleB}{" "}
        <span className="text-primary">{dict.hero.titleAccent}</span>
      </h1>
      <p className="mt-4 max-w-[36ch] text-[16px] leading-relaxed text-muted-foreground md:mx-auto md:max-w-[640px] md:text-[18px]">
        {dict.hero.subtitle}
      </p>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:justify-center md:overflow-visible">
        {chips.map((chip) => (
          <div
            key={chip.label}
            className="shrink-0 rounded-full border border-border bg-card px-3 py-2"
          >
            <p className="font-mono text-[9px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              {chip.label}
            </p>
            <p className="font-medium tracking-tight">{chip.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row md:justify-center">
        <button
          type="button"
          onClick={() => setSelectedId(first?.id ?? 1)}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-foreground px-6 font-mono text-[11px] font-semibold tracking-[0.1em] text-background"
        >
          {dict.hero.cta}
        </button>
        <a
          href="#positions"
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-card px-6 font-mono text-[11px] font-semibold tracking-[0.1em]"
        >
          {dict.nav.positions}
        </a>
      </div>
    </section>
  );
}
