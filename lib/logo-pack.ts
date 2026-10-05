import { artworkFileMeta } from "./logo-file";
import { FACE_ORDER } from "./positions";
import { visiblePlates } from "./spot-groups";
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
    const meta = artworkFileMeta(spot.logo, spot.sponsor || spot.name, spot.id);
    let name = `${folder}/${meta.filename}`;
    let extra = 2;
    while (used.has(name)) {
      name = `${folder}/${meta.filename.replace(/(\.[a-z0-9]+)$/i, `-${extra}$1`)}`;
      extra += 1;
    }
    const data = await artworkBytes(spot.logo);
    used.add(name);
    files.push({ name, data });
  }
  return zipStore(files);
}

async function artworkBytes(src: string) {
  if (src.startsWith("data:")) {
    const comma = src.indexOf(",");
    if (comma === -1) throw new Error("logo inválido");
    const header = src.slice(0, comma);
    const body = src.slice(comma + 1);
    if (/;base64/i.test(header)) {
      const binary = atob(body);
      const out = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
      return out;
    }
    return new TextEncoder().encode(decodeURIComponent(body));
  }
  const response = await fetch(src);
  if (!response.ok) throw new Error("logo inválido");
  return new Uint8Array(await response.arrayBuffer());
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
