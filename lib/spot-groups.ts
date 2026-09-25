import { artworkSpec, POSITION_CATALOG } from "./positions";
import type { Face, LivePosition, PositionCatalog } from "./types";

const ADJACENT_GAP = 1.8;

export type SpotBox = {
  id: number;
  face: Face;
  x: number;
  y: number;
  width: number;
  height: number;
  size: string;
};

export type DisplayPlate = LivePosition & { memberIds: number[] };

export function mergeHostOf(spot: { id: number; mergeGroup?: number }) {
  return spot.mergeGroup && spot.mergeGroup > 0 ? spot.mergeGroup : 0;
}

export function boxesAdjacent(a: SpotBox, b: SpotBox) {
  if (a.face !== b.face || a.id === b.id) return false;
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;
  const overlapX = Math.min(ax2, bx2) - Math.max(a.x, b.x);
  const overlapY = Math.min(ay2, by2) - Math.max(a.y, b.y);
  const touchX = Math.abs(ax2 - b.x) <= ADJACENT_GAP || Math.abs(bx2 - a.x) <= ADJACENT_GAP;
  const touchY = Math.abs(ay2 - b.y) <= ADJACENT_GAP || Math.abs(by2 - a.y) <= ADJACENT_GAP;
  return (touchX && overlapY > 2) || (touchY && overlapX > 2);
}

export function aabb(boxes: SpotBox[]): SpotBox {
  const first = boxes[0];
  const x = Math.min(...boxes.map((box) => box.x));
  const y = Math.min(...boxes.map((box) => box.y));
  const x2 = Math.max(...boxes.map((box) => box.x + box.width));
  const y2 = Math.max(...boxes.map((box) => box.y + box.height));
  return {
    id: first.id,
    face: first.face,
    x,
    y,
    width: x2 - x,
    height: y2 - y,
    size: combinedSize(boxes),
  };
}

export function combinedSize(boxes: SpotBox[]) {
  if (boxes.length === 1) return boxes[0].size;
  const specs = boxes.map((box) => artworkSpec(box.size));
  const sameRow = boxes.every((box) => Math.abs(box.y - boxes[0].y) < 1);
  const sameCol = boxes.every((box) => Math.abs(box.x - boxes[0].x) < 1);
  if (sameRow) {
    const cmW = roundCm(specs.reduce((sum, spec) => sum + spec.cmW, 0));
    const cmH = roundCm(Math.max(...specs.map((spec) => spec.cmH)));
    return `${formatCm(cmW)} × ${formatCm(cmH)} cm`;
  }
  if (sameCol) {
    const cmW = roundCm(Math.max(...specs.map((spec) => spec.cmW)));
    const cmH = roundCm(specs.reduce((sum, spec) => sum + spec.cmH, 0));
    return `${formatCm(cmW)} × ${formatCm(cmH)} cm`;
  }
  const box = {
    width: Math.max(...boxes.map((item) => item.x + item.width)) - Math.min(...boxes.map((item) => item.x)),
    height: Math.max(...boxes.map((item) => item.y + item.height)) - Math.min(...boxes.map((item) => item.y)),
  };
  const ref = boxes[0];
  const spec = artworkSpec(ref.size);
  const cmW = roundCm(spec.cmW * (box.width / Math.max(ref.width, 0.01)));
  const cmH = roundCm(spec.cmH * (box.height / Math.max(ref.height, 0.01)));
  return `${formatCm(cmW)} × ${formatCm(cmH)} cm`;
}

export function neighborIds(positionId: number) {
  const catalog = POSITION_CATALOG.find((item) => item.id === positionId);
  if (!catalog) return [];
  return POSITION_CATALOG.filter((item) => boxesAdjacent(catalog, item)).map((item) => item.id);
}

export function canGlueCatalog(ids: number[]) {
  const unique = [...new Set(ids)].sort((a, b) => a - b);
  if (unique.length < 2) return { ok: false as const, error: "NEED_TWO" };
  const boxes = unique.map((id) => POSITION_CATALOG.find((item) => item.id === id));
  if (boxes.some((item) => !item)) return { ok: false as const, error: "UNKNOWN_POSITION" };
  const members = boxes as PositionCatalog[];
  if (new Set(members.map((item) => item.face)).size > 1) {
    return { ok: false as const, error: "NOT_SAME_FACE" };
  }
  if (!isConnected(members)) return { ok: false as const, error: "NOT_ADJACENT" };
  if (!isFilledRectangle(members)) return { ok: false as const, error: "NOT_RECTANGLE" };
  return { ok: true as const, host: unique[0], members };
}

export function visiblePlates(positions: LivePosition[]): DisplayPlate[] {
  const used = new Set<number>();
  const plates: DisplayPlate[] = [];
  for (const spot of positions) {
    if (used.has(spot.id)) continue;
    const hostId = mergeHostOf(spot);
    if (!hostId) {
      used.add(spot.id);
      plates.push({ ...spot, memberIds: [spot.id] });
      continue;
    }
    const members = positions.filter((item) => mergeHostOf(item) === hostId);
    if (members.length < 2) {
      used.add(spot.id);
      plates.push({ ...spot, mergeGroup: 0, memberIds: [spot.id] });
      continue;
    }
    members.forEach((item) => used.add(item.id));
    const host = members.find((item) => item.id === hostId) ?? members[0];
    const box = aabb(members);
    const logo = host.logo || members.find((item) => item.logo)?.logo || "";
    const sponsor = host.sponsor || members.find((item) => item.sponsor)?.sponsor || "";
    const comprobante = host.comprobante || members.find((item) => item.comprobante)?.comprobante || "";
    plates.push({
      ...host,
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      size: box.size,
      logo,
      sponsor,
      comprobante,
      memberIds: members.map((item) => item.id).sort((a, b) => a - b),
    });
  }
  return plates;
}

export function groupedMemberIds(positions: LivePosition[], positionId: number) {
  const spot = positions.find((item) => item.id === positionId);
  if (!spot) return [positionId];
  const host = mergeHostOf(spot);
  if (!host) return [positionId];
  const members = positions.filter((item) => mergeHostOf(item) === host).map((item) => item.id);
  return members.length ? members.sort((a, b) => a - b) : [positionId];
}

export function plateContaining(positions: LivePosition[], positionId: number) {
  return visiblePlates(positions).find((plate) => plate.memberIds.includes(positionId));
}

function isConnected(members: PositionCatalog[]) {
  const remaining = new Set(members.map((item) => item.id));
  const start = members[0];
  const queue = [start.id];
  remaining.delete(start.id);
  while (queue.length) {
    const currentId = queue.shift();
    const current = members.find((item) => item.id === currentId);
    if (!current) continue;
    for (const other of members) {
      if (!remaining.has(other.id)) continue;
      if (!boxesAdjacent(current, other)) continue;
      remaining.delete(other.id);
      queue.push(other.id);
    }
  }
  return remaining.size === 0;
}

function isFilledRectangle(members: PositionCatalog[]) {
  const face = members[0].face;
  const box = aabb(members);
  const inside = POSITION_CATALOG.filter((item) => {
    if (item.face !== face) return false;
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    return cx >= box.x - 0.4 && cx <= box.x + box.width + 0.4 && cy >= box.y - 0.4 && cy <= box.y + box.height + 0.4;
  });
  const ids = new Set(members.map((item) => item.id));
  return inside.every((item) => ids.has(item.id));
}

function roundCm(value: number) {
  return Math.round(value * 10) / 10;
}

function formatCm(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}
