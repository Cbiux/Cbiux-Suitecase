"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { padStop, PLACE_IDS, PLACES, ROUTE_VISITS, type PlaceId } from "@/lib/trip-route";
import { useLanguage } from "./language-provider";
import { AnimatedLetters } from "./animated-letters";

const TripGlobe = dynamic(() => import("./trip-globe"), {
  ssr: false,
  loading: () => <GlobeSkeleton />,
});

function reduceMotionSubscribe(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

export function RouteMap() {
  const { dict } = useLanguage();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const reduceMotion = useSyncExternalStore(
    reduceMotionSubscribe,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  const stops = dict.route.stops as ReadonlyArray<{
    city: string;
    region: string;
    note: string;
  }>;

  const labels = useMemo(
    () =>
      PLACE_IDS.map((id) => {
        const visit = dict.route.stops[ROUTE_VISITS.indexOf(id)];
        return { id, ...PLACES[id], text: visit?.city ?? id };
      }),
    [dict.route.stops],
  );

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => ((current ?? 0) + 1) % ROUTE_VISITS.length);
    }, reduceMotion ? 1600 : 2200);
    return () => window.clearInterval(timer);
  }, [playing, reduceMotion]);

  function selectVisit(index: number) {
    setPlaying(false);
    setActiveIndex((current) => (current === index ? null : index));
  }

  function selectPlace(id: PlaceId) {
    setPlaying(false);
    setActiveIndex(ROUTE_VISITS.indexOf(id));
  }

  function togglePlay() {
    if (playing) {
      setPlaying(false);
      return;
    }
    setActiveIndex((current) => current ?? 0);
    setPlaying(true);
  }

  return (
    <div>
      <p className="mono-label text-primary">{dict.route.kicker}</p>
      <h2 className="mt-3 max-w-[16ch] text-[clamp(32px,8vw,56px)] font-semibold tracking-[-0.05em]">
        <AnimatedLetters text={dict.route.title} />
      </h2>
      <p className="mt-4 max-w-[640px] text-muted-foreground">{dict.route.body}</p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.18fr)] lg:gap-8">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="inline-flex min-h-10 items-center rounded-full bg-foreground px-4 font-mono text-[10px] font-semibold tracking-[0.12em] text-background"
            >
              {playing ? dict.route.pause : dict.route.play}
            </button>
            <p className="font-mono text-[10px] font-semibold tracking-[0.12em] text-muted-foreground">
              {dict.route.hint}
            </p>
          </div>
          <ol className="grid gap-2 sm:grid-cols-2">
            {stops.map((stop, index) => {
              const active = activeIndex === index;
              return (
                <li key={`${stop.city}-${index}`}>
                  <button
                    type="button"
                    onClick={() => selectVisit(index)}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-[border-color,background-color,color] ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <span
                      className={`font-mono text-[10px] font-semibold tracking-[0.12em] ${
                        active ? "text-primary-foreground" : "text-primary"
                      }`}
                    >
                      {padStop(index)}
                    </span>
                    <span className="min-w-0">
                      <strong className="block text-sm font-medium tracking-tight">{stop.city}</strong>
                      <span
                        className={`block text-[11px] ${
                          active ? "text-primary-foreground/80" : "text-muted-foreground"
                        }`}
                      >
                        {stop.note || stop.region}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="route-globe-stage overflow-hidden rounded-[28px] border border-border shadow-[0_22px_50px_rgba(11,27,74,0.22)]">
          <div className="aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5] xl:aspect-[5/4]">
            <TripGlobe
              labels={labels}
              activeIndex={activeIndex}
              reduceMotion={reduceMotion}
              zoomInLabel={dict.route.zoomIn}
              zoomOutLabel={dict.route.zoomOut}
              onSelectPlace={selectPlace}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function GlobeSkeleton() {
  return (
    <div className="flex h-full min-h-[360px] items-center justify-center">
      <div className="h-[58%] w-[58%] rounded-full bg-[radial-gradient(circle_at_30%_30%,#2c3fd1_0%,#0b1b4a_58%,#070b18_100%)] opacity-80" />
    </div>
  );
}
