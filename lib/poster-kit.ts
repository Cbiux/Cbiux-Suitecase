export const POSTER = { width: 1080, height: 1350 } as const;

export const NAVY = "#0b1b4a";
export const BLUE = "#2c3fd1";
export const MUTED = "#5c6478";
export const CREAM = "#f7f7f4";
export const WHITE = "#ffffff";

export function thanksBrand(sponsor: string, fallback: string) {
  return sponsor.trim() || fallback.trim() || "esta marca";
}

export function fillPosterBase(ctx: CanvasRenderingContext2D) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, POSTER.width, POSTER.height);
  ctx.strokeStyle = "rgba(11,27,74,0.07)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= POSTER.width; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, POSTER.height);
    ctx.stroke();
  }
  for (let y = 0; y <= POSTER.height; y += 42) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(POSTER.width, y);
    ctx.stroke();
  }
  ctx.fillStyle = BLUE;
  ctx.fillRect(0, 0, 18, POSTER.height);
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function drawCbiuxMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  roundRect(ctx, x, y, size, size, size * 0.22);
  ctx.fillStyle = BLUE;
  ctx.fill();
  ctx.save();
  ctx.translate(x + size * 0.18, y + size * 0.18);
  ctx.scale(size / 42, size / 42);
  roundRect(ctx, 7, 8, 18, 20, 4.5);
  ctx.fillStyle = WHITE;
  ctx.fill();
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = 1.8;
  roundRect(ctx, 12.5, 4, 7, 5, 1.6);
  ctx.stroke();
  ctx.fillStyle = BLUE;
  roundRect(ctx, 11, 14, 10, 2.2, 1.1);
  ctx.fill();
  roundRect(ctx, 11, 18.5, 10, 2.2, 1.1);
  ctx.fill();
  ctx.restore();
}

export function drawContained(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const naturalW = image.naturalWidth || image.width;
  const naturalH = image.naturalHeight || image.height;
  if (!naturalW || !naturalH) {
    ctx.drawImage(image, x, y, w, h);
    return;
  }
  const scale = Math.min(w / naturalW, h / naturalH);
  const dw = naturalW * scale;
  const dh = naturalH * scale;
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("IMAGE"));
    if (!src.startsWith("blob:") && !src.startsWith("data:")) {
      image.crossOrigin = "anonymous";
    }
    image.src = src;
  });
}

export function canvasToPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
}

export function makePosterCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = POSTER.width;
  canvas.height = POSTER.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CANVAS");
  fillPosterBase(ctx);
  return { canvas, ctx };
}
