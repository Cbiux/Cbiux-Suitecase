"use client";

import { TRIP } from "@/lib/positions";
import { useLanguage } from "./language-provider";
import { useInventory } from "./inventory-provider";
import { useCurrency } from "./currency-provider";
import { HeroSuitcasePreview } from "./suitcase-photo-stage";
import { AnimatedLetters } from "./animated-letters";

export function Hero() {
  const { dict } = useLanguage();
  const { format } = useCurrency();
  const { data, openClaim } = useInventory();
  const first = data?.positions.find((p) => p.status === "available");
  const available = data?.available ?? TRIP.spotCount;
  const stats = [
    { label: dict.hero.spots, value: String(TRIP.spotCount) },
    { label: dict.hero.from, value: format(TRIP.startPrice) },
    { label: dict.hero.content, value: dict.hero.contentValue },
  ];

  return (
    <section className="hero-blueprint">
      <div className="shell grid items-center gap-10 pb-10 pt-8 md:grid-cols-2 lg:gap-12 lg:pb-16 lg:pt-12">
        <div className="text-left">
          <p className="anim-fade-up mono-label text-primary">{dict.hero.kicker}</p>
          <h1 className="headline mt-4 max-w-[16ch] text-[clamp(40px,9vw,72px)] font-semibold leading-[0.92] tracking-[-0.055em]">
            <AnimatedLetters
              parts={[
                { text: dict.hero.titleA },
                { text: dict.hero.titleB },
                { text: dict.hero.titleAccent, accent: true },
              ]}
            />
          </h1>
          <p
            className="anim-fade-up mt-5 max-w-[42ch] text-[16px] leading-relaxed text-muted-foreground md:text-[18px]"
            style={{ animationDelay: "220ms" }}
          >
            {dict.hero.subtitle}
          </p>
          <div className="mt-7 flex gap-8">
            {stats.map((stat, index) => (
              <div key={stat.label}>
                <p
                  className="anim-fade-up text-[clamp(28px,5vw,40px)] font-semibold tracking-[-0.04em] text-foreground"
                  style={{ animationDelay: `${260 + index * 80}ms` }}
                >
                  {stat.value}
                </p>
                <p className="mono-label mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => openClaim(first?.id ?? 1)}
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
          <p className="anim-fade-up mt-5 font-mono text-[10px] font-semibold tracking-[0.14em] text-muted-foreground">
            {dict.hero.usdc}
          </p>
          <p className="mt-6 font-mono text-[11px] font-semibold tracking-[0.08em] text-primary">
            {dict.hero.url}
          </p>
        </div>

        <div className="relative">
          <div className="mb-3 flex items-center justify-end gap-2">
            <i className="h-2 w-2 rounded-full bg-[#147a4b]" />
            <span className="font-mono text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {available} {dict.hero.available}
            </span>
          </div>
          <HeroSuitcasePreview />
          <p className="mt-3 text-right font-mono text-[10px] font-semibold tracking-[0.14em] text-muted-foreground">
            {dict.hero.dates}
          </p>
        </div>
      </div>
    </section>
  );
}
