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
  type ReelLocale,
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

const FACE_META: Record<Face, { src: "front" | "side"; mirror: boolean; nw: number; nh: number }> = {
  front: { src: "front", mirror: false, nw: 1168, nh: 1346 },
  back: { src: "front", mirror: true, nw: 1168, nh: 1346 },
  right: { src: "side", mirror: false, nw: 768, nh: 1024 },
  left: { src: "side", mirror: true, nw: 768, nh: 1024 },
};

const FACE_REEL_LABEL: Record<ReelLocale, Record<Face, string>> = {
  es: { front: "FRENTE", back: "ATRÁS", right: "LADO", left: "CONTRARIO" },
  en: { front: "FRONT", back: "BACK", right: "SIDE", left: "OPPOSITE" },
};

function faceTag(locale: ReelLocale, face: Face) {
  return FACE_REEL_LABEL[locale][face];
}

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

type SuitcaseHighlight = {
  id: number;
  pan: number;
  fromId?: number;
  mix?: number;
};

function plateFocus(
  spot: LoadedPlate,
  box: { x: number; y: number; w: number; h: number },
  mirror: boolean,
) {
  const left = mirror ? 100 - spot.x - spot.width : spot.x;
  return {
    x: box.x + ((left + spot.width / 2) / 100) * box.w,
    y: box.y + ((spot.y + spot.height / 2) / 100) * box.h,
  };
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
  highlight?: SuitcaseHighlight,
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
  const from = highlight?.fromId
    ? assets.plates.find((spot) => spot.id === highlight.fromId && spot.face === face)
    : undefined;
  if (target) {
    const mix = from ? clamp(highlight?.mix ?? 1) : 1;
    const toFocus = plateFocus(target, box, meta.mirror);
    const fromFocus = from ? plateFocus(from, box, meta.mirror) : { x: centerX, y: centerY };
    focusX = fromFocus.x + (toFocus.x - fromFocus.x) * mix;
    focusY = fromFocus.y + (toFocus.y - fromFocus.y) * mix;
  }
  const pan = highlight && target ? highlight.pan : 0;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
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
    const previous = Boolean(highlight?.fromId && spot.id === highlight.fromId);
    const dim = highlight ? (active ? 1 : previous ? 0.7 : 0.34) : 1;
    drawPlate(ctx, spot, box, meta.mirror, dim, active);
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

const FACE_FLOW: Face[] = ["front", "back", "right", "left"];
const HOOK_LEN = 3.2;
const FACE_INTRO = 0.78;
const LOGO_BEAT = 0.8;
const MOSAIC_LEN = 2.55;
const CTA_LEN = 2.55;
const FACE_XFADE = 0.2;

function logosOnFace(assets: ReelAssets, face: Face) {
  const mirror = FACE_META[face].mirror;
  return assets.plates
    .filter((spot) => spot.face === face && spot.image)
    .sort((a, b) => {
      const dy = a.y + a.height / 2 - (b.y + b.height / 2);
      if (Math.abs(dy) > 5) return dy;
      const ax = mirror ? 100 - a.x - a.width / 2 : a.x + a.width / 2;
      const bx = mirror ? 100 - b.x - b.width / 2 : b.x + b.width / 2;
      return ax - bx;
    });
}

function groupReelBeats(assets: ReelAssets) {
  const faces = FACE_FLOW.map((face) => {
    const logos = logosOnFace(assets, face);
    return {
      face,
      logos,
      duration: FACE_INTRO + Math.max(logos.length, 1) * LOGO_BEAT,
    };
  }).filter((item) => item.logos.length > 0);

  let cursor = HOOK_LEN;
  const faceScenes = faces.map((item, index) => {
    const start = cursor;
    const end = cursor + item.duration;
    cursor = end - (index === faces.length - 1 ? 0 : FACE_XFADE);
    return { ...item, start, end };
  });
  const mosaicStart = cursor;
  const mosaicEnd = mosaicStart + MOSAIC_LEN;
  const ctaStart = mosaicEnd - FACE_XFADE;
  const ctaEnd = ctaStart + CTA_LEN;
  return {
    hookEnd: HOOK_LEN,
    faces: faceScenes,
    mosaicStart,
    mosaicEnd,
    ctaStart,
    ctaEnd,
    duration: ctaEnd,
  };
}

export function groupReelDuration(assets: ReelAssets) {
  return groupReelBeats(assets).duration;
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
  const titleSize = compact ? w * 0.088 : tall ? w * 0.108 : w * 0.092;
  const bodySize = compact ? w * 0.04 : tall ? w * 0.044 : w * 0.038;
  const kickerSize = w * 0.02;
  const goingSize = compact ? w * 0.03 : w * 0.032;
  const citySize = compact ? w * 0.04 : w * 0.044;
  const maxW = w - pad * 2;
  const cities = copy.cities.map((item) => item.trim()).filter(Boolean);
  let y = compact ? h * 0.145 : h * 0.13;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  const kickerY = y;
  reveal(ctx, alpha, t, 0.02, () => {
    ctx.fillStyle = BLUE;
    ctx.font = mono(700, kickerSize);
    ctx.textBaseline = "top";
    ctx.fillText(copy.kicker, pad, kickerY);
  });
  y += kickerSize * 1.9;

  const countText = fillReel(copy.countLine, { n: count });
  const titleLines = wrapLines(ctx, countText, maxW, sans(650, titleSize));
  const titleY = y;
  reveal(ctx, alpha, t, 0.16, () => {
    ctx.fillStyle = NAVY;
    ctx.font = sans(650, titleSize);
    ctx.textBaseline = "top";
    titleLines.forEach((line, index) => {
      ctx.fillText(line, pad, titleY + index * titleSize * 1.08);
    });
  });
  y += titleLines.length * titleSize * 1.12 + bodySize * 0.45;

  const supportLines = wrapLines(ctx, copy.supported, maxW, sans(500, bodySize));
  const supportY = y;
  reveal(ctx, alpha, t, 0.4, () => {
    ctx.fillStyle = NAVY;
    ctx.font = sans(500, bodySize);
    ctx.textBaseline = "top";
    supportLines.forEach((line, index) => {
      ctx.fillText(line, pad, supportY + index * bodySize * 1.22);
    });
  });
  y += supportLines.length * bodySize * 1.32 + goingSize * 0.9;

  if (cities.length) {
    const goingY = y;
    reveal(ctx, alpha, t, 0.58, () => {
      ctx.fillStyle = MUTED;
      ctx.font = sans(500, goingSize);
      ctx.textBaseline = "top";
      ctx.fillText(copy.goingTo, pad, goingY);
    });
    y += goingSize * 1.75;
    cities.forEach((city, index) => {
      const cityY = y + index * citySize * 1.58;
      reveal(ctx, alpha, t, 0.76 + index * 0.14, () => {
        ctx.textBaseline = "top";
        ctx.fillStyle = BLUE;
        ctx.font = mono(700, w * 0.018);
        ctx.fillText(String(index + 1).padStart(2, "0"), pad, cityY + citySize * 0.14);
        ctx.fillStyle = NAVY;
        ctx.font = sans(650, citySize);
        ctx.fillText(city, pad + w * 0.09, cityY);
      });
    });
  }
  ctx.restore();
}

function drawCaptionBand(
  ctx: CanvasRenderingContext2D,
  format: ReelFormat,
  kicker: string,
  title: string,
) {
  const { width: w, height: h } = format;
  const compact = format.id === "square";
  const pad = w * 0.08;
  const bandY = compact ? h * 0.835 : h * 0.82;
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = MUTED;
  ctx.font = mono(700, w * 0.018);
  ctx.fillText(kicker, pad, bandY);
  const nameSize = fitLine(ctx, title, w - pad * 2, compact ? w * 0.05 : w * 0.056, w * 0.03);
  ctx.fillStyle = NAVY;
  ctx.font = sans(650, nameSize);
  ctx.fillText(title, pad, bandY + w * 0.03, w - pad * 2);
  ctx.restore();
}

function drawFaceTour(
  ctx: CanvasRenderingContext2D,
  t: number,
  sceneBeat: { face: Face; logos: LoadedPlate[]; start: number; end: number },
  assets: ReelAssets,
  format: ReelFormat,
  alpha: number,
  copy: ReelCopy,
  locale: ReelLocale,
) {
  const { width: w, height: h } = format;
  const compact = format.id === "square";
  const { face, logos, start } = sceneBeat;
  const local = Math.max(0, t - start);
  ctx.save();
  ctx.globalAlpha = alpha;

  let zoom = 1.03;
  let highlight: SuitcaseHighlight | undefined;
  let title = copy.faceTitle;
  let kicker = faceTag(locale, face);
  if (logos.length && local >= FACE_INTRO) {
    const beatT = local - FACE_INTRO;
    const index = Math.min(logos.length - 1, Math.floor(beatT / LOGO_BEAT));
    const frac = clamp((beatT - index * LOGO_BEAT) / LOGO_BEAT);
    const current = logos[index];
    const previous = index > 0 ? logos[index - 1] : undefined;
    title = current.sponsor;
    kicker = `${faceTag(locale, face)}  ·  ${padSpot(current.id)}`;
    const zoomIn = ease(clamp((local - FACE_INTRO) / 0.42));
    zoom = 1.08 + 0.42 * zoomIn;
    highlight = {
      id: current.id,
      pan: 0.22 + 0.62 * zoomIn,
      fromId: previous?.id,
      mix: previous ? ease(clamp(frac / 0.36)) : ease(clamp(frac / 0.42)),
    };
  } else {
    zoom = 1.02 + 0.04 * ease(clamp(local / FACE_INTRO));
  }

  const bagY = compact ? h * 0.11 : h * 0.09;
  const bagH = compact ? h * 0.69 : h * 0.7;
  drawSuitcase(ctx, assets, face, w * 0.06, bagY, w * 0.88, bagH, zoom, highlight);
  drawCaptionBand(ctx, format, kicker, title);
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
  format: ReelFormat,
  alpha: number,
  copy: ReelCopy,
  locale: ReelLocale,
) {
  const { width: w, height: h } = format;
  const pad = w * 0.08;
  const compact = format.id === "square";
  const kickerSize = w * 0.02;
  const titleSize = compact ? w * 0.078 : w * 0.088;
  const bodySize = compact ? w * 0.036 : w * 0.038;
  const maxW = w - pad * 2;
  let y = compact ? h * 0.2 : h * 0.22;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillStyle = BLUE;
  ctx.font = mono(700, kickerSize);
  ctx.fillText(copy.kicker, pad, y);
  y += kickerSize * 2.4;
  ctx.fillStyle = NAVY;
  const titleASize = fitLine(ctx, copy.closeTitleA, maxW, titleSize, titleSize * 0.55);
  ctx.font = sans(650, titleASize);
  ctx.fillText(copy.closeTitleA, pad, y);
  y += titleASize * 1.18;
  ctx.fillStyle = BLUE;
  const titleBSize = fitLine(ctx, copy.closeTitleB, maxW, titleSize, titleSize * 0.55);
  ctx.font = sans(650, titleBSize);
  ctx.fillText(copy.closeTitleB, pad, y);
  y += titleBSize * 1.55;
  ctx.fillStyle = MUTED;
  ctx.fillRect(pad, y, w * 0.12, Math.max(2, w * 0.003));
  y += w * 0.055;
  ctx.fillStyle = NAVY;
  const body = wrapLines(
    ctx,
    fillReel(copy.closeBody, { ruta: reelRuta(copy, locale) }),
    maxW,
    sans(500, bodySize),
  );
  body.forEach((line, index) => {
    ctx.font = sans(500, bodySize);
    ctx.fillText(line, pad, y + index * bodySize * 1.42);
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
  locale: ReelLocale,
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
    ctx.fillText(`${faceTag(locale, spot.face)}  ·  ${padSpot(spot.id)}`, w / 2, compact ? h * 0.88 : h * 0.86);
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
  locale: ReelLocale,
) {
  const { width: w, height: h } = format;
  const compact = format.id === "square";
  ctx.save();
  ctx.globalAlpha = alpha;
  const local = clamp((t - start) / 3.2);
  const zoom = 1.08 + 0.42 * ease(local);
  const pan = 0.2 + 0.62 * ease(local);
  const bagY = compact ? h * 0.11 : h * 0.09;
  const bagH = compact ? h * 0.69 : h * 0.7;
  drawSuitcase(ctx, assets, spot.face, w * 0.06, bagY, w * 0.88, bagH, zoom, {
    id: spot.id,
    pan,
  });
  drawCaptionBand(
    ctx,
    format,
    `${faceTag(locale, spot.face)}  ·  ${padSpot(spot.id)}`,
    fillReel(copy.sponsorWithMe, { marca: spot.sponsor }),
  );
  ctx.restore();
}

function drawSponsorCta(
  ctx: CanvasRenderingContext2D,
  spot: LoadedPlate,
  format: ReelFormat,
  alpha: number,
  copy: ReelCopy,
  locale: ReelLocale,
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
    fillReel(copy.sponsorThanks, { marca: spot.sponsor, ruta: reelRuta(copy, locale) }),
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
  locale: ReelLocale,
) {
  const beats = groupReelBeats(assets);
  const hook = scene(t, 0, beats.hookEnd, 0.26);
  if (hook) drawHook(ctx, t, assets, format, hook, copy);
  for (const face of beats.faces) {
    const shown = scene(t, face.start, face.end, 0.2);
    if (shown) drawFaceTour(ctx, t, face, assets, format, shown, copy, locale);
  }
  const mosaic = scene(t, beats.mosaicStart, beats.mosaicEnd);
  if (mosaic) drawMosaic(ctx, t, beats.mosaicStart, assets, format, mosaic, copy);
  const cta = scene(t, beats.ctaStart, beats.ctaEnd);
  if (cta) drawCta(ctx, format, cta, copy, locale);
  chrome(ctx, format, copy.kicker);
  drawEndCredit(ctx, format, scene(t, beats.ctaEnd - 1.35, beats.ctaEnd, 0.4));
}

function drawSponsorReel(
  ctx: CanvasRenderingContext2D,
  t: number,
  assets: ReelAssets,
  format: ReelFormat,
  spot: LoadedPlate,
  copy: ReelCopy,
  locale: ReelLocale,
) {
  const hook = scene(t, 0, 2.45, 0.26);
  const bag = scene(t, 2.3, 5.75);
  const cta = scene(t, 5.55, 8.5);
  if (hook) drawSponsorHook(ctx, t, spot, format, hook, copy, locale);
  if (bag) drawSponsorBag(ctx, t, 2.3, spot, assets, format, bag, copy, locale);
  if (cta) drawSponsorCta(ctx, spot, format, cta, copy, locale);
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
  locale: ReelLocale = "es",
) {
  const copy = parseReelCopy(copyInput, locale);
  fillBase(ctx, format.width, format.height);
  if (focus) drawSponsorReel(ctx, t, assets, format, focus, copy, locale);
  else drawGroupReel(ctx, t, assets, format, copy, locale);
}
