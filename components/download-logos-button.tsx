"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { downloadLogosFolder } from "@/lib/logo-pack";
import { visiblePlates } from "@/lib/spot-groups";
import type { LivePosition } from "@/lib/types";

export function DownloadLogosButton({
  positions,
  className,
}: {
  positions: LivePosition[];
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const count = visiblePlates(positions).filter((spot) => Boolean(spot.logo)).length;

  async function save() {
    setError("");
    setBusy(true);
    try {
      await downloadLogosFolder(positions);
    } catch {
      setError("No se pudo armar el ZIP. Reintentá.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant="outline"
        className="rounded-full"
        disabled={busy || count === 0}
        title="Baja logos.zip con carpetas frente, atras, lado y contrario"
        onClick={() => void save()}
      >
        {busy ? "Armando ZIP…" : count ? `Descargar ${count} logos` : "Descargar logos"}
      </Button>
      {error ? <p className="mt-2 font-mono text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
