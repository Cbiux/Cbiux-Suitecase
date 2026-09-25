import type { Face, PositionCatalog } from "./types";

export const FACE_ORDER: Face[] = ["front", "back", "right", "left"];

export const TRIP = {
  window: "20 Sep – early Nov 2026",
  salesClose: "10 Oct 2026",
  artworkDays: 5,
  startPrice: 45,
  spotCount: 34,
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
  leftX: 34.6,
  rightX: 50.0,
  w: 14.6,
  // 10×10 cm. 2×5 cubre hasta las ruedas (la 5ª fila es el hueco que quedaba abajo).
  ...(() => {
    const cell = sideBox(10, 10, 14.6);
    const topY = 30;
    const gap = 0.32;
    return {
      h: cell.height,
      rowsY: [0, 1, 2, 3, 4].map((row) =>
        Number((topY + row * (cell.height + gap)).toFixed(2)),
      ),
    };
  })(),
} as const;

function sideSpot(
  id: number,
  face: Face,
  price: number,
  col: 0 | 1,
  row: 0 | 1 | 2 | 3 | 4,
): PositionCatalog {
  return {
    id,
    face,
    price,
    size: "10 × 10 cm",
    tier: "side",
    x: col === 0 ? SIDE.leftX : SIDE.rightX,
    y: SIDE.rowsY[row],
    width: SIDE.w,
    height: SIDE.h,
  };
}

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
  // Vendidos con el layout de 4: se mantienen esos precios.
  sideSpot(11, "left", 65, 0, 0),
  sideSpot(12, "left", 55, 1, 0),
  sideSpot(23, "left", 55, 0, 1),
  sideSpot(24, "left", 50, 1, 1),
  sideSpot(25, "left", 50, 0, 2),
  sideSpot(26, "left", 45, 1, 2),
  sideSpot(13, "left", 50, 0, 3),
  sideSpot(14, "left", 45, 1, 3),
  sideSpot(31, "left", 45, 0, 4),
  sideSpot(32, "left", 45, 1, 4),
  sideSpot(15, "right", 60, 0, 0),
  sideSpot(16, "right", 55, 1, 0),
  sideSpot(27, "right", 55, 0, 1),
  sideSpot(28, "right", 50, 1, 1),
  sideSpot(29, "right", 50, 0, 2),
  sideSpot(30, "right", 45, 1, 2),
  sideSpot(17, "right", 50, 0, 3),
  sideSpot(18, "right", 45, 1, 3),
  sideSpot(33, "right", 45, 0, 4),
  sideSpot(34, "right", 45, 1, 4),
];

export function padSpot(id: number) {
  return String(id).padStart(2, "0");
}

export function getCatalogById(id: number) {
  return POSITION_CATALOG.find((position) => position.id === id);
}

export function artworkSpec(size: string) {
  const match = /(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)/i.exec(size);
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
