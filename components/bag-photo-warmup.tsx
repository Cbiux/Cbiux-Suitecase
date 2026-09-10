"use client";

import { useEffect } from "react";

const BAG_SRCS = ["/suitcase-front.png", "/suitcase-side.png"];

export function BagPhotoWarmup() {
  useEffect(() => {
    for (const src of BAG_SRCS) {
      const image = new Image();
      image.src = src;
      void image.decode?.();
    }
  }, []);
  return null;
}
