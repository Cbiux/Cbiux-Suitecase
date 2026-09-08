"use client";

import { useEffect, useRef } from "react";
import { FACE_ORDER, padSpot } from "@/lib/positions";
import type { Face, LivePosition } from "@/lib/types";
import { useInventory } from "./inventory-provider";
import { useLanguage } from "./language-provider";
import { useCurrency } from "./currency-provider";

const PHOTOS: Record<
  Face,
  { src: string; mirror: boolean; alt: string; aspect: string }
> = {
  front: {
    src: "/suitcase-front.png",
    mirror: false,
    alt: "Maleta de cabina, frente",
    aspect: "1168 / 1346",
  },
  back: {
    src: "/suitcase-front.png",
    mirror: true,
    alt: "Maleta de cabina, atrás",
    aspect: "1168 / 1346",
  },
  right: {
    src: "/suitcase-side.png",
    mirror: false,
    alt: "Maleta de cabina, lado",
    aspect: "3 / 4",
  },
  left: {
    src: "/suitcase-side.png",
    mirror: true,
    alt: "Maleta de cabina, lado contrario",
    aspect: "3 / 4",
  },
};

const APPROACH_MS = 720;
const CLAIM_AT = 0.68;

export function SuitcasePhotoStage() {
  const { dict } = useLanguage();
  const {
    activeFace,
    setActiveFace,
    selectedId,
    setSelectedId,
    approachPhase,
    completeApproach,
    completeReturn,
  } = useInventory();

  const lastPhase = useRef(approachPhase);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    if (lastPhase.current === approachPhase) return;
    lastPhase.current = approachPhase;
    if (approachPhase === "approaching") {
      const openAt = window.setTimeout(completeApproach, APPROACH_MS * CLAIM_AT);
      return () => window.clearTimeout(openAt);
    }
    if (approachPhase === "returning") {
      const done = window.setTimeout(completeReturn, APPROACH_MS);
      return () => window.clearTimeout(done);
    }
  }, [approachPhase, completeApproach, completeReturn]);

  function swipe(dx: number) {
    if (Math.abs(dx) < 48) return;
    const index = FACE_ORDER.indexOf(activeFace);
    const next = dx < 0 ? Math.min(index + 1, FACE_ORDER.length - 1) : Math.max(index - 1, 0);
    setActiveFace(FACE_ORDER[next]);
  }

  return (
    <div id="suitcase-orbit" className="relative">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <p key={approachPhase} className="anim-fade-up mono-label">
          {approachPhase === "approaching" ? dict.orbit.approaching : dict.orbit.hint}
        </p>
        {selectedId != null ? (
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="font-mono text-[10px] font-semibold tracking-[0.12em] text-primary"
          >
            {dict.orbit.back}
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-4 overflow-hidden rounded-full border border-border bg-card p-1">
        {FACE_ORDER.map((face) => (
          <button
            key={face}
            type="button"
            onClick={() => setActiveFace(face)}
            className={`min-h-11 rounded-full px-1 font-mono text-[9px] font-semibold tracking-[0.08em] transition-all duration-200 sm:text-[10px] sm:tracking-[0.1em] ${
              activeFace === face && selectedId == null
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {dict.faces[face]}
          </button>
        ))}
      </div>

      <div
        className="mt-4 lg:hidden"
        onTouchStart={(event) => {
          touchX.current = event.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (touchX.current == null) return;
          swipe((event.changedTouches[0]?.clientX ?? 0) - touchX.current);
          touchX.current = null;
        }}
      >
        <SuitcaseView key={activeFace} face={activeFace} focus />
      </div>

      <div className="mt-4 hidden gap-4 lg:grid lg:grid-cols-2 xl:grid-cols-4">
        {FACE_ORDER.map((face) => (
          <SuitcaseView key={face} face={face} focus={activeFace === face} />
        ))}
      </div>
    </div>
  );
}

export function HeroSuitcasePreview() {
  return <SuitcaseView face="front" focus compact />;
}

function SuitcaseView({
  face,
  focus,
  compact = false,
}: {
  face: Face;
  focus: boolean;
  compact?: boolean;
}) {
  const { dict } = useLanguage();
  const { data, selected, selectedId, setSelectedId, setActiveFace, approachPhase } = useInventory();
  const spots = data?.positions.filter((spot) => spot.face === face) ?? [];
  const photo = PHOTOS[face];
  const zooming =
    !compact &&
    focus &&
    selected?.face === face &&
    (approachPhase === "approaching" || approachPhase === "focused");
  const rawCx = selected && selected.face === face ? selected.x + selected.width / 2 : 50;
  const cx = selected && selected.face === face && photo.mirror ? 100 - rawCx : rawCx;
  const cy = selected && selected.face === face ? selected.y + selected.height / 2 : 50;
  const side = face === "left" || face === "right";

  return (
    <figure>
      <div className={`relative mx-auto w-full ${compact ? "hero-suitcase-stage max-w-[560px] rounded-[28px] bg-white p-3 shadow-[0_18px_40px_rgba(11,27,74,0.12)] dark:bg-[#f4f3ef]" : "max-w-[520px] pb-8 pr-7 lg:max-w-none"}`}>
        <div
          className={`overflow-visible ${
            compact
              ? "bg-transparent"
              : `rounded-2xl border bg-muted/50 dark:bg-muted ${
                  focus ? "border-primary/40 ring-2 ring-primary/15" : "border-border"
                }`
          }`}
          onClick={() => setActiveFace(face)}
        >
          <div className="relative aspect-[3/4]">
            <div
              className="absolute inset-0 origin-center will-change-transform"
              style={{
                transform: zooming
                  ? `scale(2.08) translate(${(50 - cx) * 0.5}%, ${(50 - cy) * 0.5}%)`
                  : "scale(1) translate(0, 0)",
                transition: "transform 720ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ width: "100%", aspectRatio: photo.aspect, maxHeight: "100%" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.src}
                  alt={photo.alt}
                  width={side ? 768 : 1168}
                  height={side ? 1024 : 1346}
                  className="pointer-events-none absolute inset-0 h-full w-full object-contain drop-shadow-[0_18px_30px_rgba(17,17,17,0.18)] dark:drop-shadow-[0_16px_28px_rgba(0,0,0,0.45)]"
                  style={{ transform: photo.mirror ? "scaleX(-1)" : undefined }}
                />
                {spots.map((spot, index) => (
                  <SpotOverlay
                    key={spot.id}
                    spot={spot}
                    mirror={photo.mirror}
                    active={selectedId === spot.id}
                    revealIndex={compact ? index : undefined}
                    onSelect={() => {
                      setActiveFace(face);
                      setSelectedId(spot.id);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        {compact ? null : (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between pr-7 font-mono text-[9px] font-semibold tracking-[0.12em] text-muted-foreground">
              <span className="h-2.5 w-px bg-border" />
              <span className="bg-background px-1.5">{side ? dict.dims.depth : dict.dims.width}</span>
              <span className="h-2.5 w-px bg-border" />
              <span className="absolute inset-x-7 top-1/2 h-px bg-border" />
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex flex-col items-center justify-between pb-8 font-mono text-[9px] font-semibold tracking-[0.12em] text-muted-foreground">
              <span className="h-px w-2.5 bg-border" />
              <span className="bg-background px-0.5 [writing-mode:vertical-rl] rotate-180">
                {dict.dims.height}
              </span>
              <span className="h-px w-2.5 bg-border" />
              <span className="absolute inset-y-8 left-1/2 w-px bg-border" />
            </div>
          </>
        )}
      </div>
      {compact ? null : (
        <figcaption className="mt-1 text-center font-mono text-[10px] font-semibold tracking-[0.16em] text-muted-foreground">
          {dict.faces[face]}
        </figcaption>
      )}
    </figure>
  );
}

function SpotOverlay({
  spot,
  mirror,
  active,
  revealIndex,
  onSelect,
}: {
  spot: LivePosition;
  mirror: boolean;
  active: boolean;
  revealIndex?: number;
  onSelect: () => void;
}) {
  const { format, currency } = useCurrency();
  const sold = spot.status === "sold";
  const held = spot.status === "reserved";
  const side = spot.face === "left" || spot.face === "right";
  const banner = spot.width >= 40;
  const left = mirror ? 100 - spot.x - spot.width : spot.x;
  const price = sold ? "SOLD" : held ? "HELD" : format(spot.price);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      aria-label={`Position ${padSpot(spot.id)}, ${spot.name}, ${format(spot.price)}, ${spot.status}`}
      className={`spot-hotspot absolute z-10 box-border flex flex-col items-center justify-center gap-0.5 px-1 ${
        spot.logo ? "overflow-hidden" : "overflow-visible"
      } ${side ? "rounded-2xl" : "rounded-xl"} ${sold ? "is-sold" : held ? "is-held" : ""} ${
        active ? "is-active" : ""
      } ${revealIndex != null ? "spot-reveal" : ""}`}
      style={{
        left: `${left}%`,
        top: `${spot.y}%`,
        width: `${spot.width}%`,
        height: `${spot.height}%`,
        animationDelay: revealIndex != null ? `${420 + revealIndex * 110}ms` : undefined,
      }}
    >
      {spot.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={spot.logo} alt="" className="max-h-[78%] max-w-[86%] object-contain" />
      ) : (
        <>
          <strong
            className={`spot-id font-mono font-bold leading-none ${
              side ? "text-[11px] sm:text-[12px]" : banner ? "text-[13px] md:text-[15px]" : "text-[12px] md:text-[13px]"
            } ${sold ? "text-[#147a4b]" : "text-[#111]"}`}
            style={{ animationDelay: `${40 + (spot.id % 6) * 45}ms` }}
          >
            {padSpot(spot.id)}
          </strong>
          <span
            className={`spot-price font-mono font-semibold leading-none ${
              sold ? "text-[#147a4b]" : held ? "text-[#8a6a12]" : "text-[#3d3d3d]"
            } ${
              currency === "crc"
                ? side
                  ? "text-[8px]"
                  : banner
                    ? "text-[9px] md:text-[10px]"
                    : "text-[8px] md:text-[10px]"
                : side
                  ? "text-[9px]"
                  : banner
                    ? "text-[10px] md:text-[11px]"
                    : "text-[10px]"
            }`}
            style={{ animationDelay: `${90 + (spot.id % 6) * 45}ms` }}
          >
            {price}
          </span>
        </>
      )}
    </button>
  );
}
