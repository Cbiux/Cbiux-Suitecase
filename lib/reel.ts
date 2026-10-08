import { SITE } from "./config";

export const REEL_DURATION = 17.6;
export const SPONSOR_REEL_DURATION = 8.4;
export const REEL_FPS = 30;
export const REEL_COPY_KEY = "cbiux-reel-copy";
export const REEL_LANG_KEY = "cbiux-reel-lang";
export const REEL_MUSIC_KEY = "cbiux-reel-music";

export type ReelLocale = "es" | "en";

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

export type ReelPack = {
  es: ReelCopy;
  en: ReelCopy;
};

export function reelFormat(id: ReelFormatId) {
  return REEL_FORMATS.find((item) => item.id === id) ?? REEL_FORMATS[0];
}

export function defaultReelCopy(locale: ReelLocale = "es"): ReelCopy {
  if (locale === "en") {
    return {
      kicker: "THANK YOU",
      countLine: "{n} brands",
      supported: "backed this trip.",
      goingTo: "They come with me to",
      cities: ["Lisbon", "Devcon India"],
      faceTitle: "Who is backing me.",
      mosaicTitle: "Thank you to every brand.",
      closeTitleA: "I don't travel alone.",
      closeTitleB: "I travel with you.",
      closeBody: "You believed when this was just a suitcase. Now that faith walks with me to {ruta}.",
      sponsorSupported: "backed this trip.",
      sponsorWithMe: "{marca} travels with me.",
      sponsorThanks: "Thank you for backing this trip.",
    };
  }
  return {
    kicker: "GRACIAS",
    countLine: "{n} marcas",
    supported: "apoyaron este viaje.",
    goingTo: "Van conmigo a",
    cities: ["Lisboa", "Devcon India"],
    faceTitle: "Quiénes me apoyan.",
    mosaicTitle: "Gracias a cada una.",
    closeTitleA: "No viajo solo.",
    closeTitleB: "Viajo con ustedes.",
    closeBody: "Creyeron cuando esto era solo una maleta. Ahora su fe camina conmigo a {ruta}.",
    sponsorSupported: "apoyó este viaje.",
    sponsorWithMe: "{marca} va conmigo.",
    sponsorThanks: "Gracias por apoyar este viaje.",
  };
}

export function defaultReelPack(): ReelPack {
  return { es: defaultReelCopy("es"), en: defaultReelCopy("en") };
}

function clip(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function lineOrFresh(value: unknown, max: number, stale: string[], next: string) {
  const text = clip(value, max);
  if (!text || stale.includes(text)) return next;
  return text;
}

export function parseReelCopy(raw: unknown, locale: ReelLocale = "es"): ReelCopy {
  const base = defaultReelCopy(locale);
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
    closeTitleA: lineOrFresh(doc.closeTitleA, 40, ["La maleta", "The suitcase"], base.closeTitleA),
    closeTitleB: lineOrFresh(doc.closeTitleB, 40, ["está llena.", "is full."], base.closeTitleB),
    closeBody: lineOrFresh(
      doc.closeBody,
      220,
      [
        "Por las marcas que apostaron por este viaje. Van conmigo a {ruta}.",
        "For the brands that bet on this trip. They come with me to {ruta}.",
      ],
      base.closeBody,
    ),
    sponsorSupported: clip(doc.sponsorSupported, 80) || base.sponsorSupported,
    sponsorWithMe: clip(doc.sponsorWithMe, 80) || base.sponsorWithMe,
    sponsorThanks: clip(doc.sponsorThanks, 120) || base.sponsorThanks,
  };
}

export function parseReelPack(raw: unknown): ReelPack {
  const base = defaultReelPack();
  if (!raw || typeof raw !== "object") return base;
  const doc = raw as Record<string, unknown>;
  if (doc.es || doc.en) {
    return {
      es: parseReelCopy(doc.es, "es"),
      en: parseReelCopy(doc.en, "en"),
    };
  }
  return {
    es: parseReelCopy(doc, "es"),
    en: base.en,
  };
}

export function fillReel(template: string, vars: { n?: string | number; marca?: string; ruta?: string }) {
  return template
    .replaceAll("{n}", String(vars.n ?? ""))
    .replaceAll("{marca}", vars.marca ?? "")
    .replaceAll("{ruta}", vars.ruta ?? "");
}

function joinList(items: string[], locale: ReelLocale) {
  const and = locale === "en" ? " and " : " y ";
  if (items.length <= 1) return items[0] || "";
  if (items.length === 2) return `${items[0]}${and}${items[1]}`;
  return `${items.slice(0, -1).join(", ")}${and}${items[items.length - 1]}`;
}

export function reelRuta(copy: ReelCopy, locale: ReelLocale = "es") {
  const cities = copy.cities.map((item) => item.trim()).filter(Boolean);
  return joinList(cities, locale);
}

export function reelRouteLine(copy: ReelCopy) {
  return copy.cities
    .map((item) => item.trim())
    .filter(Boolean)
    .join("  ·  ")
    .toUpperCase();
}

export function reelCaption(
  input: { sold: number; brands: string[] },
  copy: ReelCopy = defaultReelCopy(),
  locale: ReelLocale = "es",
) {
  const brands = input.brands.slice(0, 12);
  const extra = input.brands.length - brands.length;
  const extraLabel = extra > 0 ? (locale === "en" ? ` and ${extra} more` : ` y ${extra} más`) : "";
  const list = brands.join(", ") + extraLabel;
  const ruta = reelRuta(copy, locale);
  if (locale === "en") {
    return `Thank you to the ${input.sold} brands that backed this trip.

${list}.

Your logo travels with me, in physical form, to ${ruta}. The suitcase is full because of you.

@${SITE.x}`;
  }
  return `Gracias a las ${input.sold} marcas que apoyaron este viaje.

${list}.

Su logo va conmigo, en físico, a ${ruta}. La maleta ya está llena por ustedes.

@${SITE.x}`;
}

export function sponsorReelCaption(
  brand: string,
  copy: ReelCopy = defaultReelCopy(),
  locale: ReelLocale = "es",
) {
  const ruta = reelRuta(copy, locale);
  if (locale === "en") {
    return `Thank you, ${brand}.

This brand backed my cabin suitcase. Their logo travels with me, in physical form, to ${ruta}.

Tag them. This video is for them.

@${SITE.x}`;
  }
  return `Gracias, ${brand}.

Esta marca apoyó mi maleta de cabina. Su logo viaja conmigo, en físico, a ${ruta}.

Etiquetálos. Este video es por ellos.

@${SITE.x}`;
}

