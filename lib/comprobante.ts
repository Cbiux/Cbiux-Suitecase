const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
export const COMPROBANTE_MAX_BYTES = Math.round(2.2 * 1024 * 1024);
export const COMPROBANTE_UPLOAD_MAX_BYTES = 8 * 1024 * 1024;

export function parseComprobanteDataUrl(value: string) {
  const trimmed = value.trim();
  const match = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+=*)$/i.exec(trimmed);
  if (!match) throw new Error("BAD_IMAGE");
  const mime = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
  if (!ALLOWED.has(mime)) throw new Error("BAD_IMAGE");
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length) throw new Error("MISSING_COMPROBANTE");
  if (buffer.length > COMPROBANTE_MAX_BYTES) throw new Error("TOO_LARGE");
  return { mime, buffer, dataUrl: `data:${mime};base64,${match[2]}` };
}

function sniffImageMime(bytes: Buffer) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return "";
}

export async function fileToDataUrl(file: File) {
  if (file.size > COMPROBANTE_UPLOAD_MAX_BYTES) throw new Error("TOO_LARGE");
  const bytes = Buffer.from(await file.arrayBuffer());
  let mime = file.type === "image/jpg" ? "image/jpeg" : file.type;
  if (!ALLOWED.has(mime)) mime = sniffImageMime(bytes);
  if (!ALLOWED.has(mime)) throw new Error("BAD_IMAGE");
  if (bytes.length > COMPROBANTE_MAX_BYTES) throw new Error("TOO_LARGE");
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

