const COMPROBANTE_UPLOAD_MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "",
  "application/octet-stream",
]);

export async function compressReceipt(file: File): Promise<string> {
  const mime = file.type === "image/jpg" ? "image/jpeg" : file.type;
  if (!ALLOWED.has(mime)) throw new Error("BAD_IMAGE");
  if (file.size > COMPROBANTE_UPLOAD_MAX_BYTES) throw new Error("TOO_LARGE");

  const source = await decodeImage(file);
  const width = source.width;
  const height = source.height;
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("BAD_IMAGE");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ("close" in source) source.close();

  let quality = 0.82;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > 2_700_000 && quality > 0.42) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  if (dataUrl.length > 2_900_000) throw new Error("TOO_LARGE");
  return dataUrl;
}

async function decodeImage(file: File) {
  try {
    return await createImageBitmap(file);
  } catch {
    return loadHtmlImage(file);
  }
}

function loadHtmlImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("BAD_IMAGE"));
    };
    image.src = url;
  });
}
