import { SITE } from "./config";

export const REEL_DURATION = 17.6;
export const SPONSOR_REEL_DURATION = 8.4;
export const REEL_FPS = 30;
export const REEL_COPY_KEY = "cbiux-reel-copy";

export const REEL_FORMATS = [
  { id: "reels", label: "Reels / TikTok 9:16", width: 1080, height: 1920, file: "cbiux-maleta-partners-9x16" },
  { id: "feed", label: "Feed Instagram 4:5", width: 1080, height: 1350, file: "cbiux-maleta-partners-4x5" },
  { id: "square", label: "Cuadrado 1:1", width: 1080, height: 1080, file: "cbiux-maleta-partners-1x1" },
] as const;

export type ReelFormatId = (typeof REEL_FORMATS)[number]["id"];
export type ReelFormat = (typeof REEL_FORMATS)[number];

export type ReelCopy = {
  kicker: string;
  countLine: string;
  supported: string;
  goingTo: string;
  cities: string[];
  faceTitle: string;
  mosaicTitle: string;
  closeTitleA: string;
  closeTitleB: string;
  closeBody: string;
  sponsorSupported: string;
  sponsorWithMe: string;
  sponsorThanks: string;
};

export function reelFormat(id: ReelFormatId) {
  return REEL_FORMATS.find((item) => item.id === id) ?? REEL_FORMATS[0];
}

export function defaultReelCopy(): ReelCopy {
  return {
    kicker: "GRACIAS",
    countLine: "{n} marcas",
    supported: "apoyaron este viaje.",
    goingTo: "Van conmigo a",
    cities: ["Lisboa", "Devcon India"],
    faceTitle: "Quiénes me apoyan.",
    mosaicTitle: "Gracias a cada una.",
    closeTitleA: "La maleta",
    closeTitleB: "está llena.",
    closeBody: "Por las marcas que apostaron por este viaje. Van conmigo a {ruta}.",
    sponsorSupported: "apoyó este viaje.",
    sponsorWithMe: "{marca} va conmigo.",
    sponsorThanks: "Gracias por apoyar este viaje.",
  };
}

function clip(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

export function parseReelCopy(raw: unknown): ReelCopy {
  const base = defaultReelCopy();
  if (!raw || typeof raw !== "object") return base;
  const doc = raw as Record<string, unknown>;
  const cities = Array.isArray(doc.cities)
    ? doc.cities.map((item) => clip(item, 40)).filter(Boolean).slice(0, 6)
    : String(doc.cities ?? "")
        .split(/\n+/)
        .map((item) => clip(item, 40))
        .filter(Boolean)
        .slice(0, 6);
  return {
    kicker: clip(doc.kicker, 24) || base.kicker,
    countLine: clip(doc.countLine, 40) || base.countLine,
    supported: clip(doc.supported, 80) || base.supported,
    goingTo: clip(doc.goingTo, 80) || base.goingTo,
    cities: cities.length ? cities : base.cities,
    faceTitle: clip(doc.faceTitle, 80) || base.faceTitle,
    mosaicTitle: clip(doc.mosaicTitle, 80) || base.mosaicTitle,
    closeTitleA: clip(doc.closeTitleA, 40) || base.closeTitleA,
    closeTitleB: clip(doc.closeTitleB, 40) || base.closeTitleB,
    closeBody: clip(doc.closeBody, 220) || base.closeBody,
    sponsorSupported: clip(doc.sponsorSupported, 80) || base.sponsorSupported,
    sponsorWithMe: clip(doc.sponsorWithMe, 80) || base.sponsorWithMe,
    sponsorThanks: clip(doc.sponsorThanks, 120) || base.sponsorThanks,
  };
}

export function fillReel(template: string, vars: { n?: string | number; marca?: string; ruta?: string }) {
  return template
    .replaceAll("{n}", String(vars.n ?? ""))
    .replaceAll("{marca}", vars.marca ?? "")
    .replaceAll("{ruta}", vars.ruta ?? "");
}

export function reelRuta(copy: ReelCopy) {
  const cities = copy.cities.map((item) => item.trim()).filter(Boolean);
  if (cities.length <= 1) return cities[0] || "";
  return `${cities.slice(0, -1).join(", ")} y ${cities[cities.length - 1]}`;
}

export function reelRouteLine(copy: ReelCopy) {
  return copy.cities
    .map((item) => item.trim())
    .filter(Boolean)
    .join("  ·  ")
    .toUpperCase();
}

export function reelCaption(input: { sold: number; brands: string[] }, copy: ReelCopy = defaultReelCopy()) {
  const brands = input.brands.slice(0, 12);
  const extra = input.brands.length - brands.length;
  const list = brands.join(", ") + (extra > 0 ? ` y ${extra} más` : "");
  const ruta = reelRuta(copy);
  return `Gracias a las ${input.sold} marcas que apoyaron este viaje.

${list}.

Su logo va conmigo, en físico, a ${ruta}. La maleta ya está llena por ustedes.

@${SITE.x}`;
}

export function sponsorReelCaption(brand: string, copy: ReelCopy = defaultReelCopy()) {
  const ruta = reelRuta(copy);
  return `Gracias, ${brand}.

Esta marca apoyó mi maleta de cabina. Su logo viaja conmigo, en físico, a ${ruta}.

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
