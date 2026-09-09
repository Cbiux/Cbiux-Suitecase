import { padSpot } from "./positions";

export function artworkFileMeta(
  dataUrl: string,
  sponsor = "",
  positionId = 0,
  kind: "logo" | "comprobante" = "logo",
) {
  const trimmed = dataUrl.trim();
  const utf = /^data:image\/svg\+xml(?:;charset=utf-8)?,/i.test(trimmed);
  const match = /^data:(image\/[a-z0-9.+-]+);base64,/i.exec(trimmed);
  const mime = utf
    ? "image/svg+xml"
    : match?.[1].toLowerCase() === "image/jpg"
      ? "image/jpeg"
      : (match?.[1].toLowerCase() ?? "image/png");
  const ext = mime.includes("svg")
    ? "svg"
    : mime.includes("webp")
      ? "webp"
      : mime.includes("jpeg")
        ? "jpg"
        : "png";
  const brand = slugBrand(sponsor);
  const spot = positionId ? padSpot(positionId) : "00";
  const filename =
    kind === "comprobante"
      ? `cbiux-${spot}-${brand}-comprobante.${ext}`
      : `cbiux-${spot}-${brand}.${ext}`;
  return {
    mime,
    ext,
    filename,
  };
}

export function decodeArtwork(dataUrl: string) {
  const trimmed = dataUrl.trim();
  const utf = /^data:image\/svg\+xml(?:;charset=utf-8)?,(.*)$/i.exec(trimmed);
  if (utf) {
    const buffer = Buffer.from(decodeURIComponent(utf[1]), "utf8");
    return { mime: "image/svg+xml" as const, buffer };
  }
  const match = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+=*)$/i.exec(trimmed);
  if (!match) return null;
  const mime = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
  return { mime, buffer: Buffer.from(match[2], "base64") };
}

function slugBrand(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "logo";
}
