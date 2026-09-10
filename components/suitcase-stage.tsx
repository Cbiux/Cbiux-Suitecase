"use client";

import { useState } from "react";
import { artworkSpec, padSpot } from "@/lib/positions";
import { plateBorderColor } from "@/lib/logo-plate";
import type { Face, LivePosition } from "@/lib/types";
import { useLanguage } from "./language-provider";
import { useInventory } from "./inventory-provider";
import { SpotLogo } from "./spot-logo";

const PHOTOS: Record<Face, { src: string; mirror: boolean; alt: string }> = {
  front: {
    src: "/suitcase-front.png",
    mirror: false,
    alt: "Maleta de cabina negra, vista frontal",
  },
  back: {
    src: "/suitcase-front.png",
    mirror: true,
    alt: "Maleta de cabina negra, vista posterior",
  },
  left: {
    src: "/suitcase-side.png",
    mirror: false,
    alt: "Maleta de cabina negra, lado izquierdo",
  },
  right: {
    src: "/suitcase-side.png",
    mirror: true,
    alt: "Maleta de cabina negra, lado derecho",
  },
};

export function SuitcaseStage({
  face,
  showVertical = true,
  compact = false,
}: {
  face: Face;
  showVertical?: boolean;
  compact?: boolean;
}) {
  const { dict } = useLanguage();
  const { data, setSelectedId, selectedId, setActiveFace } = useInventory();
  const spots = data?.positions.filter((p) => p.face === face) ?? [];
  const side = face === "left" || face === "right";
  const widthLabel = side ? "20 CM" : "40 CM";
  const photo = PHOTOS[face];

  return (
    <div className={`relative mx-auto ${compact ? "w-full max-w-[282px]" : "w-full max-w-[360px]"}`}>
      <div className="relative aspect-[3/4]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.src}
          alt={photo.alt}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          style={{ transform: photo.mirror ? "scaleX(-1)" : undefined }}
        />
        {spots.map((spot) => (
          <SpotButton
            key={spot.id}
            spot={spot}
            compact={compact || side}
            active={selectedId === spot.id}
            onSelect={() => {
              setActiveFace(face);
              setSelectedId(spot.id);
            }}
          />
        ))}
        <div className="pointer-events-none absolute inset-x-[7%] -bottom-7 flex items-center justify-between font-mono text-[9px] font-semibold tracking-[0.08em] text-[#8b8b8b]">
          <span className="relative z-10 h-3 w-px bg-[#6b6b6b]" />
          <span className="relative z-10 bg-[#0a0a0a] px-2">{widthLabel}</span>
          <span className="relative z-10 h-3 w-px bg-[#6b6b6b]" />
          <span className="absolute inset-x-0 top-1/2 h-px bg-[#4a4a4a]" />
        </div>
        {showVertical ? (
          <div className="pointer-events-none absolute inset-y-[7%] -right-8 flex flex-col items-center justify-between font-mono text-[9px] font-semibold tracking-[0.08em] text-[#8b8b8b]">
            <span className="relative z-10 h-px w-3 bg-[#6b6b6b]" />
            <span className="relative z-10 bg-[#0a0a0a] px-1 [writing-mode:vertical-rl] rotate-180">
              55 CM
            </span>
            <span className="relative z-10 h-px w-3 bg-[#6b6b6b]" />
            <span className="absolute inset-y-0 left-1/2 w-px bg-[#4a4a4a]" />
          </div>
        ) : null}
      </div>
      <p className="mt-10 text-center font-mono text-[9px] font-semibold tracking-[0.14em] text-[#8b8b8b]">
        {face === "back" ? dict.faces.backPreview : dict.faces[face]}
      </p>
    </div>
  );
}

function SpotButton({
  spot,
  active,
  compact,
  onSelect,
}: {
  spot: LivePosition;
  active: boolean;
  compact?: boolean;
  onSelect: () => void;
}) {
  const sold = spot.status === "sold";
  const held = spot.status === "reserved";
  const side = spot.face === "left" || spot.face === "right";
  const spec = artworkSpec(spot.size);
  const [plate, setPlate] = useState<string | null>(null);
  const status = sold ? "sold" : held ? "held" : "open";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Position ${padSpot(spot.id)}, ${spot.name}, $${spot.price}, ${spot.status}`}
      className={`absolute z-10 flex flex-col items-center justify-center overflow-hidden border-2 backdrop-blur-[2px] transition ${
        spot.logo
          ? ""
          : sold
            ? "border-[#22c55e] bg-white"
            : held
              ? "border-[#e6b800] bg-[#fff8e8]"
              : "border-white bg-white/80 hover:border-white hover:bg-white/95"
      } ${active ? "ring-2 ring-[#7c6aef] ring-offset-1 ring-offset-black/40" : ""}`}
      style={{
        left: `${spot.x}%`,
        top: `${spot.y}%`,
        width: `${spot.width}%`,
        height: `${spot.height}%`,
        ...(spot.logo
          ? {
              backgroundColor: plate ?? "transparent",
              borderColor: plate ? plateBorderColor(plate, status) : "transparent",
            }
          : null),
      }}
    >
      {spot.logo ? (
        <SpotLogo src={spot.logo} cmW={spec.cmW} cmH={spec.cmH} onPlateColor={setPlate} />
      ) : (
        <>
          <strong
            className={`font-mono font-bold leading-none text-[#111] ${
              compact || side ? "text-[10px]" : "text-[13px]"
            }`}
          >
            {padSpot(spot.id)}
          </strong>
          <span
            className={`mt-0.5 font-mono font-semibold tracking-wide ${
              sold ? "text-[#1a7a4c]" : held ? "text-[#8a6a1a]" : "text-[#4a4a4a]"
            } ${side ? "text-[7px]" : compact ? "text-[8px]" : "text-[10px]"}`}
          >
            {sold ? "SOLD" : held ? "HELD" : `$${spot.price}`}
          </span>
        </>
      )}
    </button>
  );
}
