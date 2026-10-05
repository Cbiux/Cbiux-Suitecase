import { SITE } from "./config";

export const REEL_DURATION = 17.6;
export const SPONSOR_REEL_DURATION = 8.4;
export const REEL_FPS = 30;

export const REEL_FORMATS = [
  { id: "reels", label: "Reels / TikTok 9:16", width: 1080, height: 1920, file: "cbiux-maleta-partners-9x16" },
  { id: "feed", label: "Feed Instagram 4:5", width: 1080, height: 1350, file: "cbiux-maleta-partners-4x5" },
  { id: "square", label: "Cuadrado 1:1", width: 1080, height: 1080, file: "cbiux-maleta-partners-1x1" },
] as const;

export type ReelFormatId = (typeof REEL_FORMATS)[number]["id"];
export type ReelFormat = (typeof REEL_FORMATS)[number];

export function reelFormat(id: ReelFormatId) {
  return REEL_FORMATS.find((item) => item.id === id) ?? REEL_FORMATS[0];
}

export function reelCaption(input: {
  sold: number;
  brands: string[];
}) {
  const brands = input.brands.slice(0, 12);
  const extra = input.brands.length - brands.length;
  const list = brands.join(", ") + (extra > 0 ? ` y ${extra} más` : "");
  return `Gracias a las ${input.sold} marcas que apoyaron este viaje.

${list}.

Su logo va conmigo, en físico, a Compile Amsterdam, Lisboa y Devcon. La maleta ya está llena por ustedes.

@${SITE.x}`;
}

export function sponsorReelCaption(brand: string) {
  return `Gracias, ${brand}.

Esta marca apoyó mi maleta de cabina. Su logo viaja conmigo, en físico, a Compile Amsterdam, Lisboa y Devcon.

Etiquetálos. Este video es por ellos.

@${SITE.x}`;
}

export function pickRecorderMime() {
  if (typeof MediaRecorder === "undefined") return "";
  const types = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

export function recorderExtension(mime: string) {
  return mime.includes("mp4") ? "mp4" : "webm";
}
