"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DownloadLogosButton } from "./download-logos-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugBrand } from "@/lib/logo-file";
import { padSpot } from "@/lib/positions";
import {
  REEL_COPY_KEY,
  REEL_DURATION,
  REEL_FORMATS,
  REEL_FPS,
  REEL_LANG_KEY,
  REEL_MUSIC_KEY,
  SPONSOR_REEL_DURATION,
  defaultReelCopy,
  parseReelCopy,
  parseReelPack,
  pickRecorderMime,
  recorderExtension,
  reelCaption,
  reelFormat,
  sponsorReelCaption,
  type ReelCopy,
  type ReelFormatId,
  type ReelLocale,
  type ReelPack,
} from "@/lib/reel";
import { startReelMusic } from "@/lib/reel-music";
import {
  drawReelFrame,
  groupReelDuration,
  prepareReelAssets,
  sponsorPlates,
  type LoadedPlate,
  type ReelAssets,
} from "@/lib/reel-render";
import type { LivePosition } from "@/lib/types";

type Mode = "group" | "sponsor";
type Clip = { url: string; name: string; brand: string; caption: string };

const TIPS = [
  "El video es un agradecimiento a esa marca, no una promo de la maleta. Etiquetálos al subir.",
  "Empieza con su logo. Después se ve su espacio real en el carry-on.",
  "Generá una versión en español y otra en inglés con el mismo botón, cambiando el idioma.",
  "La música queda mezclada en el archivo. Apagala si lo vas a sonorizar en CapCut.",
  "Generar todos tarda unos 8 segundos por partner. No cierres la pestaña.",
  "Si el archivo sale .webm, abrilo en CapCut y exportá MP4.",
];

const FIELD =
  "min-h-11 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const PILL =
  "rounded-full px-4 py-2 font-mono text-[10px] font-semibold tracking-[0.12em]";

function persistPack(pack: ReelPack) {
  try {
    window.localStorage.setItem(REEL_COPY_KEY, JSON.stringify(pack));
  } catch {
    /* ignore */
  }
}

function readStoredPack(fallback?: ReelPack | ReelCopy) {
  if (typeof window === "undefined") return parseReelPack(fallback);
  try {
    const raw = window.localStorage.getItem(REEL_COPY_KEY);
    if (raw) return parseReelPack(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return parseReelPack(fallback);
}

function readStoredLocale(): ReelLocale {
  if (typeof window === "undefined") return "es";
  try {
    const raw = window.localStorage.getItem(REEL_LANG_KEY);
    if (raw === "en" || raw === "es") return raw;
  } catch {
    /* ignore */
  }
  return "es";
}

function readStoredMusic() {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(REEL_MUSIC_KEY);
    if (raw === "0") return false;
    if (raw === "1") return true;
  } catch {
    /* ignore */
  }
  return true;
}

function ReelTextField({
  id,
  label,
  value,
  onChange,
  multiline,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {multiline ? (
        <textarea id={id} className={`${FIELD} min-h-24`} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function clipName(spot: LoadedPlate, ext: string, locale: ReelLocale) {
  return `cbiux-gracias-${padSpot(spot.id)}-${slugBrand(spot.sponsor)}-${locale}.${ext}`;
}

function saveFile(url: string, name: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
}

export function ReelStudio({
  positions,
  initialCopy,
}: {
  positions: LivePosition[];
  initialCopy?: ReelPack | ReelCopy;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [formatId, setFormatId] = useState<ReelFormatId>("reels");
  const [mode, setMode] = useState<Mode>("sponsor");
  const [locale, setLocale] = useState<ReelLocale>("es");
  const [musicOn, setMusicOn] = useState(true);
  const [pack, setPack] = useState<ReelPack>(() => parseReelPack(initialCopy));
  const [saveLabel, setSaveLabel] = useState("");
  const [assets, setAssets] = useState<ReelAssets | null>(null);
  const [focusId, setFocusId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState<"prep" | "record" | "batch" | "">("prep");
  const [batchLabel, setBatchLabel] = useState("");
  const [clips, setClips] = useState<Clip[]>([]);
  const [copied, setCopied] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const format = reelFormat(formatId);
  const copy = pack[locale];
  const sponsors = assets ? sponsorPlates(assets) : [];
  const focus = mode === "sponsor" ? (sponsors.find((spot) => spot.id === focusId) ?? sponsors[0] ?? null) : null;
  const duration = focus
    ? SPONSOR_REEL_DURATION
    : assets
      ? groupReelDuration(assets)
      : REEL_DURATION;

  const caption = useMemo(() => {
    if (focus) return sponsorReelCaption(focus.sponsor, copy, locale);
    return reelCaption(
      {
        sold: assets?.sold ?? positions.filter((spot) => spot.status === "sold").length,
        brands: assets?.brands ?? [],
      },
      copy,
      locale,
    );
  }, [assets, copy, focus, locale, positions]);

  useEffect(() => {
    setPack(readStoredPack(initialCopy));
    setLocale(readStoredLocale());
    setMusicOn(readStoredMusic());
  }, [initialCopy]);

  function patchCopy(patch: Partial<ReelCopy>) {
    setPack((current) => {
      const next = { ...current, [locale]: { ...current[locale], ...patch } };
      persistPack(next);
      return next;
    });
    setSaveLabel("");
  }

  function selectLocale(next: ReelLocale) {
    setLocale(next);
    try {
      window.localStorage.setItem(REEL_LANG_KEY, next);
    } catch {
      /* ignore */
    }
  }

  function toggleMusic() {
    setMusicOn((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(REEL_MUSIC_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  async function saveCopy() {
    setSaveLabel("");
    const parsed = parseReelPack({
      ...pack,
      [locale]: parseReelCopy(pack[locale], locale),
    });
    persistPack(parsed);
    const response = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { reel: parsed } }),
    });
    if (response.ok) {
      setPack(parsed);
      setSaveLabel("Guardado.");
      return;
    }
    setSaveLabel("Quedó en este navegador. Entrá al admin para guardarlo en el sitio.");
  }

  useEffect(() => {
    let live = true;
    setBusy("prep");
    setLoadError("");
    prepareReelAssets(positions).then(
      (ready) => {
        if (!live) return;
        setAssets(ready);
        const first = sponsorPlates(ready)[0];
        setFocusId((current) => current ?? first?.id ?? null);
        setBusy("");
      },
      () => {
        if (!live) return;
        setLoadError("No se pudieron cargar la maleta o los logos.");
        setBusy("");
      },
    );
    return () => {
      live = false;
    };
  }, [positions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !assets || busy === "record" || busy === "batch") return;
    canvas.width = format.width;
    canvas.height = format.height;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = ((now - start) / 1000) % duration;
      drawReelFrame(ctx, t, assets, format, focus, copy, locale);
      if (barRef.current) barRef.current.style.width = `${Math.round((t / duration) * 100)}%`;
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [assets, copy, format, busy, focus, duration, locale]);

  useEffect(() => {
    if (!audioUnlocked || !musicOn || !assets || busy === "prep" || busy === "record" || busy === "batch") return;
    let cancelled = false;
    let stop: (() => Promise<void>) | undefined;
    startReelMusic({ seconds: 180, hear: true, volume: 0.12 })
      .then((score) => {
        if (cancelled) {
          void score.stop();
          return;
        }
        stop = score.stop;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      void stop?.();
    };
  }, [audioUnlocked, musicOn, assets, busy]);

  useEffect(() => {
    return () => {
      clips.forEach((clip) => URL.revokeObjectURL(clip.url));
    };
  }, [clips]);

  async function capture(draw: (t: number) => void, length: number, hear: boolean) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) throw new Error("CANVAS");
    canvas.width = format.width;
    canvas.height = format.height;
    draw(0);
    const videoStream = canvas.captureStream(REEL_FPS);
    let stopMusic = async () => {};
    let mixed = false;
    let stream: MediaStream = videoStream;
    if (musicOn) {
      try {
        const score = await startReelMusic({ seconds: length + 0.45, hear, volume: 0.2 });
        stream = new MediaStream([...videoStream.getVideoTracks(), score.track]);
        stopMusic = score.stop;
        mixed = true;
      } catch {
        stream = videoStream;
      }
    }
    const mime = pickRecorderMime(mixed);
    if (!mime || typeof MediaRecorder === "undefined") throw new Error("RECORDER");
    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 8_000_000,
      ...(mixed ? { audioBitsPerSecond: 160_000 } : {}),
    });
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    const done = new Promise<Blob>((resolve, reject) => {
      recorder.onerror = () => reject(new Error("RECORD"));
      recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
    });
    recorder.start(200);
    const started = performance.now();
    await new Promise<void>((resolve) => {
      const step = () => {
        const t = Math.min(length, (performance.now() - started) / 1000);
        draw(t);
        if (barRef.current) barRef.current.style.width = `${Math.round((t / length) * 100)}%`;
        if (t >= length) {
          resolve();
          return;
        }
        window.setTimeout(step, 1000 / REEL_FPS);
      };
      step();
    });
    if (barRef.current) barRef.current.style.width = "100%";
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    recorder.stop();
    const blob = await done;
    await stopMusic();
    stream.getTracks().forEach((track) => track.stop());
    videoStream.getTracks().forEach((track) => track.stop());
    return { blob, ext: recorderExtension(mime) };
  }

  async function recordOne(spot: LoadedPlate | null) {
    if (!assets) return;
    setBusy("record");
    setLoadError("");
    try {
      const length = spot ? SPONSOR_REEL_DURATION : groupReelDuration(assets);
      const { blob, ext } = await capture(
        (t) => drawReelFrame(canvasRef.current!.getContext("2d")!, t, assets, format, spot, copy, locale),
        length,
        true,
      );
      const url = URL.createObjectURL(blob);
      const clip: Clip = spot
        ? {
            url,
            name: clipName(spot, ext, locale),
            brand: spot.sponsor,
            caption: sponsorReelCaption(spot.sponsor, copy, locale),
          }
        : {
            url,
            name: `${format.file}-${locale}.${ext}`,
            brand: locale === "en" ? "Full suitcase" : "Maleta completa",
            caption: reelCaption(
              {
                sold: assets.sold,
                brands: assets.brands,
              },
              copy,
              locale,
            ),
          };
      setClips((current) => {
        current.forEach((item) => URL.revokeObjectURL(item.url));
        return [clip];
      });
      saveFile(url, clip.name);
    } catch (error) {
      setLoadError(
        error instanceof Error && error.message === "RECORDER"
          ? "Este navegador no puede grabar video. Probá Chrome o Safari."
          : "No se pudo terminar el video. Reintentá.",
      );
    }
    setBusy("");
  }

  async function recordAll() {
    if (!assets || sponsors.length === 0) return;
    setBusy("batch");
    setLoadError("");
    const made: Clip[] = [];
    try {
      for (let index = 0; index < sponsors.length; index += 1) {
        const spot = sponsors[index];
        setFocusId(spot.id);
        setBatchLabel(`${index + 1}/${sponsors.length} · ${spot.sponsor}`);
        const { blob, ext } = await capture(
          (t) => drawReelFrame(canvasRef.current!.getContext("2d")!, t, assets, format, spot, copy, locale),
          SPONSOR_REEL_DURATION,
          false,
        );
        const url = URL.createObjectURL(blob);
        const clip: Clip = {
          url,
          name: clipName(spot, ext, locale),
          brand: spot.sponsor,
          caption: sponsorReelCaption(spot.sponsor, copy, locale),
        };
        made.push(clip);
        saveFile(url, clip.name);
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
      setClips((current) => {
        current.forEach((item) => URL.revokeObjectURL(item.url));
        return made;
      });
    } catch {
      made.forEach((item) => URL.revokeObjectURL(item.url));
      setLoadError("Se cortó la tanda. Reintentá; los que ya bajaron están en Descargas.");
    }
    setBatchLabel("");
    setBusy("");
  }

  async function copyCaption() {
    await navigator.clipboard.writeText(caption);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const recording = busy === "record" || busy === "batch";

  return (
    <div
      className="grid gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]"
      onPointerDown={() => setAudioUnlocked(true)}
    >
      <div>
        <div className="overflow-hidden rounded-[28px] border border-border bg-[#111] p-3">
          <canvas
            ref={canvasRef}
            className="block h-auto w-full rounded-[20px] bg-[#f7f7f4]"
            style={{ aspectRatio: `${format.width} / ${format.height}` }}
          />
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-border">
          <div ref={barRef} className="h-full w-0 bg-primary" />
        </div>
        <p className="mt-2 font-mono text-[10px] tracking-[0.12em] text-muted-foreground">
          {busy === "prep"
            ? "Preparando logos…"
            : busy === "batch"
              ? `Grabando ${batchLabel}`
              : busy === "record"
                ? "Grabando el reel…"
                : `${format.width}×${format.height} · ${duration.toFixed(0)} s · ${locale.toUpperCase()}${musicOn ? " · música" : ""}`}
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={recording}
            onClick={() => setMode("sponsor")}
            className={`${PILL} ${mode === "sponsor" ? "bg-foreground text-background" : "border border-border bg-card"}`}
          >
            Por patrocinador
          </button>
          <button
            type="button"
            disabled={recording}
            onClick={() => setMode("group")}
            className={`${PILL} ${mode === "group" ? "bg-foreground text-background" : "border border-border bg-card"}`}
          >
            Maleta completa
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["es", "en"] as const).map((item) => (
            <button
              key={item}
              type="button"
              disabled={recording}
              onClick={() => selectLocale(item)}
              className={`${PILL} ${locale === item ? "bg-foreground text-background" : "border border-border bg-card"}`}
            >
              {item === "es" ? "Español" : "English"}
            </button>
          ))}
          <button
            type="button"
            disabled={recording}
            onClick={toggleMusic}
            className={`${PILL} ${musicOn ? "bg-foreground text-background" : "border border-border bg-card"}`}
          >
            {musicOn ? "Con música" : "Sin música"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {REEL_FORMATS.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={recording}
              onClick={() => setFormatId(item.id)}
              className={`${PILL} ${formatId === item.id ? "bg-foreground text-background" : "border border-border bg-card"}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {mode === "sponsor" ? (
          <div className="max-h-56 space-y-1 overflow-auto rounded-3xl border border-border bg-card p-2">
            {sponsors.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">Todavía no hay logos para armar un video por marca.</p>
            ) : (
              sponsors.map((spot) => (
                <button
                  key={spot.id}
                  type="button"
                  disabled={recording}
                  onClick={() => setFocusId(spot.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                    focus?.id === spot.id ? "bg-foreground text-background" : "hover:bg-muted"
                  }`}
                >
                  <span className="font-mono text-[10px] tracking-[0.12em]">{padSpot(spot.id)}</span>
                  <span className="truncate text-sm font-medium">{spot.sponsor}</span>
                </button>
              ))
            )}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="rounded-full"
            disabled={Boolean(busy) || !assets || (mode === "sponsor" && !focus)}
            onClick={() => void recordOne(focus)}
          >
            {busy === "record" ? "Grabando…" : mode === "sponsor" ? "Generar este" : "Generar video"}
          </Button>
          {mode === "sponsor" ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={Boolean(busy) || sponsors.length === 0}
              onClick={() => void recordAll()}
            >
              {busy === "batch" ? batchLabel || "Grabando…" : `Generar los ${sponsors.length}`}
            </Button>
          ) : null}
          <Button type="button" variant="outline" className="rounded-full" onClick={() => void copyCaption()}>
            {copied ? "Texto copiado" : "Copiar caption"}
          </Button>
          <DownloadLogosButton positions={positions} />
        </div>

        {clips.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {clips.map((clip) => (
              <a
                key={clip.url}
                href={clip.url}
                download={clip.name}
                className="inline-flex items-center rounded-full bg-primary px-4 py-2 font-mono text-[10px] font-semibold tracking-[0.12em] text-primary-foreground"
              >
                Descargar {clip.brand}
              </a>
            ))}
          </div>
        ) : null}

        {loadError ? <p className="font-mono text-xs text-destructive">{loadError}</p> : null}

        <section className="rounded-3xl border border-border bg-card p-5">
          <p className="mono-label text-primary">textos del video · {locale === "en" ? "english" : "español"}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            El preview cambia al toque. Cada idioma tiene sus propios textos. Las ciudades salen en la maleta completa.{" "}
            {"{marca}"} es el partner, {"{ruta}"} se arma con los destinos, {"{n}"} es el número de marcas.
          </p>
          <div className="mt-4 space-y-4">
            <ReelTextField
              id="reel-cities"
              label={locale === "en" ? "Destinations (one per line)" : "Destinos (uno por línea)"}
              value={copy.cities.join("\n")}
              onChange={(value) => patchCopy({ cities: value.split("\n").slice(0, 6) })}
              multiline
              hint={
                locale === "en"
                  ? "Lisbon, Devcon, or whatever is actually happening."
                  : "Ya no incluye Compile Amsterdam. Podés poner Lisboa, Devcon, o lo que sí vas a hacer."
              }
            />
            <ReelTextField
              id="reel-going"
              label={locale === "en" ? "Before the cities" : "Antes de las ciudades"}
              value={copy.goingTo}
              onChange={(value) => patchCopy({ goingTo: value })}
            />
            <ReelTextField
              id="reel-supported"
              label={locale === "en" ? "After the brand count" : "Después del número de marcas"}
              value={copy.supported}
              onChange={(value) => patchCopy({ supported: value })}
            />
            <ReelTextField
              id="reel-count"
              label={locale === "en" ? "Count line" : "Línea del recuento"}
              value={copy.countLine}
              onChange={(value) => patchCopy({ countLine: value })}
              hint="Usá {n} para el número."
            />
            <ReelTextField
              id="reel-kicker"
              label="Kicker"
              value={copy.kicker}
              onChange={(value) => patchCopy({ kicker: value })}
            />
            <ReelTextField
              id="reel-face"
              label={locale === "en" ? "When showing each face" : "Al mostrar cada cara"}
              value={copy.faceTitle}
              onChange={(value) => patchCopy({ faceTitle: value })}
            />
            <ReelTextField
              id="reel-mosaic"
              label={locale === "en" ? "Logo mosaic" : "Mosaico de logos"}
              value={copy.mosaicTitle}
              onChange={(value) => patchCopy({ mosaicTitle: value })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <ReelTextField
                id="reel-close-a"
                label={locale === "en" ? "Close, line 1" : "Cierre, línea 1"}
                value={copy.closeTitleA}
                onChange={(value) => patchCopy({ closeTitleA: value })}
              />
              <ReelTextField
                id="reel-close-b"
                label={locale === "en" ? "Close, line 2" : "Cierre, línea 2"}
                value={copy.closeTitleB}
                onChange={(value) => patchCopy({ closeTitleB: value })}
              />
            </div>
            <ReelTextField
              id="reel-close-body"
              label={locale === "en" ? "Close, body" : "Cierre, texto"}
              value={copy.closeBody}
              onChange={(value) => patchCopy({ closeBody: value })}
              multiline
            />
            <ReelTextField
              id="reel-sponsor-supported"
              label={locale === "en" ? "Per brand, under the logo" : "Por marca, debajo del logo"}
              value={copy.sponsorSupported}
              onChange={(value) => patchCopy({ sponsorSupported: value })}
            />
            <ReelTextField
              id="reel-sponsor-with"
              label={locale === "en" ? "Per brand, on the suitcase" : "Por marca, sobre la maleta"}
              value={copy.sponsorWithMe}
              onChange={(value) => patchCopy({ sponsorWithMe: value })}
            />
            <ReelTextField
              id="reel-sponsor-thanks"
              label={locale === "en" ? "Per brand, close" : "Por marca, cierre"}
              value={copy.sponsorThanks}
              onChange={(value) => patchCopy({ sponsorThanks: value })}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button type="button" className="rounded-full" onClick={() => void saveCopy()}>
              Guardar textos
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setPack((current) => {
                  const next = { ...current, [locale]: defaultReelCopy(locale) };
                  persistPack(next);
                  return next;
                });
                setSaveLabel("");
              }}
            >
              Restaurar
            </Button>
            {saveLabel ? <p className="text-xs text-muted-foreground">{saveLabel}</p> : null}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5">
          <p className="mono-label text-primary">texto del post</p>
          <pre className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{caption}</pre>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5">
          <p className="mono-label text-primary">para que se vea caro</p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
            {TIPS.map((tip) => (
              <li key={tip} className="pl-4 -indent-4">
                · {tip}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
