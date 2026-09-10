"use client";

import { useEffect, useRef, useState } from "react";
import { bakeLogoPlateCached, peekBakedLogo } from "@/lib/logo-fit";

export function SpotLogo({
  src,
  cmW,
  cmH,
  onPlateColor,
}: {
  src: string;
  cmW: number;
  cmH: number;
  onPlateColor?: (color: string) => void;
}) {
  const plateCb = useRef(onPlateColor);
  plateCb.current = onPlateColor;
  const [baked, setBaked] = useState(() => peekBakedLogo(src, cmW, cmH));

  useEffect(() => {
    let live = true;
    const peeked = peekBakedLogo(src, cmW, cmH);
    if (peeked) {
      plateCb.current?.(peeked.plate);
      setBaked(peeked);
      return;
    }
    setBaked(null);
    bakeLogoPlateCached(src, cmW, cmH).then(
      (result) => {
        if (!live) return;
        plateCb.current?.(result.plate);
        setBaked(result);
      },
      () => {
        if (!live) return;
        plateCb.current?.("#ffffff");
        setBaked({ src, plate: "#ffffff" });
      },
    );
    return () => {
      live = false;
    };
  }, [src, cmW, cmH]);

  if (!baked) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={baked.src} alt="" className="h-full w-full object-cover" />
  );
}
