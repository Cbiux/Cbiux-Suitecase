import { logoJpegName } from "./logo-file";
import { FACE_ORDER } from "./positions";
import { visiblePlates } from "./spot-groups";
import { srcToJpegBytes } from "./to-jpeg";
import type { Face, LivePosition } from "./types";
import { zipStore } from "./zip-store";

export const LOGO_FACE_FOLDER: Record<Face, string> = {
  front: "frente",
  back: "atras",
  right: "lado",
  left: "contrario",
};

export async function logosZipBlob(positions: LivePosition[]) {
  const plates = visiblePlates(positions).filter((spot) => Boolean(spot.logo));
  const empty = new Uint8Array();
  const files = FACE_ORDER.map((face) => ({
    name: `${LOGO_FACE_FOLDER[face]}/`,
    data: empty,
  }));
  const used = new Set(files.map((file) => file.name));
  for (const spot of plates) {
    const folder = LOGO_FACE_FOLDER[spot.face];
    const base = logoJpegName(spot.sponsor || spot.name, spot.id);
    let name = `${folder}/${base}`;
    let extra = 2;
    while (used.has(name)) {
      name = `${folder}/${base.replace(/\.jpg$/i, `-${extra}.jpg`)}`;
      extra += 1;
    }
    const data = await srcToJpegBytes(spot.logo);
    used.add(name);
    files.push({ name, data });
  }
  return zipStore(files);
}

export async function downloadLogosFolder(positions: LivePosition[]) {
  const blob = await logosZipBlob(positions);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "logos.zip";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
