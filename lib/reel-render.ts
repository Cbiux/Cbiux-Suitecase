import QRCode from "qrcode";
import { SITE } from "./config";
import { bakeLogoPlateCached } from "./logo-fit";
import { TRIP, artworkSpec, padSpot } from "./positions";
import {
  BLUE,
  CREAM,
  MUTED,
  NAVY,
  WHITE,
  drawCbiuxMark,
  loadImage,
  roundRect,
  thanksBrand,
} from "./poster-kit";
import { visiblePlates } from "./spot-groups";
import type { Face, LivePosition } from "./types";
import type { ReelFormat } from "./reel";

type LoadedPlate = {
  id: number;
  face: Face;
  x: number;
  y: number;
  width: number;
  height: number;
  sponsor: string;
  image: HTMLImageElement | null;
  plate: string;
};

export type ReelAssets = {
  frontBag: HTMLImageElement;
  sideBag: HTMLImageElement;
  qr: HTMLImageElement;
  plates: LoadedPlate[];
  sold: number;
  available: number;
  brands: string[];
};

const FACE_META: Record<Face, { src: "front" | "side"; mirror: boolean; label: string; nw: number; nh: number }> = {
  front: { src: "front", mirror: false, label: "FRENTE", nw: 1168, nh: 1346 },
  back: { src: "front", mirror: true, label: "ATRÁS", nw: 1168, nh: 1346 },
  right: { src: "side", mirror: false, label: "LADO", nw: 768, nh: 1024 },
  left: { src: "side", mirror: true, label: "CONTRARIO", nw: 768, nh: 1024 },
};

const SITE_URL = "https://cbiux-suitcase.vercel.app";

export async function prepareReelAssets(positions: LivePosition[]): Promise<ReelAssets> {
  await document.fonts.ready.catch(() => undefined);
  const plates = visiblePlates(positions);
  const soldPlates = plates.filter((spot) => spot.status === "sold" || Boolean(spot.logo));
  const [frontBag, sideBag, qrSrc] = await Promise.all([
    loadImage("/suitcase-front.png"),
    loadImage("/suitcase-side.png"),
    QRCode.toDataURL(SITE_URL, { margin: 0, width: 360, color: { dark: NAVY, light: WHITE } }),
  ]);
  const qr = await loadImage(qrSrc);
  const loaded: LoadedPlate[] = await Promise.all(
    plates.map(async (spot) => {
      if (!spot.logo) {
        return {
          id: spot.id,
          face: spot.face,
          x: spot.x,
          y: spot.y,
          width: spot.width,
          height: spot.height,
          sponsor: thanksBrand(spot.sponsor, ""),
          image: null,
          plate: "#ffffff",
        };
      }
      const spec = artworkSpec(spot.size);
      try {
        const baked = await bakeLogoPlateCached(spot.logo, spec.cmW, spec.cmH);
        const image = await loadImage(baked.src);
        return {
          id: spot.id,
          face: spot.face,
          x: spot.x,
          y: spot.y,
          width: spot.width,
          height: spot.height,
          sponsor: thanksBrand(spot.sponsor, spot.name),
          image,
          plate: baked.plate,
        };
      } catch {
        return {
          id: spot.id,
          face: spot.face,
          x: spot.x,
          y: spot.y,
          width: spot.width,
          height: spot.height,
          sponsor: thanksBrand(spot.sponsor, spot.name),
          image: null,
          plate: "#ffffff",
        };
      }
    }),
  );
  const brands = [...new Set(soldPlates.map((spot) => thanksBrand(spot.sponsor, spot.name)).filter(Boolean))];
  return {
    frontBag,
    sideBag,
    qr,
    plates: loaded,
    sold: positions.filter((spot) => spot.status === "sold").length,
    available: positions.filter((spot) => spot.status === "available").length,
    brands,
  };
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function ease(t: number) {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
}

function scene(t: number, start: number, end: number, fade = 0.32) {
  if (t < start || t > end) return 0;
  const inA = ease((t - start) / fade);
  const outA = ease((end - t) / fade);
  return Math.min(inA, outA, 1);
}

function fillBase(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(11,27,74,0.07)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += 42) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.fillStyle = BLUE;
  ctx.fillRect(0, 0, Math.max(14, w * 0.016), h);
}

function sans(weight: number, size: number) {
  return `${weight} ${size}px Inter, ui-sans-serif, system-ui, sans-serif`;
}

function mono(weight: number, size: number) {
  return `${weight} ${size}px "JetBrains Mono", ui-monospace, monospace`;
}

function chrome(ctx: CanvasRenderingContext2D, format: ReelFormat, kicker: string) {
  const { width: w, height: h } = format;
  const pad = w * 0.07;
  drawCbiuxMark(ctx, pad, h * 0.035, w * 0.048);
  ctx.fillStyle = NAVY;
  ctx.font = mono(700, w * 0.018);
  ctx.textBaseline = "middle";
  ctx.fillText("cbiux", pad + w * 0.062, h * 0.035 + w * 0.024);
  ctx.fillStyle = MUTED;
  ctx.textAlign = "right";
  ctx.fillText(kicker, w - pad, h * 0.035 + w * 0.024);
  ctx.textAlign = "left";
  ctx.fillStyle = MUTED;
  ctx.font = mono(600, w * 0.016);
  ctx.fillText(`@${SITE.x}`, pad, h - h * 0.038);
  ctx.textAlign = "right";
  ctx.fillText("cbiux-suitcase.vercel.app", w - pad, h - h * 0.038);
  ctx.textAlign = "left";
}

function contain(
  srcW: number,
  srcH: number,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.min(w / srcW, h / srcH);
  const dw = srcW * scale;
  const dh = srcH * scale;
  return { x: x + (w - dw) / 2, y: y + (h - dh) / 2, w: dw, h: dh };
}

function drawSuitcase(
  ctx: CanvasRenderingContext2D,
  assets: ReelAssets,
  face: Face,
  x: number,
  y: number,
  w: number,
  h: number,
  zoom: number,
) {
  const meta = FACE_META[face];
  const bag = meta.src === "front" ? assets.frontBag : assets.sideBag;
  const box = contain(meta.nw, meta.nh, x, y, w, h);
  ctx.save();
  ctx.translate(box.x + box.w / 2, box.y + box.h / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-(box.x + box.w / 2), -(box.y + box.h / 2));
  ctx.save();
  if (meta.mirror) {
    ctx.translate(box.x + box.w, box.y);
    ctx.scale(-1, 1);
    ctx.drawImage(bag, 0, 0, box.w, box.h);
  } else {
    ctx.drawImage(bag, box.x, box.y, box.w, box.h);
  }
  ctx.restore();

  for (const spot of assets.plates.filter((item) => item.face === face)) {
    const left = meta.mirror ? 100 - spot.x - spot.width : spot.x;
    const px = box.x + (left / 100) * box.w;
    const py = box.y + (spot.y / 100) * box.h;
    const pw = (spot.width / 100) * box.w;
    const ph = (spot.height / 100) * box.h;
    const radius = Math.min(pw, ph) * 0.16;
    roundRect(ctx, px, py, pw, ph, radius);
    ctx.fillStyle = spot.image ? spot.plate : "rgba(255,255,255,0.86)";
    ctx.fill();
    ctx.strokeStyle = spot.image ? "rgba(20,20,20,0.12)" : "rgba(11,27,74,0.18)";
    ctx.lineWidth = Math.max(1.5, pw * 0.012);
    ctx.stroke();
    if (spot.image) {
      ctx.save();
      roundRect(ctx, px, py, pw, ph, radius);
      ctx.clip();
      const inset = Math.min(pw, ph) * 0.06;
      const imgW = spot.image.naturalWidth || spot.image.width;
      const imgH = spot.image.naturalHeight || spot.image.height;
      const inner = contain(imgW, imgH, px + inset, py + inset, pw - inset * 2, ph - inset * 2);
      ctx.drawImage(spot.image, inner.x, inner.y, inner.w, inner.h);
      ctx.restore();
    } else {
      ctx.fillStyle = NAVY;
      ctx.font = mono(700, Math.min(pw, ph) * 0.28);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(padSpot(spot.id), px + pw / 2, py + ph / 2);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }
  }
  ctx.restore();
}

function drawHook(ctx: CanvasRenderingContext2D, t: number, assets: ReelAssets, format: ReelFormat, alpha: number) {
  const { width: w, height: h } = format;
  ctx.save();
  ctx.globalAlpha = alpha;
  const pad = w * 0.08;
  ctx.fillStyle = NAVY;
  ctx.font = sans(650, format.id === "reels" ? w * 0.11 : w * 0.09);
  ctx.fillText(`${assets.sold} marcas.`, pad, h * 0.22);
  ctx.fillStyle = BLUE;
  ctx.font = sans(650, format.id === "reels" ? w * 0.062 : w * 0.05);
  const lines =
    format.id === "square"
      ? ["Una maleta de cabina", "a Europa e India."]
      : ["Una maleta de cabina rumbo", "a Europa e India."];
  lines.forEach((line, index) => {
    ctx.fillText(line, pad, h * (format.id === "square" ? 0.34 : 0.32) + index * w * 0.08);
  });
  const bagY = h * (format.id === "reels" ? 0.42 : 0.46);
  const bagH = h * (format.id === "reels" ? 0.46 : 0.42);
  const zoom = 1 + 0.04 * ease(t / 2.4);
  drawSuitcase(ctx, assets, "front", w * 0.12, bagY, w * 0.76, bagH, zoom);
  ctx.restore();
}

function drawFace(ctx: CanvasRenderingContext2D, t: number, start: number, face: Face, assets: ReelAssets, format: ReelFormat, alpha: number) {
  const { width: w, height: h } = format;
  ctx.save();
  ctx.globalAlpha = alpha;
  const local = clamp((t - start) / 2.4);
  const zoom = 1.02 + 0.06 * ease(local);
  ctx.fillStyle = MUTED;
  ctx.font = mono(700, w * 0.02);
  ctx.fillText(FACE_META[face].label, w * 0.08, h * 0.12);
  ctx.fillStyle = NAVY;
  ctx.font = sans(650, w * 0.048);
  ctx.fillText("Los partners, en el carry-on.", w * 0.08, h * 0.175);
  const bagY = h * 0.2;
  const bagH = h * 0.68;
  drawSuitcase(ctx, assets, face, w * 0.08, bagY, w * 0.84, bagH, zoom);
  ctx.restore();
}

function drawMosaic(ctx: CanvasRenderingContext2D, t: number, start: number, assets: ReelAssets, format: ReelFormat, alpha: number) {
  const { width: w, height: h } = format;
  const logos = assets.plates.filter((spot) => spot.image);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = NAVY;
  ctx.font = sans(650, w * 0.05);
  ctx.fillText("Ellos ya van conmigo.", w * 0.08, h * 0.13);
  const cols = logos.length > 24 ? 6 : logos.length > 16 ? 5 : 4;
  const rows = Math.max(1, Math.ceil(logos.length / cols));
  const pad = w * 0.08;
  const gap = w * 0.018;
  const gridW = w - pad * 2;
  const gridH = h * (format.id === "reels" ? 0.72 : 0.68);
  const cellW = (gridW - gap * (cols - 1)) / cols;
  const cellH = (gridH - gap * (rows - 1)) / rows;
  const originY = h * 0.17;
  logos.forEach((spot, index) => {
    const appear = ease((t - start - index * 0.045) / 0.28);
    if (appear <= 0 || !spot.image) return;
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = pad + col * (cellW + gap);
    const y = originY + row * (cellH + gap);
    ctx.save();
    ctx.globalAlpha = alpha * appear;
    roundRect(ctx, x, y, cellW, cellH, Math.min(cellW, cellH) * 0.16);
    ctx.fillStyle = spot.plate;
    ctx.fill();
    const inset = Math.min(cellW, cellH) * 0.12;
    const imgW = spot.image.naturalWidth || spot.image.width;
    const imgH = spot.image.naturalHeight || spot.image.height;
    const inner = contain(imgW, imgH, x + inset, y + inset, cellW - inset * 2, cellH - inset * 2);
    ctx.drawImage(spot.image, inner.x, inner.y, inner.w, inner.h);
    ctx.restore();
  });
  ctx.restore();
}

function drawCta(ctx: CanvasRenderingContext2D, assets: ReelAssets, format: ReelFormat, alpha: number) {
  const { width: w, height: h } = format;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = NAVY;
  ctx.font = sans(650, format.id === "square" ? w * 0.07 : w * 0.078);
  const titleY = h * (format.id === "reels" ? 0.2 : 0.22);
  ctx.fillText("Tu logo viaja", w * 0.08, titleY);
  ctx.fillStyle = BLUE;
  ctx.fillText("conmigo.", w * 0.08, titleY + w * 0.09);
  ctx.fillStyle = MUTED;
  ctx.font = sans(500, w * 0.032);
  ctx.fillText("Compile Amsterdam · Lisboa · Devcon", w * 0.08, titleY + w * 0.16);
  const leftover =
    assets.available > 0
      ? `${assets.available} espacio${assets.available === 1 ? "" : "s"} libre${assets.available === 1 ? "" : "s"}`
      : "Maleta llena";
  ctx.fillStyle = NAVY;
  ctx.font = mono(700, w * 0.028);
  ctx.fillText(leftover.toUpperCase(), w * 0.08, titleY + w * 0.22);

  const qrSize = Math.min(w * 0.28, h * 0.22);
  const qrX = w * 0.08;
  const qrY = h * (format.id === "reels" ? 0.58 : 0.56);
  roundRect(ctx, qrX - 16, qrY - 16, qrSize + 32, qrSize + 32, 28);
  ctx.fillStyle = WHITE;
  ctx.fill();
  ctx.drawImage(assets.qr, qrX, qrY, qrSize, qrSize);
  ctx.fillStyle = NAVY;
  ctx.font = sans(650, w * 0.036);
  ctx.fillText("Escaneá y mirá", qrX + qrSize + w * 0.05, qrY + qrSize * 0.38);
  ctx.fillText("la maleta en vivo.", qrX + qrSize + w * 0.05, qrY + qrSize * 0.38 + w * 0.045);
  ctx.fillStyle = BLUE;
  ctx.font = mono(700, w * 0.022);
  ctx.fillText("cbiux-suitcase.vercel.app", qrX + qrSize + w * 0.05, qrY + qrSize * 0.38 + w * 0.1);
  ctx.restore();
}

export function drawReelFrame(
  ctx: CanvasRenderingContext2D,
  t: number,
  assets: ReelAssets,
  format: ReelFormat,
) {
  fillBase(ctx, format.width, format.height);
  const hook = scene(t, 0, 2.55);
  const front = scene(t, 2.2, 5.05);
  const back = scene(t, 4.75, 7.6);
  const right = scene(t, 7.3, 10.15);
  const left = scene(t, 9.85, 12.7);
  const mosaic = scene(t, 12.4, 15.2);
  const cta = scene(t, 14.9, 17.7);
  if (hook) drawHook(ctx, t, assets, format, hook);
  if (front) drawFace(ctx, t, 2.2, "front", assets, format, front);
  if (back) drawFace(ctx, t, 4.75, "back", assets, format, back);
  if (right) drawFace(ctx, t, 7.3, "right", assets, format, right);
  if (left) drawFace(ctx, t, 9.85, "left", assets, format, left);
  if (mosaic) drawMosaic(ctx, t, 12.4, assets, format, mosaic);
  if (cta) drawCta(ctx, assets, format, cta);
  chrome(ctx, format, `${assets.sold}/${TRIP.spotCount} PARTNERS`);
}
