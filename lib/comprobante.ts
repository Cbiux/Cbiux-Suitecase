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

export async function fileToDataUrl(file: File) {
  const mime = file.type === "image/jpg" ? "image/jpeg" : file.type;
  if (!ALLOWED.has(mime)) throw new Error("BAD_IMAGE");
  if (file.size > COMPROBANTE_UPLOAD_MAX_BYTES) throw new Error("TOO_LARGE");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length > COMPROBANTE_MAX_BYTES) throw new Error("TOO_LARGE");
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

