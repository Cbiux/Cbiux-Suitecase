"use client";

import { useEffect, useState } from "react";
import { padSpot } from "@/lib/positions";
import { renderSpotPng, spotCaption, spotFilename } from "@/lib/spot-poster";
import { renderThanksPng, thanksCaption, thanksFilename } from "@/lib/thanks-poster";
import type { Locale } from "@/lib/types";

export function PosterCard({
  kind,
  brand,
  name,
  positionId,
  logoSrc,
  locale = "es",
  label,
  downloadLabel,
  copyingLabel,
  copyLabel,
  copiedLabel,
  errorLabel,
  previewLabel,
}: {
  kind: "thanks" | "spot";
  brand: string;
  name: string;
  positionId: number;
  logoSrc: string;
  locale?: Locale;
  label: string;
  downloadLabel: string;
  copyingLabel: string;
  copyLabel: string;
  copiedLabel: string;
  errorLabel: string;
  previewLabel: string;
}) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const thanks = kind === "thanks";
  const alt = thanks
    ? `${brand}, posición ${padSpot(positionId)}`
    : `${brand} en la maleta, posición ${padSpot(positionId)}`;
  const filename = thanks ? thanksFilename(name, positionId) : spotFilename(name, positionId);
  const caption = thanks ? thanksCaption(name, positionId, locale) : spotCaption(name, positionId, locale);

  useEffect(() => {
    let previewUrl = "";
    let cancelled = false;
    setPreview("");
    setError("");
    const job = thanks
      ? renderThanksPng({ brand, positionId, logoSrc })
      : renderSpotPng({ brand, positionId, logoSrc });
    void job
      .then((blob) => {
        if (cancelled) return;
        previewUrl = URL.createObjectURL(blob);
        setPreview(previewUrl);
      })
      .catch(() => {
        if (!cancelled) setError(errorLabel);
      });
    return () => {
      cancelled = true;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [thanks, brand, positionId, logoSrc, errorLabel]);

  async function download() {
    setBusy(true);
    setError("");
    try {
      const blob = thanks
        ? await renderThanksPng({ brand, positionId, logoSrc })
        : await renderSpotPng({ brand, positionId, logoSrc });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError(errorLabel);
    } finally {
      setBusy(false);
    }
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError(errorLabel);
    }
  }

  return (
    <div>
      <p className="mono-label text-muted-foreground">{label}</p>
      <div className="mt-2 overflow-hidden rounded-[1.4rem] border border-border bg-[#f7f7f4]">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={alt} className="block h-auto w-full" />
        ) : (
          <div className="flex aspect-[1080/1350] items-center justify-center px-6 text-center text-sm text-muted-foreground">
            {previewLabel}
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => void download()}
          className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          {busy ? copyingLabel : downloadLabel}
        </button>
        <button
          type="button"
          onClick={() => void copyCaption()}
          className="inline-flex h-10 items-center justify-center rounded-full border border-border px-4 text-sm"
        >
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
