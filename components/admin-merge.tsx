"use client";

import { useMemo, useState } from "react";
import { AdminArtwork } from "@/components/admin-artwork";
import { adminActionBtn, mailErrorLabel } from "@/components/admin-ui";
import { FACE_ORDER, padSpot } from "@/lib/positions";
import { groupedMemberIds, neighborIds, visiblePlates } from "@/lib/spot-groups";
import type { Face, LivePosition } from "@/lib/types";

const FACE_ES: Record<Face, string> = {
  front: "Frente",
  back: "Atrás",
  left: "Contrario",
  right: "Lado",
};

export function AdminMerge({
  positions,
  onUpdate,
}: {
  positions: LivePosition[];
  onUpdate: (id: number, patch: Record<string, unknown>) => Promise<void>;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const byId = useMemo(
    () => new Map(positions.map((spot) => [spot.id, spot] as const)),
    [positions],
  );
  const plates = useMemo(() => visiblePlates(positions).filter((plate) => plate.memberIds.length > 1), [positions]);
  const pickedSpot = picked ? byId.get(picked) : undefined;
  const pickedGroup = picked ? groupedMemberIds(positions, picked) : [];
  const neighbors = picked
    ? [...new Set(pickedGroup.flatMap((id) => neighborIds(id)))].filter((id) => {
        const spot = byId.get(id);
        if (!spot || spot.status === "available") return false;
        return !pickedGroup.includes(id);
      })
    : [];

  async function glue(otherId: number) {
    if (!picked) return;
    setError("");
    setBusy(true);
    try {
      await onUpdate(picked, { mergeWith: otherId });
    } catch (err) {
      setError(mailErrorLabel(err instanceof Error ? err.message : "UPDATE_FAILED"));
    } finally {
      setBusy(false);
    }
  }

  async function split(positionId: number) {
    setError("");
    setBusy(true);
    try {
      await onUpdate(positionId, { unmerge: true });
      setPicked(null);
    } catch (err) {
      setError(mailErrorLabel(err instanceof Error ? err.message : "UPDATE_FAILED"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2 className="text-xl font-medium">Juntar espacios</h2>
      <p className="mt-1 max-w-[62ch] text-sm text-muted-foreground">
        Si alguien compró dos (o más) espacios pegados, acá los unís en una placa más grande para un solo logo.
        Tocá un espacio reservado o vendido y después un vecino.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {FACE_ORDER.map((face) => {
          const spots = positions.filter((spot) => spot.face === face);
          return (
            <article key={face} className="rounded-2xl border border-border bg-card p-4">
              <p className="mono-label text-primary">{FACE_ES[face]}</p>
              <div className="relative mt-4 aspect-[3/4] overflow-hidden rounded-xl bg-muted/40">
                {spots.map((spot) => {
                  const members = groupedMemberIds(positions, spot.id);
                  const grouped = members.length > 1;
                  const selected = pickedGroup.includes(spot.id);
                  return (
                    <button
                      key={spot.id}
                      type="button"
                      disabled={busy}
                      onClick={() => setPicked(spot.id === picked ? null : spot.id)}
                      className={`absolute box-border rounded-md font-mono text-[10px] font-semibold ${
                        selected
                          ? "bg-primary text-primary-foreground"
                          : grouped
                            ? "bg-[#b6efcf] text-[#147a4b]"
                            : spot.status === "sold"
                              ? "border border-[#147a4b] bg-background"
                              : spot.status === "reserved"
                                ? "border border-[#e6b800] bg-[#fff8e4] text-[#6b4f00]"
                                : "border border-border bg-background/80 text-muted-foreground"
                      }`}
                      style={{
                        left: `${spot.x}%`,
                        top: `${spot.y}%`,
                        width: `${spot.width}%`,
                        height: `${spot.height}%`,
                      }}
                    >
                      {padSpot(spot.id)}
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>

      {pickedSpot ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <p className="font-medium">
            Posición {padSpot(pickedSpot.id)}
            {pickedSpot.sponsor ? ` · ${pickedSpot.sponsor}` : ""}
            {pickedGroup.length > 1
              ? ` · pegada (${pickedGroup.map(padSpot).join(" + ")})`
              : ""}
          </p>
          {pickedSpot.status === "available" ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Este espacio está libre. Pegá espacios que ya estén reservados o vendidos.
            </p>
          ) : neighbors.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {neighbors.map((id) => {
                const other = byId.get(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`${adminActionBtn} bg-primary text-primary-foreground border-transparent`}
                    disabled={busy}
                    onClick={() => void glue(id)}
                  >
                    Pegar con {padSpot(id)}
                    {other?.sponsor ? ` · ${other.sponsor}` : ""}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No hay vecinos reservados o vendidos para pegar.
            </p>
          )}
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">Elegí un espacio en el mapa.</p>
      )}

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      <div className="mt-8 space-y-4">
        <h3 className="text-lg font-medium">Placas juntas</h3>
        {plates.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Todavía no hay espacios pegados.
          </p>
        ) : (
          plates.map((plate) => (
            <article key={plate.memberIds.join("-")} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="mono-label text-primary">
                    {plate.memberIds.map(padSpot).join(" + ")}
                  </p>
                  <p className="mt-1 text-lg font-medium">{plate.sponsor || plate.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {FACE_ES[plate.face]} · {plate.size} para el logo
                  </p>
                </div>
                <button
                  type="button"
                  className={`${adminActionBtn} border-destructive text-destructive`}
                  disabled={busy}
                  onClick={() => void split(plate.id)}
                >
                  Separar
                </button>
              </div>
              <div className="mt-4">
                <AdminArtwork
                  positionId={plate.id}
                  sponsor={plate.sponsor}
                  src={plate.logo}
                  panelSize={plate.size}
                  size="lg"
                  onReplace={(logo) => onUpdate(plate.id, { logo })}
                />
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
