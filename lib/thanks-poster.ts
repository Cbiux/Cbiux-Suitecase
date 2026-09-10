import { SITE } from "./config";
import { slugBrand } from "./logo-file";
import { plateColorFromImage } from "./logo-plate";
import { padSpot } from "./positions";
import type { Locale } from "./types";
import {
  BLUE,
  MUTED,
  NAVY,
  POSTER,
  canvasToPng,
  drawCbiuxMark,
  drawContained,
  loadImage,
  makePosterCanvas,
  roundRect,
  thanksBrand,
} from "./poster-kit";

export const THANKS_POSTER = POSTER;
export { thanksBrand };

export function thanksFilename(sponsor: string, positionId: number) {
  return `cbiux-gracias-${padSpot(positionId)}-${slugBrand(sponsor)}.png`;
}

export function thanksCaption(sponsor: string, positionId: number, locale: Locale = "es") {
  const brand = thanksBrand(sponsor, "");
  const spot = padSpot(positionId);
  if (locale === "en") {
    return `Thank you to ${brand} for traveling with me.

Their logo is on spot ${spot} of my cabin bag, from Costa Rica to Compile Amsterdam, Europe and Devcon India.

Daily vlog of the whole trip.

@${SITE.x}`;
  }
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
  const { canvas, ctx } = makePosterCanvas();

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
  ctx.fillStyle = plateColorFromImage(logo);
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
