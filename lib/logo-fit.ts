import { plateColorFromImage } from "./logo-plate";

export type BakedLogo = { src: string; plate: string };

const done = new Map<string, BakedLogo>();
const jobs = new Map<string, Promise<BakedLogo>>();

export function bakeKey(src: string, cmW: number, cmH: number) {
  return `${cmW}x${cmH}:${src.length}:${src.slice(0, 48)}:${src.slice(-24)}`;
}

export function peekBakedLogo(src: string, cmW: number, cmH: number) {
  return done.get(bakeKey(src, cmW, cmH)) ?? null;
}

export function bakeLogoPlateCached(src: string, cmW: number, cmH: number) {
  const key = bakeKey(src, cmW, cmH);
  const cached = done.get(key);
  if (cached) return Promise.resolve(cached);
  let job = jobs.get(key);
  if (!job) {
    job = bakeLogoPlate(src, cmW, cmH).then((result) => {
      done.set(key, result);
      return result;
    });
    jobs.set(key, job);
  }
  return job;
}

export async function bakeLogoPlate(src: string, cmW: number, cmH: number): Promise<BakedLogo> {
  const image = await loadImage(src);
  const plate = plateColorFromImage(image);
  const box = contentBounds(image);
  const { w, h } = plateSize(cmW, cmH);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { src, plate };
  ctx.fillStyle = plate;
  ctx.fillRect(0, 0, w, h);
  const sx = box?.x ?? 0;
  const sy = box?.y ?? 0;
  const sw = box?.w ?? image.naturalWidth || image.width;
  const sh = box?.h ?? image.naturalHeight || image.height;
  if (sw > 0 && sh > 0) {
    const scale = Math.min(w / sw, h / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    ctx.drawImage(image, sx, sy, sw, sh, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }
  return { src: canvas.toDataURL("image/png"), plate };
}

function plateSize(cmW: number, cmH: number) {
  const ratio = cmW / Math.max(cmH, 0.01);
  const long = 720;
  if (ratio >= 1) return { w: long, h: Math.max(1, Math.round(long / ratio)) };
  return { w: Math.max(1, Math.round(long * ratio)), h: long };
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
