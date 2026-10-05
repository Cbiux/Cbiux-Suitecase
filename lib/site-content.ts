import { copy, t } from "./i18n";
import { USD_CRC_RATE, currencyRateNote, parseUsdCrcRate } from "./currency";
import { defaultReelCopy, parseReelCopy, type ReelCopy } from "./reel";
import { OUTBOUND_HOPS, PLACES, ROUTE_VISITS } from "./trip-route";
import type { Locale } from "./types";

export type Localized = { es: string; en: string };
export type VisitStatus = "planned" | "cancelled";

export type SiteVisit = {
  id: string;
  lat: number;
  lng: number;
  city: Localized;
  region: Localized;
  note: Localized;
  status: VisitStatus;
};

export type SiteCard = {
  id: string;
  kicker: Localized;
  title: Localized;
  body: Localized;
};

export type SitePoint = {
  id: string;
  text: Localized;
};

export type SiteContent = {
  version: 1;
  usdCrcRate: number;
  banner: { enabled: boolean; text: Localized };
  meta: { title: Localized; description: Localized };
  nav: {
    positions: Localized;
    offer: Localized;
    included: Localized;
    vlog: Localized;
    how: Localized;
    trip: Localized;
    share: Localized;
    claim: Localized;
  };
  hero: {
    kicker: Localized;
    titleA: Localized;
    titleB: Localized;
    titleAccent: Localized;
    subtitle: Localized;
    cta: Localized;
    spots: Localized;
    from: Localized;
    content: Localized;
    contentValue: Localized;
    available: Localized;
    usdc: Localized;
    dates: Localized;
    url: Localized;
    signal: Localized;
  };
  sheet: {
    startingValue: Localized;
    salesCloseValue: Localized;
    artworkValue: Localized;
    tripValue: Localized;
  };
  pick: { kicker: Localized; title: Localized };
  included: {
    kicker: Localized;
    title: Localized;
    intro: Localized;
    presentingLabel: Localized;
    presenting: Localized;
    items: SiteCard[];
  };
  vlog: {
    kicker: Localized;
    title: Localized;
    body: Localized;
    points: SitePoint[];
  };
  how: {
    kicker: Localized;
    title: Localized;
    steps: SiteCard[];
  };
  timeline: SiteCard[];
  route: {
    kicker: Localized;
    title: Localized;
    body: Localized;
    hint: Localized;
  };
  visits: SiteVisit[];
  outboundHops: number;
  funds: {
    kicker: Localized;
    title: Localized;
    intro: Localized;
    items: SiteCard[];
  };
  addons: {
    kicker: Localized;
    title: Localized;
    merchLabel: Localized;
    merchTitle: Localized;
    merchHalf: Localized;
    merchFull: Localized;
    merchBody: Localized;
    merchHalfPrice: number;
    merchFullPrice: number;
    walkLabel: Localized;
    walkTitle: Localized;
    walkBody: Localized;
    walkPrice: number;
    videoLabel: Localized;
    videoTitle: Localized;
    videoBody: Localized;
    videoCta: Localized;
  };
  cta: {
    kicker: Localized;
    title: Localized;
    body: Localized;
    claim: Localized;
    custom: Localized;
  };
  offer: { kicker: Localized; title: Localized; body: Localized };
  footer: { trip: Localized };
  reel: ReelCopy;
};

function L(es: string, en: string): Localized {
  return { es, en };
}

function locFrom(es: string, en: string): Localized {
  return L(es, en);
}

export function defaultSiteContent(): SiteContent {
  const es = copy.es;
  const en = copy.en;
  return {
    version: 1,
    usdCrcRate: USD_CRC_RATE,
    banner: { enabled: false, text: L("", "") },
    meta: {
      title: locFrom(es.metaTitle, en.metaTitle),
      description: locFrom(es.metaDescription, en.metaDescription),
    },
    nav: {
      positions: locFrom(es.nav.positions, en.nav.positions),
      offer: locFrom(es.nav.offer, en.nav.offer),
      included: locFrom(es.nav.included, en.nav.included),
      vlog: locFrom(es.nav.vlog, en.nav.vlog),
      how: locFrom(es.nav.how, en.nav.how),
      trip: locFrom(es.nav.trip, en.nav.trip),
      share: locFrom(es.nav.share, en.nav.share),
      claim: locFrom(es.nav.claim, en.nav.claim),
    },
    hero: {
      kicker: locFrom(es.hero.kicker, en.hero.kicker),
      titleA: locFrom(es.hero.titleA, en.hero.titleA),
      titleB: locFrom(es.hero.titleB, en.hero.titleB),
      titleAccent: locFrom(es.hero.titleAccent, en.hero.titleAccent),
      subtitle: locFrom(es.hero.subtitle, en.hero.subtitle),
      cta: locFrom(es.hero.cta, en.hero.cta),
      spots: locFrom(es.hero.spots, en.hero.spots),
      from: locFrom(es.hero.from, en.hero.from),
      content: locFrom(es.hero.content, en.hero.content),
      contentValue: locFrom(es.hero.contentValue, en.hero.contentValue),
      available: locFrom(es.hero.available, en.hero.available),
      usdc: locFrom(es.hero.usdc, en.hero.usdc),
      dates: locFrom(es.hero.dates, en.hero.dates),
      url: locFrom(es.hero.url, en.hero.url),
      signal: locFrom(es.hero.signal, en.hero.signal),
    },
    sheet: {
      startingValue: locFrom(es.sheet.startingValue, en.sheet.startingValue),
      salesCloseValue: locFrom(es.sheet.salesCloseValue, en.sheet.salesCloseValue),
      artworkValue: locFrom(es.sheet.artworkValue, en.sheet.artworkValue),
      tripValue: locFrom(es.sheet.tripValue, en.sheet.tripValue),
    },
    pick: {
      kicker: locFrom(es.pick.kicker, en.pick.kicker),
      title: locFrom(es.pick.title, en.pick.title),
    },
    included: {
      kicker: locFrom(es.included.kicker, en.included.kicker),
      title: locFrom(es.included.title, en.included.title),
      intro: locFrom(es.included.intro, en.included.intro),
      presentingLabel: locFrom(es.included.presentingLabel, en.included.presentingLabel),
      presenting: locFrom(es.included.presenting, en.included.presenting),
      items: es.included.items.map((item, index) => ({
        id: `included-${index}`,
        kicker: locFrom(item.n, en.included.items[index]?.n ?? item.n),
        title: locFrom(item.title, en.included.items[index]?.title ?? item.title),
        body: locFrom(item.body, en.included.items[index]?.body ?? item.body),
      })),
    },
    vlog: {
      kicker: locFrom(es.vlog.kicker, en.vlog.kicker),
      title: locFrom(es.vlog.title, en.vlog.title),
      body: locFrom(es.vlog.body, en.vlog.body),
      points: es.vlog.points.map((point, index) => ({
        id: `vlog-${index}`,
        text: locFrom(point, en.vlog.points[index] ?? point),
      })),
    },
    how: {
      kicker: locFrom(es.how.kicker, en.how.kicker),
      title: locFrom(es.how.title, en.how.title),
      steps: es.how.steps.map((step, index) => ({
        id: `how-${index}`,
        kicker: locFrom(step.n, en.how.steps[index]?.n ?? step.n),
        title: locFrom(step.title, en.how.steps[index]?.title ?? step.title),
        body: locFrom(step.body, en.how.steps[index]?.body ?? step.body),
      })),
    },
    timeline: es.timeline.items.map((item, index) => ({
      id: `timeline-${index}`,
      kicker: locFrom(item.date, en.timeline.items[index]?.date ?? item.date),
      title: locFrom(item.title, en.timeline.items[index]?.title ?? item.title),
      body: locFrom(item.body, en.timeline.items[index]?.body ?? item.body),
    })),
    route: {
      kicker: locFrom(es.route.kicker, en.route.kicker),
      title: locFrom(es.route.title, en.route.title),
      body: locFrom(es.route.body, en.route.body),
      hint: locFrom(es.route.hint, en.route.hint),
    },
    visits: ROUTE_VISITS.map((placeId, index) => {
      const stop = es.route.stops[index];
      const enStop = en.route.stops[index];
      return {
        id: `v${String(index + 1).padStart(2, "0")}-${placeId}`,
        lat: PLACES[placeId].lat,
        lng: PLACES[placeId].lng,
        city: locFrom(stop.city, enStop?.city ?? stop.city),
        region: locFrom(stop.region, enStop?.region ?? stop.region),
        note: locFrom(stop.note, enStop?.note ?? stop.note),
        status: "planned" as const,
      };
    }),
    outboundHops: OUTBOUND_HOPS,
    funds: {
      kicker: locFrom(es.funds.kicker, en.funds.kicker),
      title: locFrom(es.funds.title, en.funds.title),
      intro: locFrom(es.funds.intro, en.funds.intro),
      items: es.funds.items.map((item, index) => ({
        id: `funds-${index}`,
        kicker: locFrom(item.n, en.funds.items[index]?.n ?? item.n),
        title: locFrom(item.title, en.funds.items[index]?.title ?? item.title),
        body: locFrom(item.note, en.funds.items[index]?.note ?? item.note),
      })),
    },
    addons: {
      kicker: locFrom(es.addons.kicker, en.addons.kicker),
      title: locFrom(es.addons.title, en.addons.title),
      merchLabel: locFrom(es.addons.merchLabel, en.addons.merchLabel),
      merchTitle: locFrom(es.addons.merchTitle, en.addons.merchTitle),
      merchHalf: locFrom(es.addons.merchHalf, en.addons.merchHalf),
      merchFull: locFrom(es.addons.merchFull, en.addons.merchFull),
      merchBody: locFrom(es.addons.merchBody, en.addons.merchBody),
      merchHalfPrice: 80,
      merchFullPrice: 150,
      walkLabel: locFrom(es.addons.walkLabel, en.addons.walkLabel),
      walkTitle: locFrom(es.addons.walkTitle, en.addons.walkTitle),
      walkBody: locFrom(es.addons.walkBody, en.addons.walkBody),
      walkPrice: 250,
      videoLabel: locFrom(es.addons.videoLabel, en.addons.videoLabel),
      videoTitle: locFrom(es.addons.videoTitle, en.addons.videoTitle),
      videoBody: locFrom(es.addons.videoBody, en.addons.videoBody),
      videoCta: locFrom(es.addons.videoCta, en.addons.videoCta),
    },
    cta: {
      kicker: locFrom(es.cta.kicker, en.cta.kicker),
      title: locFrom(es.cta.title, en.cta.title),
      body: locFrom(es.cta.body, en.cta.body),
      claim: locFrom(es.cta.claim, en.cta.claim),
      custom: locFrom(es.cta.custom, en.cta.custom),
    },
    offer: {
      kicker: locFrom(es.offer.kicker, en.offer.kicker),
      title: locFrom(es.offer.title, en.offer.title),
      body: locFrom(es.offer.body, en.offer.body),
    },
    footer: {
      trip: locFrom(es.footer.trip, en.footer.trip),
    },
    reel: defaultReelCopy(),
  };
}

export function pickLocale(locale: Locale, value: Localized) {
  const preferred = (value?.[locale] || "").trim();
  if (preferred) return preferred;
  return (value?.es || value?.en || "").trim();
}

function clip(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function parseLoc(raw: unknown, fallback: Localized, max = 800): Localized {
  const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    es: clip(record.es, max) || fallback.es,
    en: clip(record.en, max),
  };
}

function parseLocAllowEmpty(raw: unknown, max = 800): Localized {
  const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    es: clip(record.es, max),
    en: clip(record.en, max),
  };
}

function parseNum(raw: unknown, fallback: number, min: number, max: number) {
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export const MAX_VISITS = 80;

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseCard(raw: unknown, fallback: SiteCard | undefined, index: number, prefix: string): SiteCard {
  const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const empty: SiteCard = {
    id: `${prefix}-${index}`,
    kicker: L("", ""),
    title: L("", ""),
    body: L("", ""),
  };
  const base = fallback ?? empty;
  return {
    id: clip(record.id, 40) || base.id || newId(prefix),
    kicker: parseLoc(record.kicker, base.kicker, 80),
    title: parseLoc(record.title, base.title, 160),
    body: parseLocAllowEmpty(record.body, 800),
  };
}

function parseCards(raw: unknown, fallback: SiteCard[], prefix: string, max = 16) {
  if (!Array.isArray(raw)) return fallback;
  return raw.slice(0, max).map((item, index) => parseCard(item, fallback[index], index, prefix));
}

function parsePoints(raw: unknown, fallback: SitePoint[]) {
  if (!Array.isArray(raw)) return fallback;
  return raw.slice(0, 12).map((item, index) => {
    const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const base = fallback[index] ?? { id: `point-${index}`, text: L("", "") };
    return {
      id: clip(record.id, 40) || base.id,
      text: parseLoc(record.text, base.text, 240),
    };
  });
}

function parseVisit(raw: unknown, fallback: SiteVisit | undefined, index: number): SiteVisit {
  const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const base =
    fallback ??
    ({
      id: `visit-${index}`,
      lat: 9.9281,
      lng: -84.0907,
      city: L("Nueva parada", "New stop"),
      region: L("", ""),
      note: L("", ""),
      status: "planned",
    } satisfies SiteVisit);
  const status = record.status === "cancelled" ? "cancelled" : "planned";
  return {
    id: clip(record.id, 80) || base.id,
    lat: parseNum(record.lat, base.lat, -90, 90),
    lng: parseNum(record.lng, base.lng, -180, 180),
    city: parseLoc(record.city, base.city, 80),
    region: parseLocAllowEmpty(record.region, 80),
    note: parseLocAllowEmpty(record.note, 160),
    status,
  };
}

export function parseSiteContent(raw: unknown): SiteContent {
  const base = defaultSiteContent();
  if (!raw || typeof raw !== "object") return base;
  const doc = raw as Record<string, unknown>;
  const visitsRaw = Array.isArray(doc.visits) ? doc.visits : null;
  return {
    version: 1,
    usdCrcRate: parseUsdCrcRate(doc.usdCrcRate, base.usdCrcRate),
    banner: {
      enabled: Boolean(
        doc.banner && typeof doc.banner === "object"
          ? (doc.banner as { enabled?: unknown }).enabled
          : base.banner.enabled,
      ),
      text: parseLocAllowEmpty(
        doc.banner && typeof doc.banner === "object" ? (doc.banner as { text?: unknown }).text : {},
        280,
      ),
    },
    meta: {
      title: parseLoc(
        doc.meta && typeof doc.meta === "object" ? (doc.meta as { title?: unknown }).title : {},
        base.meta.title,
        160,
      ),
      description: parseLoc(
        doc.meta && typeof doc.meta === "object" ? (doc.meta as { description?: unknown }).description : {},
        base.meta.description,
        320,
      ),
    },
    nav: Object.fromEntries(
      (Object.keys(base.nav) as (keyof SiteContent["nav"])[]).map((key) => [
        key,
        parseLoc(
          doc.nav && typeof doc.nav === "object" ? (doc.nav as Record<string, unknown>)[key] : {},
          base.nav[key],
          40,
        ),
      ]),
    ) as SiteContent["nav"],
    hero: Object.fromEntries(
      (Object.keys(base.hero) as (keyof SiteContent["hero"])[]).map((key) => [
        key,
        parseLoc(
          doc.hero && typeof doc.hero === "object" ? (doc.hero as Record<string, unknown>)[key] : {},
          base.hero[key],
          key === "subtitle" ? 500 : 160,
        ),
      ]),
    ) as SiteContent["hero"],
    sheet: Object.fromEntries(
      (Object.keys(base.sheet) as (keyof SiteContent["sheet"])[]).map((key) => [
        key,
        parseLoc(
          doc.sheet && typeof doc.sheet === "object" ? (doc.sheet as Record<string, unknown>)[key] : {},
          base.sheet[key],
          120,
        ),
      ]),
    ) as SiteContent["sheet"],
    pick: {
      kicker: parseLoc(
        doc.pick && typeof doc.pick === "object" ? (doc.pick as { kicker?: unknown }).kicker : {},
        base.pick.kicker,
        80,
      ),
      title: parseLoc(
        doc.pick && typeof doc.pick === "object" ? (doc.pick as { title?: unknown }).title : {},
        base.pick.title,
        80,
      ),
    },
    included: {
      kicker: parseLoc(
        doc.included && typeof doc.included === "object"
          ? (doc.included as { kicker?: unknown }).kicker
          : {},
        base.included.kicker,
        80,
      ),
      title: parseLoc(
        doc.included && typeof doc.included === "object"
          ? (doc.included as { title?: unknown }).title
          : {},
        base.included.title,
        80,
      ),
      intro: parseLoc(
        doc.included && typeof doc.included === "object"
          ? (doc.included as { intro?: unknown }).intro
          : {},
        base.included.intro,
        400,
      ),
      presentingLabel: parseLoc(
        doc.included && typeof doc.included === "object"
          ? (doc.included as { presentingLabel?: unknown }).presentingLabel
          : {},
        base.included.presentingLabel,
        40,
      ),
      presenting: parseLoc(
        doc.included && typeof doc.included === "object"
          ? (doc.included as { presenting?: unknown }).presenting
          : {},
        base.included.presenting,
        500,
      ),
      items: parseCards(
        doc.included && typeof doc.included === "object"
          ? (doc.included as { items?: unknown }).items
          : undefined,
        base.included.items,
        "included",
        8,
      ),
    },
    vlog: {
      kicker: parseLoc(
        doc.vlog && typeof doc.vlog === "object" ? (doc.vlog as { kicker?: unknown }).kicker : {},
        base.vlog.kicker,
        80,
      ),
      title: parseLoc(
        doc.vlog && typeof doc.vlog === "object" ? (doc.vlog as { title?: unknown }).title : {},
        base.vlog.title,
        120,
      ),
      body: parseLoc(
        doc.vlog && typeof doc.vlog === "object" ? (doc.vlog as { body?: unknown }).body : {},
        base.vlog.body,
        500,
      ),
      points: parsePoints(
        doc.vlog && typeof doc.vlog === "object" ? (doc.vlog as { points?: unknown }).points : undefined,
        base.vlog.points,
      ),
    },
    how: {
      kicker: parseLoc(
        doc.how && typeof doc.how === "object" ? (doc.how as { kicker?: unknown }).kicker : {},
        base.how.kicker,
        80,
      ),
      title: parseLoc(
        doc.how && typeof doc.how === "object" ? (doc.how as { title?: unknown }).title : {},
        base.how.title,
        80,
      ),
      steps: parseCards(
        doc.how && typeof doc.how === "object" ? (doc.how as { steps?: unknown }).steps : undefined,
        base.how.steps,
        "how",
        8,
      ),
    },
    timeline: parseCards(doc.timeline, base.timeline, "timeline", 12),
    route: {
      kicker: parseLoc(
        doc.route && typeof doc.route === "object" ? (doc.route as { kicker?: unknown }).kicker : {},
        base.route.kicker,
        80,
      ),
      title: parseLoc(
        doc.route && typeof doc.route === "object" ? (doc.route as { title?: unknown }).title : {},
        base.route.title,
        120,
      ),
      body: parseLoc(
        doc.route && typeof doc.route === "object" ? (doc.route as { body?: unknown }).body : {},
        base.route.body,
        400,
      ),
      hint: parseLoc(
        doc.route && typeof doc.route === "object" ? (doc.route as { hint?: unknown }).hint : {},
        base.route.hint,
        120,
      ),
    },
    visits: Array.isArray(visitsRaw)
      ? visitsRaw.slice(0, MAX_VISITS).map((item, index) => parseVisit(item, undefined, index))
      : base.visits,
    outboundHops: parseNum(doc.outboundHops, base.outboundHops, 0, MAX_VISITS),
    funds: {
      kicker: parseLoc(
        doc.funds && typeof doc.funds === "object" ? (doc.funds as { kicker?: unknown }).kicker : {},
        base.funds.kicker,
        80,
      ),
      title: parseLoc(
        doc.funds && typeof doc.funds === "object" ? (doc.funds as { title?: unknown }).title : {},
        base.funds.title,
        80,
      ),
      intro: parseLoc(
        doc.funds && typeof doc.funds === "object" ? (doc.funds as { intro?: unknown }).intro : {},
        base.funds.intro,
        500,
      ),
      items: parseCards(
        doc.funds && typeof doc.funds === "object" ? (doc.funds as { items?: unknown }).items : undefined,
        base.funds.items,
        "funds",
        8,
      ),
    },
    addons: {
      kicker: parseLoc(
        doc.addons && typeof doc.addons === "object" ? (doc.addons as { kicker?: unknown }).kicker : {},
        base.addons.kicker,
        80,
      ),
      title: parseLoc(
        doc.addons && typeof doc.addons === "object" ? (doc.addons as { title?: unknown }).title : {},
        base.addons.title,
        80,
      ),
      merchLabel: parseLoc(
        doc.addons && typeof doc.addons === "object"
          ? (doc.addons as { merchLabel?: unknown }).merchLabel
          : {},
        base.addons.merchLabel,
        80,
      ),
      merchTitle: parseLoc(
        doc.addons && typeof doc.addons === "object"
          ? (doc.addons as { merchTitle?: unknown }).merchTitle
          : {},
        base.addons.merchTitle,
        120,
      ),
      merchHalf: parseLoc(
        doc.addons && typeof doc.addons === "object"
          ? (doc.addons as { merchHalf?: unknown }).merchHalf
          : {},
        base.addons.merchHalf,
        40,
      ),
      merchFull: parseLoc(
        doc.addons && typeof doc.addons === "object"
          ? (doc.addons as { merchFull?: unknown }).merchFull
          : {},
        base.addons.merchFull,
        40,
      ),
      merchBody: parseLoc(
        doc.addons && typeof doc.addons === "object"
          ? (doc.addons as { merchBody?: unknown }).merchBody
          : {},
        base.addons.merchBody,
        400,
      ),
      merchHalfPrice: parseNum(
        doc.addons && typeof doc.addons === "object"
          ? (doc.addons as { merchHalfPrice?: unknown }).merchHalfPrice
          : base.addons.merchHalfPrice,
        base.addons.merchHalfPrice,
        0,
        5000,
      ),
      merchFullPrice: parseNum(
        doc.addons && typeof doc.addons === "object"
          ? (doc.addons as { merchFullPrice?: unknown }).merchFullPrice
          : base.addons.merchFullPrice,
        base.addons.merchFullPrice,
        0,
        5000,
      ),
      walkLabel: parseLoc(
        doc.addons && typeof doc.addons === "object"
          ? (doc.addons as { walkLabel?: unknown }).walkLabel
          : {},
        base.addons.walkLabel,
        80,
      ),
      walkTitle: parseLoc(
        doc.addons && typeof doc.addons === "object"
          ? (doc.addons as { walkTitle?: unknown }).walkTitle
          : {},
        base.addons.walkTitle,
        120,
      ),
      walkBody: parseLoc(
        doc.addons && typeof doc.addons === "object"
          ? (doc.addons as { walkBody?: unknown }).walkBody
          : {},
        base.addons.walkBody,
        400,
      ),
      walkPrice: parseNum(
        doc.addons && typeof doc.addons === "object"
          ? (doc.addons as { walkPrice?: unknown }).walkPrice
          : base.addons.walkPrice,
        base.addons.walkPrice,
        0,
        5000,
      ),
      videoLabel: parseLoc(
        doc.addons && typeof doc.addons === "object"
          ? (doc.addons as { videoLabel?: unknown }).videoLabel
          : {},
        base.addons.videoLabel,
        80,
      ),
      videoTitle: parseLoc(
        doc.addons && typeof doc.addons === "object"
          ? (doc.addons as { videoTitle?: unknown }).videoTitle
          : {},
        base.addons.videoTitle,
        160,
      ),
      videoBody: parseLoc(
        doc.addons && typeof doc.addons === "object"
          ? (doc.addons as { videoBody?: unknown }).videoBody
          : {},
        base.addons.videoBody,
        400,
      ),
      videoCta: parseLoc(
        doc.addons && typeof doc.addons === "object"
          ? (doc.addons as { videoCta?: unknown }).videoCta
          : {},
        base.addons.videoCta,
        40,
      ),
    },
    cta: Object.fromEntries(
      (Object.keys(base.cta) as (keyof SiteContent["cta"])[]).map((key) => [
        key,
        parseLoc(
          doc.cta && typeof doc.cta === "object" ? (doc.cta as Record<string, unknown>)[key] : {},
          base.cta[key],
          key === "body" ? 400 : 160,
        ),
      ]),
    ) as SiteContent["cta"],
    offer: {
      kicker: parseLoc(
        doc.offer && typeof doc.offer === "object" ? (doc.offer as { kicker?: unknown }).kicker : {},
        base.offer.kicker,
        80,
      ),
      title: parseLoc(
        doc.offer && typeof doc.offer === "object" ? (doc.offer as { title?: unknown }).title : {},
        base.offer.title,
        80,
      ),
      body: parseLoc(
        doc.offer && typeof doc.offer === "object" ? (doc.offer as { body?: unknown }).body : {},
        base.offer.body,
        400,
      ),
    },
    footer: {
      trip: parseLoc(
        doc.footer && typeof doc.footer === "object" ? (doc.footer as { trip?: unknown }).trip : {},
        base.footer.trip,
        80,
      ),
    },
    reel: parseReelCopy(doc.reel),
  };
}

export function applySiteToDict(locale: Locale, site: SiteContent): ReturnType<typeof t> {
  const dict = structuredClone(t(locale)) as Record<string, any>;
  const Lx = (value: Localized) => pickLocale(locale, value);
  dict.metaTitle = Lx(site.meta.title) || dict.metaTitle;
  dict.metaDescription = Lx(site.meta.description) || dict.metaDescription;
  dict.nav.positions = Lx(site.nav.positions) || dict.nav.positions;
  dict.nav.offer = Lx(site.nav.offer) || dict.nav.offer;
  dict.nav.included = Lx(site.nav.included) || dict.nav.included;
  dict.nav.vlog = Lx(site.nav.vlog) || dict.nav.vlog;
  dict.nav.how = Lx(site.nav.how) || dict.nav.how;
  dict.nav.trip = Lx(site.nav.trip) || dict.nav.trip;
  dict.nav.share = Lx(site.nav.share) || dict.nav.share;
  dict.nav.claim = Lx(site.nav.claim) || dict.nav.claim;
  dict.hero.kicker = Lx(site.hero.kicker) || dict.hero.kicker;
  dict.hero.titleA = Lx(site.hero.titleA) || dict.hero.titleA;
  dict.hero.titleB = Lx(site.hero.titleB) || dict.hero.titleB;
  dict.hero.titleAccent = Lx(site.hero.titleAccent) || dict.hero.titleAccent;
  dict.hero.subtitle = Lx(site.hero.subtitle) || dict.hero.subtitle;
  dict.hero.cta = Lx(site.hero.cta) || dict.hero.cta;
  dict.hero.spots = Lx(site.hero.spots) || dict.hero.spots;
  dict.hero.from = Lx(site.hero.from) || dict.hero.from;
  dict.hero.content = Lx(site.hero.content) || dict.hero.content;
  dict.hero.contentValue = Lx(site.hero.contentValue) || dict.hero.contentValue;
  dict.hero.available = Lx(site.hero.available) || dict.hero.available;
  dict.hero.usdc = Lx(site.hero.usdc) || dict.hero.usdc;
  dict.hero.dates = Lx(site.hero.dates) || dict.hero.dates;
  dict.hero.url = Lx(site.hero.url) || dict.hero.url;
  dict.hero.signal = Lx(site.hero.signal) || dict.hero.signal;
  dict.sheet.startingValue = Lx(site.sheet.startingValue) || dict.sheet.startingValue;
  dict.sheet.salesCloseValue = Lx(site.sheet.salesCloseValue) || dict.sheet.salesCloseValue;
  dict.sheet.artworkValue = Lx(site.sheet.artworkValue) || dict.sheet.artworkValue;
  dict.sheet.tripValue = Lx(site.sheet.tripValue) || dict.sheet.tripValue;
  dict.pick.kicker = Lx(site.pick.kicker) || dict.pick.kicker;
  dict.pick.title = Lx(site.pick.title) || dict.pick.title;
  dict.included.kicker = Lx(site.included.kicker) || dict.included.kicker;
  dict.included.title = Lx(site.included.title) || dict.included.title;
  dict.included.intro = Lx(site.included.intro) || dict.included.intro;
  dict.included.presentingLabel = Lx(site.included.presentingLabel) || dict.included.presentingLabel;
  dict.included.presenting = Lx(site.included.presenting) || dict.included.presenting;
  dict.included.items = site.included.items.map((item) => ({
    n: Lx(item.kicker),
    title: Lx(item.title),
    body: Lx(item.body),
  }));
  dict.vlog.kicker = Lx(site.vlog.kicker) || dict.vlog.kicker;
  dict.vlog.title = Lx(site.vlog.title) || dict.vlog.title;
  dict.vlog.body = Lx(site.vlog.body) || dict.vlog.body;
  dict.vlog.points = site.vlog.points.map((point) => Lx(point.text));
  dict.how.kicker = Lx(site.how.kicker) || dict.how.kicker;
  dict.how.title = Lx(site.how.title) || dict.how.title;
  dict.how.steps = site.how.steps.map((step) => ({
    n: Lx(step.kicker),
    title: Lx(step.title),
    body: Lx(step.body),
  }));
  dict.timeline.items = site.timeline.map((item) => ({
    date: Lx(item.kicker),
    title: Lx(item.title),
    body: Lx(item.body),
  }));
  dict.route.kicker = Lx(site.route.kicker) || dict.route.kicker;
  dict.route.title = Lx(site.route.title) || dict.route.title;
  dict.route.body = Lx(site.route.body) || dict.route.body;
  dict.route.hint = Lx(site.route.hint) || dict.route.hint;
  dict.route.stops = site.visits.map((visit) => ({
    city: Lx(visit.city),
    region: Lx(visit.region),
    note: Lx(visit.note),
  }));
  dict.funds.kicker = Lx(site.funds.kicker) || dict.funds.kicker;
  dict.funds.title = Lx(site.funds.title) || dict.funds.title;
  dict.funds.intro = Lx(site.funds.intro) || dict.funds.intro;
  dict.funds.items = site.funds.items.map((item) => ({
    n: Lx(item.kicker),
    title: Lx(item.title),
    note: Lx(item.body),
  }));
  dict.addons.kicker = Lx(site.addons.kicker) || dict.addons.kicker;
  dict.addons.title = Lx(site.addons.title) || dict.addons.title;
  dict.addons.merchLabel = Lx(site.addons.merchLabel) || dict.addons.merchLabel;
  dict.addons.merchTitle = Lx(site.addons.merchTitle) || dict.addons.merchTitle;
  dict.addons.merchHalf = Lx(site.addons.merchHalf) || dict.addons.merchHalf;
  dict.addons.merchFull = Lx(site.addons.merchFull) || dict.addons.merchFull;
  dict.addons.merchBody = Lx(site.addons.merchBody) || dict.addons.merchBody;
  dict.addons.walkLabel = Lx(site.addons.walkLabel) || dict.addons.walkLabel;
  dict.addons.walkTitle = Lx(site.addons.walkTitle) || dict.addons.walkTitle;
  dict.addons.walkBody = Lx(site.addons.walkBody) || dict.addons.walkBody;
  dict.addons.videoLabel = Lx(site.addons.videoLabel) || dict.addons.videoLabel;
  dict.addons.videoTitle = Lx(site.addons.videoTitle) || dict.addons.videoTitle;
  dict.addons.videoBody = Lx(site.addons.videoBody) || dict.addons.videoBody;
  dict.addons.videoCta = Lx(site.addons.videoCta) || dict.addons.videoCta;
  dict.cta.kicker = Lx(site.cta.kicker) || dict.cta.kicker;
  dict.cta.title = Lx(site.cta.title) || dict.cta.title;
  dict.cta.body = Lx(site.cta.body) || dict.cta.body;
  dict.cta.claim = Lx(site.cta.claim) || dict.cta.claim;
  dict.cta.custom = Lx(site.cta.custom) || dict.cta.custom;
  dict.offer.kicker = Lx(site.offer.kicker) || dict.offer.kicker;
  dict.offer.title = Lx(site.offer.title) || dict.offer.title;
  dict.offer.body = Lx(site.offer.body) || dict.offer.body;
  dict.footer.trip = Lx(site.footer.trip) || dict.footer.trip;
  dict.currency.rateNote = currencyRateNote(site.usdCrcRate, locale);
  return dict as ReturnType<typeof t>;
}

export function playableVisits(site: SiteContent) {
  return site.visits.filter((visit) => visit.status !== "cancelled");
}

export function siteArcs(site: SiteContent) {
  const path = playableVisits(site);
  return path.slice(0, -1).map((from, index) => {
    const to = path[index + 1];
    return {
      startLat: from.lat,
      startLng: from.lng,
      endLat: to.lat,
      endLng: to.lng,
      outbound: index < site.outboundHops,
      index,
    };
  });
}

export function siteLabels(site: SiteContent, locale: Locale) {
  const seen = new Set<string>();
  const labels: { id: string; lat: number; lng: number; text: string }[] = [];
  for (const visit of playableVisits(site)) {
    const key = `${visit.lat.toFixed(3)},${visit.lng.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push({
      id: visit.id,
      lat: visit.lat,
      lng: visit.lng,
      text: pickLocale(locale, visit.city),
    });
  }
  return labels;
}

export function emptyCard(prefix: string): SiteCard {
  return { id: newId(prefix), kicker: L("", ""), title: L("", ""), body: L("", "") };
}

export function emptyPoint(): SitePoint {
  return { id: newId("point"), text: L("", "") };
}

export function emptyVisit(): SiteVisit {
  return {
    id: newId("visit"),
    lat: 9.9281,
    lng: -84.0907,
    city: L("Nueva parada", "New stop"),
    region: L("Costa Rica", "Costa Rica"),
    note: L("", ""),
    status: "planned",
  };
}

export function cityPresets() {
  const seen = new Set<string>();
  const presets: Array<{
    city: Localized;
    region: Localized;
    note: Localized;
    lat: number;
    lng: number;
  }> = [];
  for (const visit of defaultSiteContent().visits) {
    const key = `${visit.lat.toFixed(3)},${visit.lng.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    presets.push({
      city: visit.city,
      region: visit.region,
      note: visit.note,
      lat: visit.lat,
      lng: visit.lng,
    });
  }
  return presets;
}

export function visitFromPreset(preset: ReturnType<typeof cityPresets>[number]): SiteVisit {
  return {
    ...emptyVisit(),
    ...preset,
    status: "planned",
  };
}

export function visitFromGeocode(hit: { name: string; region: string; lat: number; lng: number }): SiteVisit {
  return {
    ...emptyVisit(),
    lat: hit.lat,
    lng: hit.lng,
    city: L(hit.name, hit.name),
    region: L(hit.region, hit.region),
    note: L("", ""),
    status: "planned",
  };
}
