"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DownloadLogosButton } from "./download-logos-button";
import { Button } from "@/components/ui/button";
import { slugBrand } from "@/lib/logo-file";
import { padSpot } from "@/lib/positions";
import {
  REEL_DURATION,
  REEL_FORMATS,
  REEL_FPS,
  SPONSOR_REEL_DURATION,
  pickRecorderMime,
  recorderExtension,
  reelCaption,
  reelFormat,
  sponsorReelCaption,
  type ReelFormatId,
} from "@/lib/reel";
import {
  drawReelFrame,
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
  "Generar todos tarda unos 8 segundos por partner. No cierres la pestaña.",
  "Si el archivo sale .webm, abrilo en CapCut y exportá MP4.",
];

function clipName(spot: LoadedPlate, ext: string) {
  return `cbiux-gracias-${padSpot(spot.id)}-${slugBrand(spot.sponsor)}.${ext}`;
}

function saveFile(url: string, name: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
}

export function ReelStudio({ positions }: { positions: LivePosition[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [formatId, setFormatId] = useState<ReelFormatId>("reels");
  const [mode, setMode] = useState<Mode>("sponsor");
  const [assets, setAssets] = useState<ReelAssets | null>(null);
  const [focusId, setFocusId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState<"prep" | "record" | "batch" | "">("prep");
  const [batchLabel, setBatchLabel] = useState("");
  const [clips, setClips] = useState<Clip[]>([]);
  const [copied, setCopied] = useState(false);
  const format = reelFormat(formatId);
  const sponsors = assets ? sponsorPlates(assets) : [];
  const focus = mode === "sponsor" ? (sponsors.find((spot) => spot.id === focusId) ?? sponsors[0] ?? null) : null;
  const duration = focus ? SPONSOR_REEL_DURATION : REEL_DURATION;

  const caption = useMemo(() => {
    if (focus) return sponsorReelCaption(focus.sponsor);
    return reelCaption({
      sold: assets?.sold ?? positions.filter((spot) => spot.status === "sold").length,
      brands: assets?.brands ?? [],
    });
  }, [assets, focus, positions]);

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
      drawReelFrame(ctx, t, assets, format, focus);
      if (barRef.current) barRef.current.style.width = `${Math.round((t / duration) * 100)}%`;
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [assets, format, busy, focus, duration]);

  useEffect(() => {
    return () => {
      clips.forEach((clip) => URL.revokeObjectURL(clip.url));
    };
  }, [clips]);

  async function capture(draw: (t: number) => void, length: number) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) throw new Error("CANVAS");
    const mime = pickRecorderMime();
    if (!mime || typeof MediaRecorder === "undefined") throw new Error("RECORDER");
    canvas.width = format.width;
    canvas.height = format.height;
    draw(0);
    const stream = canvas.captureStream(REEL_FPS);
    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
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
    stream.getTracks().forEach((track) => track.stop());
    const blob = await done;
    return { blob, ext: recorderExtension(mime) };
  }

  async function recordOne(spot: LoadedPlate | null) {
    if (!assets) return;
    setBusy("record");
    setLoadError("");
    try {
      const length = spot ? SPONSOR_REEL_DURATION : REEL_DURATION;
      const { blob, ext } = await capture(
        (t) => drawReelFrame(canvasRef.current!.getContext("2d")!, t, assets, format, spot),
        length,
      );
      const url = URL.createObjectURL(blob);
      const clip: Clip = spot
        ? {
            url,
            name: clipName(spot, ext),
            brand: spot.sponsor,
            caption: sponsorReelCaption(spot.sponsor),
          }
        : {
            url,
            name: `${format.file}.${ext}`,
            brand: "Maleta completa",
            caption: reelCaption({
              sold: assets.sold,
              brands: assets.brands,
            }),
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
          (t) => drawReelFrame(canvasRef.current!.getContext("2d")!, t, assets, format, spot),
          SPONSOR_REEL_DURATION,
        );
        const url = URL.createObjectURL(blob);
        const clip: Clip = {
          url,
          name: clipName(spot, ext),
          brand: spot.sponsor,
          caption: sponsorReelCaption(spot.sponsor),
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
    <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
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
                : `${format.width}×${format.height} · ${duration.toFixed(0)} s`}
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={recording}
            onClick={() => setMode("sponsor")}
            className={`rounded-full px-4 py-2 font-mono text-[10px] font-semibold tracking-[0.12em] ${
              mode === "sponsor" ? "bg-foreground text-background" : "border border-border bg-card"
            }`}
          >
            Por patrocinador
          </button>
          <button
            type="button"
            disabled={recording}
            onClick={() => setMode("group")}
            className={`rounded-full px-4 py-2 font-mono text-[10px] font-semibold tracking-[0.12em] ${
              mode === "group" ? "bg-foreground text-background" : "border border-border bg-card"
            }`}
          >
            Maleta completa
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {REEL_FORMATS.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={recording}
              onClick={() => setFormatId(item.id)}
              className={`rounded-full px-4 py-2 font-mono text-[10px] font-semibold tracking-[0.12em] ${
                formatId === item.id ? "bg-foreground text-background" : "border border-border bg-card"
              }`}
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
