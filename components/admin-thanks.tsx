"use client";

import { useEffect, useId, useState } from "react";
import { SITE } from "@/lib/config";
import { padSpot } from "@/lib/positions";
import {
  THANKS_POSTER,
  renderThanksPng,
  thanksBrand,
  thanksCaption,
  thanksFilename,
} from "@/lib/thanks-poster";

export function AdminThanksCard({
  positionId,
  sponsor,
  fallbackName,
  logo,
}: {
  positionId: number;
  sponsor: string;
  fallbackName: string;
  logo: string;
}) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [logoSrc, setLogoSrc] = useState(logo);
  const brand = thanksBrand(sponsor, fallbackName);
  const caption = thanksCaption(sponsor || fallbackName, positionId);
  const filename = thanksFilename(sponsor || fallbackName, positionId);

  useEffect(() => {
    let objectUrl = "";
    const controller = new AbortController();
    fetch(`/api/admin/artwork/${positionId}`, { credentials: "same-origin", signal: controller.signal })
      .then((response) => (response.ok ? response.blob() : Promise.reject()))
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setLogoSrc(objectUrl);
      })
      .catch(() => setLogoSrc(logo));
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [logo, positionId]);

  async function download() {
    setBusy(true);
    setError("");
    try {
      const blob = await renderThanksPng({ brand, positionId, logoSrc });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("No se pudo armar el PNG. Probá de nuevo.");
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
      setError("No se pudo copiar el texto.");
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <p className="mono-label text-primary">instagram · 1080×1350</p>
      <p className="mt-1 truncate text-lg font-medium">{brand}</p>
      <p className="mt-1 text-sm text-muted-foreground">posición {padSpot(positionId)}</p>
      <div className="mt-4 overflow-hidden rounded-[1.4rem] border border-border bg-[#f7f7f4]">
        <ThanksPosterSvg positionId={positionId} brand={brand} logoSrc={logoSrc} />
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => void download()}
          className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          {busy ? "Armando PNG…" : "Descargar para Instagram"}
        </button>
        <button
          type="button"
          onClick={() => void copyCaption()}
          className="inline-flex h-10 items-center justify-center rounded-full border border-border px-4 text-sm"
        >
          {copied ? "Texto copiado" : "Copiar texto del post"}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </article>
  );
}

function ThanksPosterSvg({
  positionId,
  brand,
  logoSrc,
}: {
  positionId: number;
  brand: string;
  logoSrc: string;
}) {
  const uid = useId().replace(/:/g, "");
  const titleSize = brand.length > 22 ? 52 : brand.length > 14 ? 62 : 72;

  return (
    <svg
      viewBox={`0 0 ${THANKS_POSTER.width} ${THANKS_POSTER.height}`}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      role="img"
      aria-label={`Agradecimiento a ${brand}, posición ${padSpot(positionId)}`}
      className="block h-auto w-full"
    >
      <defs>
        <pattern id={`grid-${uid}`} width="42" height="42" patternUnits="userSpaceOnUse">
          <path d="M42 0H0V42" fill="none" stroke="rgba(11,27,74,0.07)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="1080" height="1350" fill="#f7f7f4" />
      <rect width="1080" height="1350" fill={`url(#grid-${uid})`} />
      <rect x="0" y="0" width="18" height="1350" fill="#2c3fd1" />

      <g transform="translate(72,48)">
        <rect width="56" height="56" rx="12" fill="#2c3fd1" />
        <g transform="translate(12,12) scale(1)">
          <rect x="7" y="8" width="18" height="20" rx="4.5" fill="#fff" />
          <rect x="12.5" y="4" width="7" height="5" rx="1.6" fill="none" stroke="#fff" strokeWidth="1.8" />
          <rect x="11" y="14" width="10" height="2.2" rx="1.1" fill="#2c3fd1" />
          <rect x="11" y="18.5" width="10" height="2.2" rx="1.1" fill="#2c3fd1" />
        </g>
      </g>
      <text x="144" y="86" fill="#2c3fd1" fontFamily="Inter, system-ui, sans-serif" fontSize="22" fontWeight="700" letterSpacing="4">
        cbiux
      </text>
      <text
        x="1008"
        y="86"
        textAnchor="end"
        fill="#5c6478"
        fontFamily="JetBrains Mono, ui-monospace, monospace"
        fontSize="22"
        fontWeight="700"
        letterSpacing="3"
      >
        SPOT {padSpot(positionId)}
      </text>

      <text x="72" y="188" fill="#2c3fd1" fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="26" fontWeight="700" letterSpacing="6">
        GRACIAS
      </text>
      <text x="72" y="278" fill="#0b1b4a" fontFamily="Inter, system-ui, sans-serif" fontSize={titleSize} fontWeight="800">
        {brand}
      </text>
      <text x="72" y="348" fill="#5c6478" fontFamily="Inter, system-ui, sans-serif" fontSize="32" fontWeight="500">
        viaja en mi maleta de cabina
      </text>
      <text x="72" y="398" fill="#0b1b4a" fontFamily="Inter, system-ui, sans-serif" fontSize="32" fontWeight="600">
        Costa Rica → Europa → India
      </text>

      <rect x="120" y="470" width="840" height="540" rx="44" fill="#ffffff" />
      <image
        href={logoSrc}
        xlinkHref={logoSrc}
        x="168"
        y="510"
        width="744"
        height="460"
        preserveAspectRatio="xMidYMid meet"
      />

      <text x="72" y="1108" fill="#0b1b4a" fontFamily="Inter, system-ui, sans-serif" fontSize="30" fontWeight="600">
        Compilamos el viaje en vlog diario.
      </text>
      <text x="72" y="1162" fill="#5c6478" fontFamily="Inter, system-ui, sans-serif" fontSize="26">
        Compile Amsterdam · Devcon India
      </text>
      <text x="72" y="1268" fill="#2c3fd1" fontFamily="Inter, system-ui, sans-serif" fontSize="24" fontWeight="700" letterSpacing="1.4">
        @{SITE.x}
      </text>
      <text
        x="1008"
        y="1268"
        textAnchor="end"
        fill="#5c6478"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="22"
        fontWeight="600"
      >
        cbiux-suitcase.vercel.app
      </text>
    </svg>
  );
}
