import { SITE } from "./config";
import { slugBrand } from "./logo-file";
import { POSITION_CATALOG, getCatalogById, padSpot } from "./positions";
import type { Face, Locale, PositionCatalog } from "./types";
import {
  BLUE,
  MUTED,
  NAVY,
  WHITE,
  canvasToPng,
  drawCbiuxMark,
  drawContained,
  loadImage,
  makePosterCanvas,
  roundRect,
  thanksBrand,
} from "./poster-kit";

const FACE_PHOTO: Record<Face, { src: string; mirror: boolean }> = {
  front: { src: "/suitcase-front.png", mirror: false },
  back: { src: "/suitcase-front.png", mirror: true },
  right: { src: "/suitcase-side.png", mirror: false },
  left: { src: "/suitcase-side.png", mirror: true },
};

const FACE_LABEL: Record<Locale, Record<Face, string>> = {
  es: {
    front: "frente",
    back: "atrás",
    left: "lado contrario",
    right: "lado",
  },
  en: {
    front: "front",
    back: "back",
    left: "opposite side",
    right: "side",
  },
};

export function spotFilename(sponsor: string, positionId: number) {
  return `cbiux-espacio-${padSpot(positionId)}-${slugBrand(sponsor)}.png`;
}

export function spotCaption(sponsor: string, positionId: number, locale: Locale = "es") {
  const brand = thanksBrand(sponsor, "");
  const spot = padSpot(positionId);
  const catalog = getCatalogById(positionId);
  const face = catalog ? FACE_LABEL[locale][catalog.face] : locale === "en" ? "the bag" : "la maleta";
  const size = catalog?.size ?? "";
  if (locale === "en") {
    return `This is my space on @${SITE.x}'s cabin bag.

${brand} · spot ${spot} · ${face}${size ? ` · ${size}` : ""}.
Traveling from Costa Rica to Compile Amsterdam, Europe and Devcon India.

Daily vlog of the whole trip.`;
  }
  return `Este es mi espacio en la maleta de cabina de @${SITE.x}.

${brand} · posición ${spot} · ${face}${size ? ` · ${size}` : ""}.
Viaja de Costa Rica a Compile Amsterdam, Europa y Devcon India.

Vlog diario de todo el trip.`;
}

export async function renderSpotPng(input: {
  brand: string;
  positionId: number;
  logoSrc: string;
}) {
  const catalog = getCatalogById(input.positionId);
  if (!catalog) throw new Error("SPOT");
  await document.fonts.ready;
  const photo = FACE_PHOTO[catalog.face];
  const [logo, suitcase] = await Promise.all([loadImage(input.logoSrc), loadImage(photo.src)]);
  const { canvas, ctx } = makePosterCanvas();

  drawCbiuxMark(ctx, 72, 44, 52);
  ctx.fillStyle = BLUE;
  ctx.font = "700 20px Inter, system-ui, sans-serif";
  ctx.letterSpacing = "4px";
  ctx.textAlign = "left";
  ctx.fillText("cbiux", 138, 78);

  ctx.fillStyle = MUTED;
  ctx.font = "700 20px 'JetBrains Mono', ui-monospace, monospace";
  ctx.letterSpacing = "3px";
  ctx.textAlign = "right";
  ctx.fillText(FACE_LABEL.es[catalog.face].toUpperCase(), 1008, 78);

  ctx.textAlign = "left";
  ctx.letterSpacing = "5px";
  ctx.fillStyle = BLUE;
  ctx.font = "700 22px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillText("ESTE ES MI ESPACIO", 72, 148);

  ctx.letterSpacing = "0px";
  ctx.fillStyle = NAVY;
  const titleSize = brandSize(input.brand);
  ctx.font = `800 ${titleSize}px Inter, system-ui, sans-serif`;
  const brandLines = wrapText(ctx, input.brand, 936);
  brandLines.forEach((line, index) => {
    ctx.fillText(line, 72, 214 + index * (titleSize + 6), 936);
  });

  const metaY = 214 + (brandLines.length - 1) * (titleSize + 6) + 40;
  ctx.fillStyle = MUTED;
  ctx.font = "600 24px Inter, system-ui, sans-serif";
  ctx.fillText(
    `posición ${padSpot(catalog.id)}  ·  ${FACE_LABEL.es[catalog.face]}  ·  ${catalog.size}`,
    72,
    metaY,
  );

  const view = { x: 48, y: metaY + 28, w: 984, h: 1128 - (metaY + 28) };
  drawMockup(ctx, {
    suitcase,
    logo,
    catalog,
    mirror: photo.mirror,
    view,
  });

  ctx.textAlign = "left";
  ctx.letterSpacing = "0px";
  ctx.fillStyle = NAVY;
  ctx.font = "600 28px Inter, system-ui, sans-serif";
  ctx.fillText("en la maleta de cabina de Cbiux", 72, 1158);
  ctx.fillStyle = MUTED;
  ctx.font = "500 24px Inter, system-ui, sans-serif";
  ctx.fillText("Costa Rica → Europa → India", 72, 1198);

  ctx.fillStyle = BLUE;
  ctx.font = "700 22px Inter, system-ui, sans-serif";
  ctx.letterSpacing = "1.4px";
  ctx.fillText(`@${SITE.x}`, 72, 1288);

  ctx.fillStyle = MUTED;
  ctx.font = "600 20px Inter, system-ui, sans-serif";
  ctx.letterSpacing = "0px";
  ctx.textAlign = "right";
  ctx.fillText("cbiux-suitcase.vercel.app", 1008, 1288);

  const blob = await canvasToPng(canvas);
  if (!blob) throw new Error("PNG");
  return blob;
}

function drawMockup(
  ctx: CanvasRenderingContext2D,
  input: {
    suitcase: HTMLImageElement;
    logo: HTMLImageElement;
    catalog: PositionCatalog;
    mirror: boolean;
    view: { x: number; y: number; w: number; h: number };
  },
) {
  const { suitcase, logo, catalog, mirror, view } = input;
  const bagW = suitcase.naturalWidth || suitcase.width;
  const bagH = suitcase.naturalHeight || suitcase.height;
  const target = pctRect(catalog, bagW, bagH, mirror);
  const zoom = fitZoom(catalog, target, view);
  const neighbors = POSITION_CATALOG.filter((spot) => spot.face === catalog.face && spot.id !== catalog.id);

  roundRect(ctx, view.x, view.y, view.w, view.h, 36);
  ctx.fillStyle = "#070707";
  ctx.fill();

  ctx.save();
  roundRect(ctx, view.x, view.y, view.w, view.h, 36);
  ctx.clip();
  ctx.translate(zoom.destCx, zoom.destCy);
  ctx.scale(zoom.scale, zoom.scale);
  ctx.translate(-zoom.cx, -zoom.cy);

  drawBag(ctx, suitcase, bagW, bagH, mirror);

  ctx.fillStyle = "rgba(0,0,0,0.46)";
  ctx.fillRect(0, 0, bagW, bagH);

  for (const spot of neighbors) {
    const rect = pctRect(spot, bagW, bagH, mirror);
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, plateRadius(rect, spot.face));
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fill();
  }

  const plate = plateRadius(target, catalog.face);
  roundRect(ctx, target.x, target.y, target.w, target.h, plate);
  ctx.fillStyle = WHITE;
  ctx.fill();
  drawContained(ctx, logo, target.x + 2, target.y + 2, target.w - 4, target.h - 4);
  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = Math.max(5, Math.min(target.w, target.h) * 0.045);
  ctx.stroke();
  ctx.restore();

  const screen = {
    x: zoom.destCx + (target.x - zoom.cx) * zoom.scale,
    y: zoom.destCy + (target.y - zoom.cy) * zoom.scale,
    w: target.w * zoom.scale,
    h: target.h * zoom.scale,
  };

  ctx.save();
  roundRect(ctx, view.x, view.y, view.w, view.h, 36);
  ctx.clip();
  ctx.shadowColor = "rgba(44, 63, 209, 0.55)";
  ctx.shadowBlur = 32;
  roundRect(ctx, screen.x, screen.y, screen.w, screen.h, Math.min(22, screen.w * 0.12, screen.h * 0.12));
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.restore();

  drawSpotBadge(ctx, view, screen, padSpot(catalog.id));
  drawMinimap(ctx, {
    suitcase,
    catalog,
    mirror,
    view,
    screen,
  });
}

function fitZoom(
  catalog: PositionCatalog,
  spot: { x: number; y: number; w: number; h: number },
  view: { x: number; y: number; w: number; h: number },
) {
  const coverW = catalog.width >= 40 ? 0.78 : catalog.width >= 22 ? 0.64 : 0.7;
  const coverH = catalog.width >= 40 ? 0.3 : 0.72;
  const scale = Math.min(Math.min((view.w * coverW) / spot.w, (view.h * coverH) / spot.h), 3.2);
  return {
    scale: Math.max(scale, 1.18),
    cx: spot.x + spot.w / 2,
    cy: spot.y + spot.h / 2,
    destCx: view.x + view.w / 2,
    destCy: view.y + view.h * 0.5,
  };
}

function drawMinimap(
  ctx: CanvasRenderingContext2D,
  input: {
    suitcase: HTMLImageElement;
    catalog: PositionCatalog;
    mirror: boolean;
    view: { x: number; y: number; w: number; h: number };
    screen: { x: number; y: number; w: number; h: number };
  },
) {
  const cardW = 156;
  const cardH = 204;
  const leftGap = input.screen.x - input.view.x;
  const rightGap = input.view.x + input.view.w - (input.screen.x + input.screen.w);
  const card = {
    x: rightGap > leftGap ? input.view.x + input.view.w - cardW - 18 : input.view.x + 18,
    y: input.view.y + input.view.h - cardH - 18,
    w: cardW,
    h: cardH,
  };
  roundRect(ctx, card.x, card.y, card.w, card.h, 22);
  ctx.fillStyle = "rgba(247,247,244,0.94)";
  ctx.fill();
  ctx.strokeStyle = "rgba(11,27,74,0.08)";
  ctx.lineWidth = 1;
  ctx.stroke();

  const bagW = input.suitcase.naturalWidth || input.suitcase.width;
  const bagH = input.suitcase.naturalHeight || input.suitcase.height;
  const inner = { x: card.x + 10, y: card.y + 28, w: card.w - 20, h: card.h - 38 };
  const fitted = containRect(bagW, bagH, inner);
  drawBag(ctx, input.suitcase, fitted.w, fitted.h, input.mirror, fitted.x, fitted.y);

  for (const spot of POSITION_CATALOG.filter((item) => item.face === input.catalog.face)) {
    const rect = pctRect(spot, fitted.w, fitted.h, input.mirror);
    const x = fitted.x + rect.x;
    const y = fitted.y + rect.y;
    roundRect(ctx, x, y, rect.w, rect.h, plateRadius(rect, spot.face) * 0.45);
    if (spot.id === input.catalog.id) {
      ctx.fillStyle = BLUE;
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fill();
    }
  }

  ctx.fillStyle = BLUE;
  ctx.font = "700 11px 'JetBrains Mono', ui-monospace, monospace";
  ctx.letterSpacing = "1.4px";
  ctx.textAlign = "left";
  ctx.fillText("MALETA", card.x + 14, card.y + 20);
}

function drawSpotBadge(
  ctx: CanvasRenderingContext2D,
  view: { x: number; y: number; w: number; h: number },
  spot: { x: number; y: number; w: number; h: number },
  label: string,
) {
  const w = 118;
  const h = 40;
  const x = Math.min(Math.max(spot.x + spot.w - w + 8, view.x + 16), view.x + view.w - w - 16);
  const y = Math.min(Math.max(spot.y - 16, view.y + 16), view.y + view.h - h - 16);
  roundRect(ctx, x, y, w, h, 20);
  ctx.fillStyle = BLUE;
  ctx.fill();
  ctx.fillStyle = WHITE;
  ctx.font = "700 18px 'JetBrains Mono', ui-monospace, monospace";
  ctx.letterSpacing = "1px";
  ctx.textAlign = "center";
  ctx.fillText(label, x + w / 2, y + 27);
}

function drawBag(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  w: number,
  h: number,
  mirror: boolean,
  x = 0,
  y = 0,
) {
  if (mirror) {
    ctx.save();
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(image, 0, 0, w, h);
    ctx.restore();
    return;
  }
  ctx.drawImage(image, x, y, w, h);
}

function pctRect(spot: PositionCatalog, w: number, h: number, mirror: boolean) {
  const left = mirror ? 100 - spot.x - spot.width : spot.x;
  return {
    x: (left / 100) * w,
    y: (spot.y / 100) * h,
    w: (spot.width / 100) * w,
    h: (spot.height / 100) * h,
  };
}

function plateRadius(rect: { w: number; h: number }, face: Face) {
  const base = face === "left" || face === "right" ? 0.18 : 0.12;
  return Math.min(rect.w, rect.h) * base;
}

function containRect(nw: number, nh: number, box: { x: number; y: number; w: number; h: number }) {
  const scale = Math.min(box.w / nw, box.h / nh);
  const w = nw * scale;
  const h = nh * scale;
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}

function brandSize(brand: string) {
  if (brand.length > 22) return 44;
  if (brand.length > 14) return 54;
  return 62;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(next).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 2);
}
