import { SITE } from "./config";
import { bakeLogoPlateCached } from "./logo-fit";
import { artworkSpec, padSpot } from "./positions";
import {
  BLUE,
  CREAM,
  MUTED,
  NAVY,
  drawCbiuxMark,
  loadImage,
  roundRect,
  thanksBrand,
} from "./poster-kit";
import { visiblePlates } from "./spot-groups";
import type { Face, LivePosition } from "./types";
import {
  fillReel,
  parseReelCopy,
  reelRouteLine,
  reelRuta,
  type ReelCopy,
  type ReelFormat,
} from "./reel";

export type LoadedPlate = {
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

export async function prepareReelAssets(positions: LivePosition[]): Promise<ReelAssets> {
  await document.fonts.ready.catch(() => undefined);
  const plates = visiblePlates(positions);
  const soldPlates = plates.filter((spot) => spot.status === "sold" || Boolean(spot.logo));
  const [frontBag, sideBag] = await Promise.all([
    loadImage("/suitcase-front.png"),
    loadImage("/suitcase-side.png"),
  ]);
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
    plates: loaded,
    sold: positions.filter((spot) => spot.status === "sold").length,
    available: positions.filter((spot) => spot.status === "available").length,
    brands,
  };
}

export function sponsorPlates(assets: ReelAssets) {
  return assets.plates.filter((spot) => spot.image && spot.sponsor);
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

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  font: string,
) {
  ctx.font = font;
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
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
  ctx.save();
  drawCbiuxMark(ctx, pad, h * 0.035, w * 0.048);
  ctx.fillStyle = NAVY;
  ctx.font = mono(700, w * 0.018);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText("cbiux", pad + w * 0.062, h * 0.035 + w * 0.024);
  ctx.fillStyle = MUTED;
  ctx.textAlign = "right";
  ctx.fillText(kicker, w - pad, h * 0.035 + w * 0.024);
  ctx.restore();
}

function drawEndCredit(ctx: CanvasRenderingContext2D, format: ReelFormat, alpha: number) {
  if (alpha <= 0.02) return;
  const { width: w, height: h } = format;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = MUTED;
  ctx.font = sans(600, w * 0.018);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`@${SITE.x}`, w / 2, h - h * 0.038);
  ctx.textAlign = "left";
  ctx.restore();
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
  highlight?: { id: number; pan: number },
) {
  const meta = FACE_META[face];
  const bag = meta.src === "front" ? assets.frontBag : assets.sideBag;
  const box = contain(meta.nw, meta.nh, x, y, w, h);
  const centerX = box.x + box.w / 2;
  const centerY = box.y + box.h / 2;
  let focusX = centerX;
  let focusY = centerY;
  const target = highlight
    ? assets.plates.find((spot) => spot.id === highlight.id && spot.face === face)
    : undefined;
  if (target) {
    const left = meta.mirror ? 100 - target.x - target.width : target.x;
    focusX = box.x + ((left + target.width / 2) / 100) * box.w;
    focusY = box.y + ((target.y + target.height / 2) / 100) * box.h;
  }
  const pan = highlight && target ? highlight.pan : 0;
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(zoom, zoom);
  ctx.translate(-(centerX + (focusX - centerX) * pan), -(centerY + (focusY - centerY) * pan));
  ctx.save();
  if (meta.mirror) {
    ctx.translate(box.x + box.w, box.y);
    ctx.scale(-1, 1);
    ctx.drawImage(bag, 0, 0, box.w, box.h);
  } else {
    ctx.drawImage(bag, box.x, box.y, box.w, box.h);
  }
  ctx.restore();

  const spots = assets.plates.filter((item) => item.face === face);
  for (const spot of spots) {
    const active = Boolean(highlight && spot.id === highlight.id);
    drawPlate(ctx, spot, box, meta.mirror, highlight ? (active ? 1 : 0.38) : 1, active);
  }
  ctx.restore();
}

function drawPlate(
  ctx: CanvasRenderingContext2D,
  spot: LoadedPlate,
  box: { x: number; y: number; w: number; h: number },
  mirror: boolean,
  alpha: number,
  active: boolean,
) {
  const left = mirror ? 100 - spot.x - spot.width : spot.x;
  const px = box.x + (left / 100) * box.w;
  const py = box.y + (spot.y / 100) * box.h;
  const pw = (spot.width / 100) * box.w;
  const ph = (spot.height / 100) * box.h;
  const radius = Math.min(pw, ph) * 0.16;
  ctx.save();
  ctx.globalAlpha *= alpha;
  roundRect(ctx, px, py, pw, ph, radius);
  ctx.fillStyle = spot.image ? spot.plate : "rgba(255,255,255,0.86)";
  ctx.fill();
  ctx.strokeStyle = active ? BLUE : spot.image ? "rgba(20,20,20,0.12)" : "rgba(11,27,74,0.18)";
  ctx.lineWidth = active ? Math.max(4, pw * 0.045) : Math.max(1.5, pw * 0.012);
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
  ctx.restore();
}

function reveal(ctx: CanvasRenderingContext2D, alpha: number, t: number, at: number, draw: () => void) {
  const shown = alpha * ease((t - at) / 0.28);
  if (shown <= 0) return;
  ctx.save();
  ctx.globalAlpha = shown;
  ctx.translate(0, (1 - shown) * 18);
  draw();
  ctx.restore();
}

function drawHook(
  ctx: CanvasRenderingContext2D,
  t: number,
  assets: ReelAssets,
  format: ReelFormat,
  alpha: number,
  copy: ReelCopy,
) {
  const { width: w, height: h } = format;
  const pad = w * 0.08;
  const tall = format.id === "reels";
  const compact = format.id === "square";
  const count = Math.max(0, Math.round(ease(Math.min(t / 0.55, 1)) * assets.sold));
  const titleSize = compact ? w * 0.11 : tall ? w * 0.13 : w * 0.11;
  const bodySize = compact ? w * 0.052 : tall ? w * 0.058 : w * 0.05;
  const titleY = compact ? h * 0.26 : h * 0.24;
  const cities = copy.cities.map((item) => item.trim()).filter(Boolean);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textBaseline = "alphabetic";

  reveal(ctx, alpha, t, 0.02, () => {
    ctx.fillStyle = BLUE;
    ctx.font = mono(700, w * 0.022);
    ctx.fillText(copy.kicker, pad, titleY - titleSize * 0.55);
  });
  reveal(ctx, alpha, t, 0.18, () => {
    ctx.fillStyle = NAVY;
    ctx.font = sans(650, titleSize);
    ctx.fillText(fillReel(copy.countLine, { n: count }), pad, titleY);
  });
  reveal(ctx, alpha, t, 0.42, () => {
    ctx.fillStyle = NAVY;
    ctx.font = sans(500, bodySize);
    ctx.fillText(copy.supported, pad, titleY + titleSize * 0.85);
  });
  if (cities.length) {
    reveal(ctx, alpha, t, 0.62, () => {
      ctx.fillStyle = MUTED;
      ctx.font = sans(500, compact ? w * 0.036 : w * 0.038);
      ctx.fillText(copy.goingTo, pad, titleY + titleSize * 0.85 + bodySize * 1.35);
    });
    const cityY0 = titleY + titleSize * 0.85 + bodySize * (compact ? 2.55 : 2.85);
    cities.forEach((city, index) => {
      reveal(ctx, alpha, t, 0.86 + index * 0.16, () => {
        const y = cityY0 + index * bodySize * 1.55;
        ctx.fillStyle = BLUE;
        ctx.font = mono(700, w * 0.018);
        ctx.fillText(String(index + 1).padStart(2, "0"), pad, y);
        ctx.fillStyle = NAVY;
        ctx.font = sans(650, compact ? w * 0.046 : w * 0.05);
        ctx.fillText(city, pad + w * 0.09, y);
      });
    });
  }
  ctx.restore();
}

function drawFace(
  ctx: CanvasRenderingContext2D,
  t: number,
  start: number,
  face: Face,
  assets: ReelAssets,
  format: ReelFormat,
  alpha: number,
  copy: ReelCopy,
) {
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
  ctx.fillText(copy.faceTitle, w * 0.08, h * 0.175);
  const bagY = h * 0.2;
  const bagH = h * 0.68;
  drawSuitcase(ctx, assets, face, w * 0.08, bagY, w * 0.84, bagH, zoom);
  ctx.restore();
}

function drawMosaic(
  ctx: CanvasRenderingContext2D,
  t: number,
  start: number,
  assets: ReelAssets,
  format: ReelFormat,
  alpha: number,
  copy: ReelCopy,
) {
  const { width: w, height: h } = format;
  const logos = assets.plates.filter((spot) => spot.image);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = NAVY;
  ctx.font = sans(650, w * 0.05);
  ctx.fillText(copy.mosaicTitle, w * 0.08, h * 0.13);
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

function drawCta(
  ctx: CanvasRenderingContext2D,
  assets: ReelAssets,
  format: ReelFormat,
  alpha: number,
  copy: ReelCopy,
) {
  const { width: w, height: h } = format;
  const pad = w * 0.08;
  const compact = format.id === "square";
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = BLUE;
  ctx.font = mono(700, w * 0.022);
  ctx.fillText(copy.kicker, pad, h * (compact ? 0.22 : 0.2));
  ctx.fillStyle = NAVY;
  ctx.font = sans(650, compact ? w * 0.08 : w * 0.09);
  ctx.fillText(copy.closeTitleA, pad, h * (compact ? 0.22 : 0.2) + w * 0.1);
  ctx.fillStyle = BLUE;
  ctx.fillText(copy.closeTitleB, pad, h * (compact ? 0.22 : 0.2) + w * 0.2);
  ctx.fillStyle = NAVY;
  const body = wrapLines(
    ctx,
    fillReel(copy.closeBody, { ruta: reelRuta(copy) }),
    w - pad * 2,
    sans(500, w * 0.034),
  );
  body.forEach((line, index) => {
    ctx.fillText(line, pad, h * (compact ? 0.48 : 0.46) + index * w * 0.048);
  });
  const shown = assets.brands.slice(0, compact ? 6 : 8);
  ctx.fillStyle = MUTED;
  ctx.font = sans(500, w * 0.026);
  const names = shown.join("  ·  ") + (assets.brands.length > shown.length ? "  ·  …" : "");
  const nameLines = wrapLines(ctx, names, w - pad * 2, sans(500, w * 0.026));
  nameLines.slice(0, 4).forEach((line, index) => {
    ctx.fillText(line, pad, h * (compact ? 0.7 : 0.68) + index * w * 0.04);
  });
  ctx.restore();
}

function fitLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxSize: number,
  minSize: number,
) {
  let size = maxSize;
  ctx.font = sans(650, size);
  while (size > minSize && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = sans(650, size);
  }
  return size;
}

function drawLogoCard(
  ctx: CanvasRenderingContext2D,
  spot: LoadedPlate,
  x: number,
  y: number,
  size: number,
) {
  if (!spot.image) return;
  roundRect(ctx, x, y, size, size, size * 0.14);
  ctx.fillStyle = spot.plate;
  ctx.fill();
  const inset = size * 0.12;
  const imgW = spot.image.naturalWidth || spot.image.width;
  const imgH = spot.image.naturalHeight || spot.image.height;
  const inner = contain(imgW, imgH, x + inset, y + inset, size - inset * 2, size - inset * 2);
  ctx.drawImage(spot.image, inner.x, inner.y, inner.w, inner.h);
}

function drawSponsorHook(
  ctx: CanvasRenderingContext2D,
  t: number,
  spot: LoadedPlate,
  format: ReelFormat,
  alpha: number,
  copy: ReelCopy,
) {
  const { width: w, height: h } = format;
  const pad = w * 0.08;
  const compact = format.id === "square";
  const card = compact ? w * 0.42 : format.id === "reels" ? w * 0.52 : w * 0.46;
  ctx.save();
  ctx.globalAlpha = alpha;
  reveal(ctx, alpha, t, 0.02, () => {
    ctx.fillStyle = BLUE;
    ctx.font = mono(700, w * 0.022);
    ctx.fillText(copy.kicker, pad, h * 0.16);
  });
  reveal(ctx, alpha, t, 0.18, () => {
    ctx.fillStyle = NAVY;
    const size = fitLine(ctx, spot.sponsor, w - pad * 2, compact ? w * 0.08 : w * 0.09, w * 0.042);
    ctx.font = sans(650, size);
    ctx.fillText(spot.sponsor, pad, h * 0.16 + size * 1.35, w - pad * 2);
  });
  reveal(ctx, alpha, t, 0.36, () => {
    const y = compact ? h * 0.34 : h * 0.3;
    drawLogoCard(ctx, spot, (w - card) / 2, y, card);
  });
  reveal(ctx, alpha, t, 0.7, () => {
    ctx.fillStyle = MUTED;
    ctx.font = sans(500, w * 0.032);
    ctx.textAlign = "center";
    ctx.fillText(copy.sponsorSupported, w / 2, compact ? h * 0.82 : h * 0.8);
    ctx.font = mono(700, w * 0.018);
    ctx.fillText(`${FACE_META[spot.face].label}  ·  ${padSpot(spot.id)}`, w / 2, compact ? h * 0.88 : h * 0.86);
    ctx.textAlign = "left";
  });
  ctx.restore();
}

function drawSponsorBag(
  ctx: CanvasRenderingContext2D,
  t: number,
  start: number,
  spot: LoadedPlate,
  assets: ReelAssets,
  format: ReelFormat,
  alpha: number,
  copy: ReelCopy,
) {
  const { width: w, height: h } = format;
  ctx.save();
  ctx.globalAlpha = alpha;
  const local = clamp((t - start) / 3.2);
  const zoom = 1.08 + 0.62 * ease(local);
  const pan = 0.2 + 0.7 * ease(local);
  ctx.fillStyle = MUTED;
  ctx.font = mono(700, w * 0.02);
  ctx.fillText(FACE_META[spot.face].label, w * 0.08, h * 0.12);
  ctx.fillStyle = NAVY;
  const headline = fillReel(copy.sponsorWithMe, { marca: spot.sponsor });
  const size = fitLine(ctx, headline, w * 0.84, w * 0.046, w * 0.028);
  ctx.font = sans(650, size);
  ctx.fillText(headline, w * 0.08, h * 0.175, w * 0.84);
  drawSuitcase(ctx, assets, spot.face, w * 0.06, h * 0.2, w * 0.88, h * 0.68, zoom, {
    id: spot.id,
    pan,
  });
  ctx.restore();
}

function drawSponsorCta(
  ctx: CanvasRenderingContext2D,
  spot: LoadedPlate,
  format: ReelFormat,
  alpha: number,
  copy: ReelCopy,
) {
  const { width: w, height: h } = format;
  const pad = w * 0.08;
  const compact = format.id === "square";
  const card = compact ? w * 0.38 : format.id === "reels" ? w * 0.5 : w * 0.42;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = BLUE;
  ctx.font = mono(700, w * 0.022);
  ctx.fillText(copy.kicker, pad, h * 0.16);
  ctx.fillStyle = NAVY;
  const size = fitLine(ctx, spot.sponsor, w - pad * 2, compact ? w * 0.07 : w * 0.08, w * 0.038);
  ctx.font = sans(650, size);
  ctx.fillText(spot.sponsor, pad, h * 0.16 + size * 1.28, w - pad * 2);
  if (spot.image) {
    drawLogoCard(ctx, spot, (w - card) / 2, compact ? h * 0.32 : h * 0.3, card);
  }
  ctx.fillStyle = NAVY;
  ctx.font = sans(500, w * 0.032);
  ctx.textAlign = "center";
  const thanks = wrapLines(
    ctx,
    fillReel(copy.sponsorThanks, { marca: spot.sponsor, ruta: reelRuta(copy) }),
    w - pad * 2,
    sans(500, w * 0.032),
  );
  const thanksY = compact ? h * 0.78 : h * 0.76;
  thanks.forEach((line, index) => {
    ctx.fillText(line, w / 2, thanksY + index * w * 0.042);
  });
  ctx.fillStyle = MUTED;
  ctx.font = mono(600, w * 0.018);
  ctx.fillText(reelRouteLine(copy), w / 2, thanksY + thanks.length * w * 0.042 + w * 0.04);
  ctx.textAlign = "left";
  ctx.restore();
}

function drawGroupReel(
  ctx: CanvasRenderingContext2D,
  t: number,
  assets: ReelAssets,
  format: ReelFormat,
  copy: ReelCopy,
) {
  const hook = scene(t, 0, 2.65, 0.28);
  const front = scene(t, 2.55, 5.35);
  const back = scene(t, 5.05, 7.85);
  const right = scene(t, 7.55, 10.35);
  const left = scene(t, 10.05, 12.85);
  const mosaic = scene(t, 12.55, 15.3);
  const cta = scene(t, 15.0, 17.7);
  if (hook) drawHook(ctx, t, assets, format, hook, copy);
  if (front) drawFace(ctx, t, 2.55, "front", assets, format, front, copy);
  if (back) drawFace(ctx, t, 5.05, "back", assets, format, back, copy);
  if (right) drawFace(ctx, t, 7.55, "right", assets, format, right, copy);
  if (left) drawFace(ctx, t, 10.05, "left", assets, format, left, copy);
  if (mosaic) drawMosaic(ctx, t, 12.55, assets, format, mosaic, copy);
  if (cta) drawCta(ctx, assets, format, cta, copy);
  chrome(ctx, format, copy.kicker);
  drawEndCredit(ctx, format, scene(t, 16.15, 17.7, 0.4));
}

function drawSponsorReel(
  ctx: CanvasRenderingContext2D,
  t: number,
  assets: ReelAssets,
  format: ReelFormat,
  spot: LoadedPlate,
  copy: ReelCopy,
) {
  const hook = scene(t, 0, 2.45, 0.26);
  const bag = scene(t, 2.3, 5.75);
  const cta = scene(t, 5.55, 8.5);
  if (hook) drawSponsorHook(ctx, t, spot, format, hook, copy);
  if (bag) drawSponsorBag(ctx, t, 2.3, spot, assets, format, bag, copy);
  if (cta) drawSponsorCta(ctx, spot, format, cta, copy);
  chrome(ctx, format, copy.kicker);
  drawEndCredit(ctx, format, scene(t, 7.35, 8.5, 0.35));
}

export function drawReelFrame(
  ctx: CanvasRenderingContext2D,
  t: number,
  assets: ReelAssets,
  format: ReelFormat,
  focus?: LoadedPlate | null,
  copyInput?: ReelCopy,
) {
  const copy = parseReelCopy(copyInput);
  fillBase(ctx, format.width, format.height);
  if (focus) drawSponsorReel(ctx, t, assets, format, focus, copy);
  else drawGroupReel(ctx, t, assets, format, copy);
}
