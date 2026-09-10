import type { Face, PositionCatalog } from "./types";

export const FACE_ORDER: Face[] = ["front", "back", "right", "left"];

export const TRIP = {
  window: "20 Sep – early Nov 2026",
  salesClose: "10 Oct 2026",
  artworkDays: 5,
  startPrice: 45,
  spotCount: 22,
} as const;

/**
 * Coordenadas en % del foto (no cm).
 * El aspect del rectángulo en pantalla debe respetar cmW/cmH
 * compensando que 1% ancho ≠ 1% alto (foto 1168×1346).
 *
 *   width% / height% = (cmW / cmH) * (photoH / photoW)
 */
const FRONT_PHOTO = { w: 1168, h: 1346 } as const;
const FRONT_PCT_RATIO = FRONT_PHOTO.h / FRONT_PHOTO.w; // ~1.152

function frontBox(cmW: number, cmH: number, widthPct: number) {
  const heightPct = widthPct / ((cmW / cmH) * FRONT_PCT_RATIO);
  return { width: widthPct, height: Number(heightPct.toFixed(2)) };
}

const FRONT = {
  x: 23.8,
  bannerW: 52.8,
  cellW: 25.7,
  rightX: 50.9,
  // Antes bannerH 12.4 → ratio ~4.3:1 (aplastado). 40×15 real ≈ 2.67:1 → ~17.2%
  ...(() => {
    const banner = frontBox(40, 15, 52.8);
    const cell = frontBox(17, 12, 25.7);
    const bannerY = 27.6;
    const gap = 1.05;
    const row0 = bannerY + banner.height + gap;
    const row1 = row0 + cell.height + gap;
    const row2 = row1 + cell.height + gap;
    return {
      bannerH: banner.height,
      cellH: cell.height,
      bannerY,
      rowsY: [row0, row1, row2].map((y) => Number(y.toFixed(2))),
    };
  })(),
} as const;

const SIDE_PHOTO = { w: 768, h: 1024 } as const;
const SIDE_PCT_RATIO = SIDE_PHOTO.h / SIDE_PHOTO.w; // ~1.333

function sideBox(cmW: number, cmH: number, widthPct: number) {
  const heightPct = widthPct / ((cmW / cmH) * SIDE_PCT_RATIO);
  return { width: widthPct, height: Number(heightPct.toFixed(2)) };
}

const SIDE = {
  leftX: 33.8,
  rightX: 50.4,
  w: 16.0,
  // 10×10 cm en foto lateral: antes h=21.2 (muy alto). Cuadrado real ≈ 12.0%
  ...(() => {
    const cell = sideBox(10, 10, 16.0);
    const topY = 31.5;
    const gap = 8.5;
    return {
      h: cell.height,
      topY,
      bottomY: Number((topY + cell.height + gap).toFixed(2)),
    };
  })(),
} as const;

export const POSITION_CATALOG: PositionCatalog[] = [
  {
    id: 1,
    face: "front",
    price: 280,
    size: "40 × 15 cm",
    tier: "presenting",
    x: FRONT.x,
    y: FRONT.bannerY,
    width: FRONT.bannerW,
    height: FRONT.bannerH,
  },
  {
    id: 2,
    face: "front",
    price: 150,
    size: "17 × 12 cm",
    tier: "premium",
    x: FRONT.x,
    y: FRONT.rowsY[0],
    width: FRONT.cellW,
    height: FRONT.cellH,
  },
  {
    id: 3,
    face: "front",
    price: 145,
    size: "17 × 12 cm",
    tier: "premium",
    x: FRONT.rightX,
    y: FRONT.rowsY[0],
    width: FRONT.cellW,
    height: FRONT.cellH,
  },
  {
    id: 4,
    face: "front",
    price: 125,
    size: "17 × 12 cm",
    tier: "premium",
    x: FRONT.x,
    y: FRONT.rowsY[1],
    width: FRONT.cellW,
    height: FRONT.cellH,
  },
  {
    id: 5,
    face: "front",
    price: 120,
    size: "17 × 12 cm",
    tier: "premium",
    x: FRONT.rightX,
    y: FRONT.rowsY[1],
    width: FRONT.cellW,
    height: FRONT.cellH,
  },
  {
    id: 19,
    face: "front",
    price: 110,
    size: "17 × 12 cm",
    tier: "premium",
    x: FRONT.x,
    y: FRONT.rowsY[2],
    width: FRONT.cellW,
    height: FRONT.cellH,
  },
  {
    id: 20,
    face: "front",
    price: 105,
    size: "17 × 12 cm",
    tier: "premium",
    x: FRONT.rightX,
    y: FRONT.rowsY[2],
    width: FRONT.cellW,
    height: FRONT.cellH,
  },
  {
    id: 6,
    face: "back",
    price: 200,
    size: "40 × 15 cm",
    tier: "premium",
    x: FRONT.x,
    y: FRONT.bannerY,
    width: FRONT.bannerW,
    height: FRONT.bannerH,
  },
  {
    id: 7,
    face: "back",
    price: 95,
    size: "17 × 12 cm",
    tier: "mid",
    x: FRONT.x,
    y: FRONT.rowsY[0],
    width: FRONT.cellW,
    height: FRONT.cellH,
  },
  {
    id: 8,
    face: "back",
    price: 90,
    size: "17 × 12 cm",
    tier: "mid",
    x: FRONT.rightX,
    y: FRONT.rowsY[0],
    width: FRONT.cellW,
    height: FRONT.cellH,
  },
  {
    id: 9,
    face: "back",
    price: 85,
    size: "17 × 12 cm",
    tier: "mid",
    x: FRONT.x,
    y: FRONT.rowsY[1],
    width: FRONT.cellW,
    height: FRONT.cellH,
  },
  {
    id: 10,
    face: "back",
    price: 75,
    size: "17 × 12 cm",
    tier: "mid",
    x: FRONT.rightX,
    y: FRONT.rowsY[1],
    width: FRONT.cellW,
    height: FRONT.cellH,
  },
  {
    id: 21,
    face: "back",
    price: 70,
    size: "17 × 12 cm",
    tier: "mid",
    x: FRONT.x,
    y: FRONT.rowsY[2],
    width: FRONT.cellW,
    height: FRONT.cellH,
  },
  {
    id: 22,
    face: "back",
    price: 60,
    size: "17 × 12 cm",
    tier: "mid",
    x: FRONT.rightX,
    y: FRONT.rowsY[2],
    width: FRONT.cellW,
    height: FRONT.cellH,
  },
  {
    id: 11,
    face: "left",
    price: 65,
    size: "10 × 10 cm",
    tier: "side",
    x: SIDE.leftX,
    y: SIDE.topY,
    width: SIDE.w,
    height: SIDE.h,
  },
  {
    id: 12,
    face: "left",
    price: 55,
    size: "10 × 10 cm",
    tier: "side",
    x: SIDE.rightX,
    y: SIDE.topY,
    width: SIDE.w,
    height: SIDE.h,
  },
  {
    id: 13,
    face: "left",
    price: 50,
    size: "10 × 10 cm",
    tier: "side",
    x: SIDE.leftX,
    y: SIDE.bottomY,
    width: SIDE.w,
    height: SIDE.h,
  },
  {
    id: 14,
    face: "left",
    price: 45,
    size: "10 × 10 cm",
    tier: "side",
    x: SIDE.rightX,
    y: SIDE.bottomY,
    width: SIDE.w,
    height: SIDE.h,
  },
  {
    id: 15,
    face: "right",
    price: 65,
    size: "10 × 10 cm",
    tier: "side",
    x: SIDE.leftX,
    y: SIDE.topY,
    width: SIDE.w,
    height: SIDE.h,
  },
  {
    id: 16,
    face: "right",
    price: 55,
    size: "10 × 10 cm",
    tier: "side",
    x: SIDE.rightX,
    y: SIDE.topY,
    width: SIDE.w,
    height: SIDE.h,
  },
  {
    id: 17,
    face: "right",
    price: 50,
    size: "10 × 10 cm",
    tier: "side",
    x: SIDE.leftX,
    y: SIDE.bottomY,
    width: SIDE.w,
    height: SIDE.h,
  },
  {
    id: 18,
    face: "right",
    price: 45,
    size: "10 × 10 cm",
    tier: "side",
    x: SIDE.rightX,
    y: SIDE.bottomY,
    width: SIDE.w,
    height: SIDE.h,
  },
];

export function padSpot(id: number) {
  return String(id).padStart(2, "0");
}

export function getCatalogById(id: number) {
  return POSITION_CATALOG.find((position) => position.id === id);
}

export function artworkSpec(size: string) {
  const match = /(\d+)\s*[×x]\s*(\d+)/i.exec(size);
  const cmW = match ? Number(match[1]) : 17;
  const cmH = match ? Number(match[2]) : 12;
  const pxW = Math.round((cmW / 2.54) * 300 / 50) * 50;
  const pxH = Math.round((cmH / 2.54) * 300 / 50) * 50;
  return {
    cmW,
    cmH,
    pxW,
    pxH,
    sizeLabel: `${cmW} × ${cmH} cm`,
    pixelLabel: `${pxW} × ${pxH} px`,
  };
}
