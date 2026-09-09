import { SITE } from "./config";
import { slugBrand } from "./logo-file";
import { padSpot } from "./positions";

export const THANKS_POSTER = { width: 1080, height: 1350 } as const;

const NAVY = "#0b1b4a";
const BLUE = "#2c3fd1";
const MUTED = "#5c6478";
const CREAM = "#f7f7f4";
const WHITE = "#ffffff";

export function thanksBrand(sponsor: string, fallback: string) {
  return sponsor.trim() || fallback.trim() || "esta marca";
}

export function thanksFilename(sponsor: string, positionId: number) {
  return `cbiux-gracias-${padSpot(positionId)}-${slugBrand(sponsor)}.png`;
}

export function thanksCaption(sponsor: string, positionId: number) {
  const brand = thanksBrand(sponsor, "");
  const spot = padSpot(positionId);
  return `Gracias a ${brand} por viajar conmigo.

Su logo va en la posición ${spot} de mi maleta de cabina, de Costa Rica a Compile Amsterdam, Europa y Devcon India.

Vlog diario de todo el trip.

@${SITE.x}`;
}

export async function renderThanksPng(input: {
  brand: string;
  positionId: number;
  logoSrc: string;
}) {
  await document.fonts.ready;
  const logo = await loadImage(input.logoSrc);
  const canvas = document.createElement("canvas");
  canvas.width = THANKS_POSTER.width;
  canvas.height = THANKS_POSTER.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CANVAS");

  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, THANKS_POSTER.width, THANKS_POSTER.height);
  ctx.strokeStyle = "rgba(11,27,74,0.07)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= THANKS_POSTER.width; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, THANKS_POSTER.height);
    ctx.stroke();
  }
  for (let y = 0; y <= THANKS_POSTER.height; y += 42) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(THANKS_POSTER.width, y);
    ctx.stroke();
  }

  ctx.fillStyle = BLUE;
  ctx.fillRect(0, 0, 18, THANKS_POSTER.height);

  drawCbiuxMark(ctx, 72, 48, 56);
  ctx.fillStyle = BLUE;
  ctx.font = "700 22px Inter, system-ui, sans-serif";
  ctx.letterSpacing = "4px";
  ctx.textAlign = "left";
  ctx.fillText("cbiux", 144, 86);

  ctx.fillStyle = MUTED;
  ctx.font = "700 22px 'JetBrains Mono', ui-monospace, monospace";
  ctx.letterSpacing = "3px";
  ctx.textAlign = "right";
  ctx.fillText(`SPOT ${padSpot(input.positionId)}`, 1008, 86);

  ctx.textAlign = "left";
  ctx.letterSpacing = "6px";
  ctx.fillStyle = BLUE;
  ctx.font = "700 26px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillText("GRACIAS", 72, 188);

  ctx.letterSpacing = "0px";
  ctx.fillStyle = NAVY;
  ctx.font = `800 ${brandSize(input.brand)}px Inter, system-ui, sans-serif`;
  ctx.fillText(input.brand, 72, 278, 936);

  ctx.fillStyle = MUTED;
  ctx.font = "500 32px Inter, system-ui, sans-serif";
  ctx.fillText("viaja en mi maleta de cabina", 72, 348);

  ctx.fillStyle = NAVY;
  ctx.font = "600 32px Inter, system-ui, sans-serif";
  ctx.fillText("Costa Rica → Europa → India", 72, 398);

  roundRect(ctx, 120, 470, 840, 540, 44);
  ctx.fillStyle = WHITE;
  ctx.fill();
  drawContained(ctx, logo, 168, 510, 744, 460);

  ctx.fillStyle = NAVY;
  ctx.font = "600 30px Inter, system-ui, sans-serif";
  ctx.fillText("Compilamos el viaje en vlog diario.", 72, 1108);

  ctx.fillStyle = MUTED;
  ctx.font = "400 26px Inter, system-ui, sans-serif";
  ctx.fillText("Compile Amsterdam · Devcon India", 72, 1162);

  ctx.fillStyle = BLUE;
  ctx.font = "700 24px Inter, system-ui, sans-serif";
  ctx.letterSpacing = "1.4px";
  ctx.fillText(`@${SITE.x}`, 72, 1268);

  ctx.fillStyle = MUTED;
  ctx.font = "600 22px Inter, system-ui, sans-serif";
  ctx.letterSpacing = "0px";
  ctx.textAlign = "right";
  ctx.fillText("cbiux-suitcase.vercel.app", 1008, 1268);

  const blob = await canvasToPng(canvas);
  if (!blob) throw new Error("PNG");
  return blob;
}

function brandSize(brand: string) {
  if (brand.length > 22) return 52;
  if (brand.length > 14) return 62;
  return 72;
}

function roundRect(
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

function drawCbiuxMark(
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

function drawContained(
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

function loadImage(src: string) {
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

function canvasToPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
}
