"use client";

import { useEffect, useState } from "react";
import { padSpot } from "@/lib/positions";

type Kind = "logo" | "comprobante";

export function AdminArtwork({
  positionId,
  sponsor,
  src,
  kind = "logo",
  size = "md",
}: {
  positionId: number;
  sponsor: string;
  src: string;
  kind?: Kind;
  size?: "sm" | "md" | "lg";
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!src) {
    return <p className="text-xs text-muted-foreground">{kind === "comprobante" ? "Sin comprobante" : "Sin logo"}</p>;
  }

  const title = `${sponsor || (kind === "comprobante" ? "Comprobante" : "Logo")} · ${padSpot(positionId)}`;
  const filename = downloadName(src, sponsor, positionId, kind);
  const apiHref = `/api/admin/artwork/${positionId}${kind === "comprobante" ? "?kind=comprobante" : ""}`;
  const label = kind === "comprobante" ? "Descargar comprobante" : "Descargar logo";
  const box =
    size === "lg" ? "h-40 w-40" : size === "sm" ? "h-16 w-16" : "h-36 w-36";

  async function saveFile(event?: React.MouseEvent) {
    event?.preventDefault();
    setBusy(true);
    setError("");
    try {
      await downloadBlob(src, filename, apiHref);
    } catch {
      setError("No se pudo bajar. Probá clic derecho → Guardar.");
      window.open(apiHref, "_blank", "noopener,noreferrer");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={size === "sm" ? "flex flex-col gap-2" : "flex flex-col gap-3 sm:flex-row sm:items-start"}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`overflow-hidden rounded-xl border border-border bg-white ${box}`}
          aria-label={`Ver ${title} en grande`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={title} className="h-full w-full object-contain p-1.5" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <a
            href={apiHref}
            download={filename}
            onClick={(event) => void saveFile(event)}
            className="inline-flex h-12 min-h-12 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            {busy ? "Bajando archivo…" : label}
          </a>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-10 items-center justify-center rounded-full border border-border px-4 text-sm"
          >
            Ampliar
          </button>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col gap-3 rounded-2xl bg-background p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="mono-label text-primary">{kind === "comprobante" ? "comprobante" : "logo"}</p>
                <p className="mt-1 text-sm font-medium">{title}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-border px-3 py-1 font-mono text-[10px] tracking-[0.08em]"
              >
                Cerrar
              </button>
            </div>
            <div className="flex min-h-[240px] items-center justify-center overflow-auto rounded-xl bg-muted/50 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={title} className="max-h-[70vh] max-w-full object-contain" />
            </div>
            <a
              href={apiHref}
              download={filename}
              onClick={(event) => void saveFile(event)}
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground sm:w-fit"
            >
              {busy ? "Bajando archivo…" : `${label} (${filename})`}
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}

function downloadName(src: string, sponsor: string, positionId: number, kind: Kind) {
  const mime = /^data:(image\/[a-z0-9.+-]+)/i.exec(src)?.[1]?.toLowerCase() ?? "";
  const ext = mime.includes("svg")
    ? "svg"
    : mime.includes("webp")
      ? "webp"
      : mime.includes("jpeg") || mime.includes("jpg")
        ? "jpg"
        : "png";
  const brand =
    sponsor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "logo";
  const spot = padSpot(positionId);
  return kind === "comprobante" ? `cbiux-${spot}-${brand}-comprobante.${ext}` : `cbiux-${spot}-${brand}.${ext}`;
}

async function downloadBlob(src: string, filename: string, apiHref: string) {
  let blob: Blob | null = null;
  if (src.startsWith("data:")) {
    blob = await (await fetch(src)).blob();
  }
  if (!blob || !blob.size) {
    const response = await fetch(apiHref, { credentials: "same-origin" });
    if (response.ok) blob = await response.blob();
  }
  if (!blob || !blob.size) {
    throw new Error("EMPTY");
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
