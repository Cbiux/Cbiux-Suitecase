"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  REEL_DURATION,
  REEL_FORMATS,
  REEL_FPS,
  pickRecorderMime,
  recorderExtension,
  reelCaption,
  reelFormat,
  type ReelFormatId,
} from "@/lib/reel";
import { drawReelFrame, prepareReelAssets, type ReelAssets } from "@/lib/reel-render";
import type { LivePosition } from "@/lib/types";

const TIPS = [
  "En Instagram o TikTok poné un audio de tendencia en los primeros 3 segundos. El archivo sale sin música a propósito.",
  "Etiquetá a cada partner en el post. Eso es lo que más les sirve: aparición real + mención.",
  "El primer corte muestra el número de marcas. No lo tapes con stickers.",
  "Si el archivo sale .webm, abrilo en CapCut y exportá MP4. En iPhone suele salir MP4 directo.",
  "Subí también el carrusel estático (/story-carousel) el mismo día: el reel abre, el carrusel explica.",
];

export function ReelStudio({ positions }: { positions: LivePosition[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [formatId, setFormatId] = useState<ReelFormatId>("reels");
  const [assets, setAssets] = useState<ReelAssets | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState<"prep" | "record" | "">("prep");
  const [file, setFile] = useState<{ url: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const format = reelFormat(formatId);

  const caption = useMemo(
    () =>
      reelCaption({
        sold: assets?.sold ?? positions.filter((spot) => spot.status === "sold").length,
        available: assets?.available ?? positions.filter((spot) => spot.status === "available").length,
        brands: assets?.brands ?? [],
      }),
    [assets, positions],
  );

  useEffect(() => {
    let live = true;
    setBusy("prep");
    setLoadError("");
    prepareReelAssets(positions).then(
      (ready) => {
        if (!live) return;
        setAssets(ready);
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
    if (!canvas || !ctx || !assets || busy === "record") return;
    canvas.width = format.width;
    canvas.height = format.height;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = ((now - start) / 1000) % REEL_DURATION;
      drawReelFrame(ctx, t, assets, format);
      if (barRef.current) barRef.current.style.width = `${Math.round((t / REEL_DURATION) * 100)}%`;
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [assets, format, busy]);

  useEffect(() => {
    return () => {
      if (file?.url) URL.revokeObjectURL(file.url);
    };
  }, [file]);

  async function record() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !assets) return;
    const mime = pickRecorderMime();
    if (!mime || typeof MediaRecorder === "undefined") {
      setLoadError("Este navegador no puede grabar video. Probá Chrome o Safari.");
      return;
    }
    setBusy("record");
    setLoadError("");
    if (file?.url) URL.revokeObjectURL(file.url);
    setFile(null);
    canvas.width = format.width;
    canvas.height = format.height;
    drawReelFrame(ctx, 0, assets, format);
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
        const t = Math.min(REEL_DURATION, (performance.now() - started) / 1000);
        drawReelFrame(ctx, t, assets, format);
        if (barRef.current) barRef.current.style.width = `${Math.round((t / REEL_DURATION) * 100)}%`;
        if (t >= REEL_DURATION) {
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
    try {
      const blob = await done;
      const ext = recorderExtension(mime);
      setFile({
        url: URL.createObjectURL(blob),
        name: `${format.file}.${ext}`,
      });
    } catch {
      setLoadError("No se pudo terminar el video. Reintentá.");
    }
    setBusy("");
  }

  async function copyCaption() {
    await navigator.clipboard.writeText(caption);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

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
            : busy === "record"
              ? "Grabando el reel…"
              : `${format.width}×${format.height} · ${REEL_DURATION.toFixed(0)} s`}
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {REEL_FORMATS.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={busy === "record"}
              onClick={() => setFormatId(item.id)}
              className={`rounded-full px-4 py-2 font-mono text-[10px] font-semibold tracking-[0.12em] ${
                formatId === item.id ? "bg-foreground text-background" : "border border-border bg-card"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" className="rounded-full" disabled={Boolean(busy) || !assets} onClick={() => void record()}>
            {busy === "record" ? "Grabando…" : "Generar video"}
          </Button>
          {file ? (
            <a
              href={file.url}
              download={file.name}
              className="inline-flex items-center rounded-full bg-primary px-4 py-2 font-mono text-[10px] font-semibold tracking-[0.12em] text-primary-foreground"
            >
              Descargar {file.name.endsWith(".mp4") ? "MP4" : "WEBM"}
            </a>
          ) : null}
          <Button type="button" variant="outline" className="rounded-full" onClick={() => void copyCaption()}>
            {copied ? "Texto copiado" : "Copiar caption"}
          </Button>
        </div>

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
