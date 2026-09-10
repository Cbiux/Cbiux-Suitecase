/** Color de “placa” del logo: promedia el borde de la imagen para rellenar letterbox. */

const cache = new Map<string, string>();

export async function sampleLogoPlateColor(src: string): Promise<string> {
  const hit = cache.get(src);
  if (hit) return hit;
  try {
    const image = await loadImage(src);
    const color = plateColorFromImage(image);
    cache.set(src, color);
    return color;
  } catch {
    cache.set(src, "#ffffff");
    return "#ffffff";
  }
}

export function plateColorFromImage(image: HTMLImageElement | HTMLCanvasElement) {
  const width =
    "naturalWidth" in image
      ? image.naturalWidth || image.width
      : image.width;
  const height =
    "naturalHeight" in image
      ? image.naturalHeight || image.height
      : image.height;
  if (!width || !height) return "#ffffff";

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "#ffffff";
  ctx.drawImage(image, 0, 0);
  const { data } = ctx.getImageData(0, 0, width, height);

  const band = Math.max(2, Math.round(Math.min(width, height) * 0.05));
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const onEdge =
        x < band || y < band || x >= width - band || y >= height - band;
      if (!onEdge) continue;
      const i = (y * width + x) * 4;
      if (data[i + 3] < 24) continue;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
  }

  if (n < 12) return "#ffffff";

  r = Math.round(r / n);
  g = Math.round(g / n);
  b = Math.round(b / n);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Snap a negro/blanco limpio cuando el fondo es plano (caso EXC Luxury).
  if (lum < 48) return "#000000";
  if (lum > 232) return "#ffffff";
  return `rgb(${r}, ${g}, ${b})`;
}

export function plateBorderColor(
  plate: string,
  status?: "sold" | "held" | "open",
) {
  if (status === "sold") return "#22c55e";
  if (status === "held") return "#e6b800";
  if (isDarkPlate(plate)) return "rgba(255,255,255,0.22)";
  return "rgba(220,220,220,0.95)";
}

export function isDarkPlate(plate: string) {
  if (plate === "#000000" || plate === "#000") return true;
  const m = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i.exec(plate);
  if (!m) return false;
  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 80;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    if (!src.startsWith("data:") && !src.startsWith("blob:")) {
      image.crossOrigin = "anonymous";
    }
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("LOGO"));
    image.src = src;
  });
}
