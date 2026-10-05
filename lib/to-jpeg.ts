import { canvasToJpeg, loadImage } from "./poster-kit";

const JPEG_QUALITY = 0.92;
const JPEG_BG = "#ffffff";

export async function srcToJpegBlob(src: string, quality = JPEG_QUALITY) {
  const image = await loadImage(src);
  const width = Math.max(1, image.naturalWidth || image.width);
  const height = Math.max(1, image.naturalHeight || image.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CANVAS");
  ctx.fillStyle = JPEG_BG;
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  const blob = await canvasToJpeg(canvas, quality);
  if (!blob) throw new Error("JPEG");
  return blob;
}

export async function srcToJpegBytes(src: string, quality = JPEG_QUALITY) {
  return new Uint8Array(await (await srcToJpegBlob(src, quality)).arrayBuffer());
}
