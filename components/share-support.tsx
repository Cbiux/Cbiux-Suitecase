"use client";

import { padSpot } from "@/lib/positions";
import { thanksBrand } from "@/lib/poster-kit";
import { AnimatedLetters } from "./animated-letters";
import { useInventory } from "./inventory-provider";
import { useLanguage } from "./language-provider";
import { PosterCard } from "./poster-card";

export function ShareSupport() {
  const { dict, locale } = useLanguage();
  const { data } = useInventory();
  const spots = data?.positions.filter((spot) => Boolean(spot.logo)) ?? [];
  if (spots.length === 0) return null;

  const labels = {
    downloadLabel: dict.share.download,
    copyingLabel: dict.share.copying,
    copyLabel: dict.share.copy,
    copiedLabel: dict.share.copied,
    errorLabel: dict.share.error,
    previewLabel: dict.share.preview,
  };

  return (
    <section id="share" className="shell pb-16 pt-4 md:pb-24">
      <p className="mono-label text-primary">{dict.share.kicker}</p>
      <h2 className="mt-3 text-[clamp(32px,8vw,56px)] font-semibold tracking-[-0.05em]">
        <AnimatedLetters text={dict.share.title} />
      </h2>
      <p className="mt-4 max-w-[62ch] text-muted-foreground">{dict.share.intro}</p>
      <div className="mt-10 space-y-8">
        {spots.map((spot) => {
          const brand = thanksBrand(spot.sponsor, spot.name);
          const name = spot.sponsor || spot.name;
          return (
            <article key={`share-${spot.id}`} className="rounded-3xl border border-border bg-card p-5 md:p-6">
              <p className="mono-label text-primary">posición {padSpot(spot.id)}</p>
              <p className="mt-1 truncate text-2xl font-medium tracking-tight">{brand}</p>
              <div className="mt-5 grid gap-6 md:grid-cols-2">
                <PosterCard
                  kind="thanks"
                  brand={brand}
                  name={name}
                  positionId={spot.id}
                  logoSrc={spot.logo}
                  locale={locale}
                  label={dict.share.thanks}
                  {...labels}
                />
                <PosterCard
                  kind="spot"
                  brand={brand}
                  name={name}
                  positionId={spot.id}
                  logoSrc={spot.logo}
                  locale={locale}
                  label={dict.share.spot}
                  {...labels}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
