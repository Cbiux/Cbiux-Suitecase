"use client";

import { useEffect, useState } from "react";
import { padSpot } from "@/lib/positions";
import { thanksBrand } from "@/lib/poster-kit";
import { PosterCard } from "./poster-card";

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
  const [logoSrc, setLogoSrc] = useState(logo);
  const brand = thanksBrand(sponsor, fallbackName);
  const name = sponsor || fallbackName;

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

  const labels = {
    downloadLabel: "Descargar para Instagram",
    copyingLabel: "Armando PNG…",
    copyLabel: "Copiar texto del post",
    copiedLabel: "Texto copiado",
    errorLabel: "No se pudo armar el PNG. Probá de nuevo.",
    previewLabel: "Armando preview…",
  };

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <p className="mono-label text-primary">instagram · 2 posts</p>
      <p className="mt-1 truncate text-lg font-medium">{brand}</p>
      <p className="mt-1 text-sm text-muted-foreground">posición {padSpot(positionId)}</p>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <PosterCard
          kind="thanks"
          brand={brand}
          name={name}
          positionId={positionId}
          logoSrc={logoSrc}
          label="Post 1 · agradecimiento"
          {...labels}
        />
        <PosterCard
          kind="spot"
          brand={brand}
          name={name}
          positionId={positionId}
          logoSrc={logoSrc}
          label="Post 2 · vista de la maleta"
          {...labels}
        />
      </div>
    </article>
  );
}
