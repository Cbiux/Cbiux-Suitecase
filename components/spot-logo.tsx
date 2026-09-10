"use client";

import { useEffect, useState } from "react";
import { sampleLogoPlateColor } from "@/lib/logo-plate";

const cropCache = new Map<string, string>();

export function SpotLogo({
  src,
  onPlateColor,
}: {
  src: string;
  onPlateColor?: (color: string) => void;
}) {
  const [fitted, setFitted] = useState(() => cropCache.get(src) ?? "");

  useEffect(() => {
    const cached = cropCache.get(src);
    if (cached) {
      setFitted(cached);
      return;
    }
    let cancelled = false;
    trimLogoSrc(src)
      .then((next) => {
        cropCache.set(src, next);
        if (!cancelled) setFitted(next);
      })
      .catch(() => {
        cropCache.set(src, src);
        if (!cancelled) setFitted(src);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    if (!onPlateColor) return;
    let cancelled = false;
    // Muestrear el archivo original (fondo negro completo), no el crop del glifo.
    sampleLogoPlateColor(src)
      .then((color) => {
        if (!cancelled) onPlateColor(color);
      })
      .catch(() => {
        if (!cancelled) onPlateColor("#ffffff");
      });
    return () => {
      cancelled = true;
    };
  }, [src, onPlateColor]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={fitted || src} alt="" className="h-full w-full object-contain" />
  );
}

async function trimLogoSrc(src: string) {
  const image = await loadImage(src);
  const box = contentBounds(image);
  if (!box || (box.w === image.naturalWidth && box.h === image.naturalHeight)) {
    return src;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, box.w);
  canvas.height = Math.max(1, box.h);
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;
  ctx.drawImage(image, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
  return canvas.toDataURL("image/png");
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    if (!src.startsWith("data:") && !src.startsWith("blob:")) {
      image.crossOrigin = "anonymous";
    }
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("LOGO"));
    image.src = src;
  });
}

function isEmptyPixel(data: Uint8ClampedArray, index: number) {
  const alpha = data[index + 3];
  if (alpha < 12) return true;
  return data[index] > 244 && data[index + 1] > 244 && data[index + 2] > 244;
}

function contentBounds(image: HTMLImageElement) {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0);
  const { data } = ctx.getImageData(0, 0, width, height);
  const seen = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  let top = 0;

  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (seen[p]) return;
    if (!isEmptyPixel(data, p * 4)) return;
    seen[p] = 1;
    stack[top++] = p;
  };

  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  while (top > 0) {
    const p = stack[--top];
    const x = p % width;
    const y = (p / width) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (seen[y * width + x]) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX || maxY < minY) return null;

  const pad = Math.max(1, Math.round(Math.min(width, height) * 0.012));
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
