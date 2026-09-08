import { ARTWORK_MAX_BYTES } from "./config";

const RASTER = new Set(["image/png", "image/webp", "image/jpeg"]);

function svgLooksSafe(markup: string) {
  return !/<script/i.test(markup) && !/\bon\w+\s*=/i.test(markup) && !/javascript:/i.test(markup);
}

export function parseArtworkDataUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("MISSING_FIELDS");

  const svgUtf = /^data:image\/svg\+xml(?:;charset=utf-8)?,(.*)$/i.exec(trimmed);
  if (svgUtf) {
    const decoded = decodeURIComponent(svgUtf[1]);
    if (!svgLooksSafe(decoded)) throw new Error("BAD_IMAGE");
    const buffer = Buffer.from(decoded, "utf8");
    if (!buffer.length) throw new Error("BAD_IMAGE");
    if (buffer.length > ARTWORK_MAX_BYTES) throw new Error("TOO_LARGE");
    return `data:image/svg+xml;base64,${buffer.toString("base64")}`;
  }

  const match = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+=*)$/i.exec(trimmed);
  if (!match) throw new Error("BAD_IMAGE");
  const mime = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length) throw new Error("BAD_IMAGE");
  if (buffer.length > ARTWORK_MAX_BYTES) throw new Error("TOO_LARGE");

  if (mime === "image/svg+xml") {
    if (!svgLooksSafe(buffer.toString("utf8"))) throw new Error("BAD_IMAGE");
    return `data:image/svg+xml;base64,${match[2]}`;
  }
  if (!RASTER.has(mime)) throw new Error("BAD_IMAGE");
  return `data:${mime};base64,${match[2]}`;
}
