"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminActionBtn, adminGhostBtn, mailErrorLabel } from "@/components/admin-ui";
import {
  cityPresets,
  defaultSiteContent,
  emptyVisit,
  pickLocale,
  visitFromPreset,
  type Localized,
  type SiteContent,
  type SiteVisit,
} from "@/lib/site-content";
import { padStop } from "@/lib/trip-route";
import type { Locale } from "@/lib/types";

const fieldClass =
  "min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function moveItem<T>(list: T[], index: number, direction: -1 | 1) {
  const next = index + direction;
  if (next < 0 || next >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(index, 1);
  copy.splice(next, 0, item);
  return copy;
}

function LocInput({
  id,
  label,
  value,
  locale,
  onChange,
  multiline,
}: {
  id: string;
  label: string;
  value: Localized;
  locale: Locale;
  onChange: (value: Localized) => void;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {multiline ? (
        <textarea
          id={id}
          className={fieldClass}
          value={value[locale]}
          onChange={(event) => onChange({ ...value, [locale]: event.target.value })}
        />
      ) : (
        <Input
          id={id}
          value={value[locale]}
          onChange={(event) => onChange({ ...value, [locale]: event.target.value })}
        />
      )}
    </div>
  );
}

export function AdminRoute({
  initial,
  onSaved,
}: {
  initial: SiteContent;
  onSaved?: (next: SiteContent) => void;
}) {
  const presets = useMemo(() => cityPresets(), []);
  const [draft, setDraft] = useState<SiteContent>(initial);
  const [locale, setLocale] = useState<Locale>("es");
  const [presetKey, setPresetKey] = useState(presets[0] ? `${presets[0].lat},${presets[0].lng}` : "custom");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  function setVisits(visits: SiteVisit[]) {
    setDraft((current) => ({ ...current, visits }));
    setOk("");
  }

  function addCity() {
    if (presetKey === "custom") {
      const created = emptyVisit();
      setVisits([...draft.visits, created]);
      setOpenId(created.id);
      return;
    }
    const preset = presets.find((item) => `${item.lat},${item.lng}` === presetKey);
    const created = preset ? visitFromPreset(preset) : emptyVisit();
    setVisits([...draft.visits, created]);
    setOpenId(created.id);
  }

  async function save() {
    setError("");
    setOk("");
    setBusy(true);
    try {
      const latestRes = await fetch("/api/admin/spots", { cache: "no-store" });
      const latest = (await latestRes.json().catch(() => ({}))) as { siteContent?: SiteContent };
      const content: SiteContent = {
        ...(latest.siteContent ?? draft),
        visits: draft.visits,
        route: draft.route,
        outboundHops: draft.outboundHops,
      };
      const response = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; siteContent?: SiteContent };
      if (!response.ok) throw new Error(body.error || "UPDATE_FAILED");
      if (body.siteContent) {
        setDraft(body.siteContent);
        onSaved?.(body.siteContent);
      }
      setOk("Ruta guardada. Recargá la página pública para ver el mapa.");
    } catch (err) {
      setError(mailErrorLabel(err instanceof Error ? err.message : "UPDATE_FAILED"));
    } finally {
      setBusy(false);
    }
  }

  function restoreCities() {
    if (!window.confirm("Esto vuelve las ciudades a la ruta original. Los textos de la home no se tocan. ¿Continuar?")) {
      return;
    }
    const defaults = defaultSiteContent();
    setDraft((current) => ({
      ...current,
      visits: defaults.visits,
      outboundHops: defaults.outboundHops,
    }));
    setOk("");
    setOpenId(null);
  }

  return (
    <section>
      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-start justify-between gap-3 border-b border-border bg-background/95 px-1 py-3 backdrop-blur">
        <div>
          <h2 className="text-xl font-medium">Ruta y ciudades</h2>
          <p className="mt-1 max-w-[62ch] text-sm text-muted-foreground">
            Agregá, quitá o reordená las ciudades del globo. Si no vas a una, quitala o marcala como cancelada.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-full border border-border bg-card">
            {(["es", "en"] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLocale(code)}
                className={`min-h-9 px-3 font-mono text-[10px] font-semibold tracking-[0.12em] ${
                  locale === code ? "bg-foreground text-background" : "text-muted-foreground"
                }`}
              >
                {code === "es" ? "Español" : "English"}
              </button>
            ))}
          </div>
          <button type="button" className={adminGhostBtn} disabled={busy} onClick={restoreCities}>
            Restaurar ciudades
          </button>
          <button
            type="button"
            className={`${adminActionBtn} border-transparent bg-primary text-primary-foreground`}
            disabled={busy}
            onClick={() => void save()}
          >
            {busy ? "Guardando…" : "Guardar ruta"}
          </button>
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      {ok ? <p className="mt-3 text-sm text-[#147a4b]">{ok}</p> : null}

      <div className="mt-6 space-y-3">
        <LocInput
          id="route-title"
          label="Título de la sección"
          value={draft.route.title}
          locale={locale}
          onChange={(title) => {
            setDraft((current) => ({ ...current, route: { ...current.route, title } }));
            setOk("");
          }}
        />
        <LocInput
          id="route-body"
          label="Texto bajo el título"
          value={draft.route.body}
          locale={locale}
          onChange={(body) => {
            setDraft((current) => ({ ...current, route: { ...current.route, body } }));
            setOk("");
          }}
          multiline
        />
        <LocInput
          id="route-hint"
          label="Ayuda bajo el mapa"
          value={draft.route.hint}
          locale={locale}
          onChange={(hint) => {
            setDraft((current) => ({ ...current, route: { ...current.route, hint } }));
            setOk("");
          }}
        />
        <div className="space-y-1.5">
          <Label htmlFor="outbound-hops">Tramos de ida (el resto se dibuja como vuelta)</Label>
          <Input
            id="outbound-hops"
            type="number"
            min={0}
            max={40}
            value={draft.outboundHops}
            onChange={(event) => {
              const outboundHops = Number(event.target.value);
              setDraft((current) => ({ ...current, outboundHops }));
              setOk("");
            }}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="preset-city">Agregar ciudad</Label>
          <select
            id="preset-city"
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={presetKey}
            onChange={(event) => setPresetKey(event.target.value)}
          >
            {presets.map((item) => (
              <option key={`${item.lat},${item.lng}`} value={`${item.lat},${item.lng}`}>
                {pickLocale("es", item.city)} · {pickLocale("es", item.region)}
              </option>
            ))}
            <option value="custom">Otra ciudad (escribo el nombre)</option>
          </select>
        </div>
        <button type="button" className={`${adminActionBtn} bg-foreground text-background`} onClick={addCity}>
          Agregar
        </button>
      </div>

      <ol className="mt-4 space-y-2">
        {draft.visits.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            No hay ciudades. Agregá las que sí vas a visitar.
          </p>
        ) : (
          draft.visits.map((visit, index) => {
            const open = openId === visit.id;
            const cancelled = visit.status === "cancelled";
            return (
              <li key={visit.id} className="rounded-2xl border border-border bg-card">
                <div className="flex flex-wrap items-center gap-2 p-3">
                  <span className="font-mono text-[10px] font-semibold tracking-[0.12em] text-primary">
                    {padStop(index)}
                  </span>
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setOpenId(open ? null : visit.id)}
                  >
                    <strong className={`block text-sm ${cancelled ? "text-muted-foreground line-through" : ""}`}>
                      {pickLocale(locale, visit.city) || "Sin nombre"}
                    </strong>
                    <span className="text-[11px] text-muted-foreground">
                      {cancelled
                        ? "Cancelada · no aparece en el globo"
                        : pickLocale(locale, visit.note) || pickLocale(locale, visit.region)}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={adminGhostBtn}
                    disabled={index === 0}
                    onClick={() => setVisits(moveItem(draft.visits, index, -1))}
                  >
                    Subir
                  </button>
                  <button
                    type="button"
                    className={adminGhostBtn}
                    disabled={index === draft.visits.length - 1}
                    onClick={() => setVisits(moveItem(draft.visits, index, 1))}
                  >
                    Bajar
                  </button>
                  <button
                    type="button"
                    className={adminGhostBtn}
                    onClick={() => setOpenId(open ? null : visit.id)}
                  >
                    {open ? "Cerrar" : "Editar"}
                  </button>
                  <button
                    type="button"
                    className={`${adminGhostBtn} text-destructive`}
                    onClick={() => {
                      if (!window.confirm(`¿Quitar ${pickLocale("es", visit.city) || "esta ciudad"} de la ruta?`)) {
                        return;
                      }
                      setVisits(draft.visits.filter((item) => item.id !== visit.id));
                    }}
                  >
                    Quitar
                  </button>
                </div>
                {open ? (
                  <div className="space-y-3 border-t border-border p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <LocInput
                        id={`${visit.id}-city`}
                        label="Ciudad"
                        value={visit.city}
                        locale={locale}
                        onChange={(city) =>
                          setVisits(draft.visits.map((item) => (item.id === visit.id ? { ...item, city } : item)))
                        }
                      />
                      <LocInput
                        id={`${visit.id}-region`}
                        label="País / región"
                        value={visit.region}
                        locale={locale}
                        onChange={(region) =>
                          setVisits(draft.visits.map((item) => (item.id === visit.id ? { ...item, region } : item)))
                        }
                      />
                      <LocInput
                        id={`${visit.id}-note`}
                        label="Nota (Compile, escala, etc.)"
                        value={visit.note}
                        locale={locale}
                        onChange={(note) =>
                          setVisits(draft.visits.map((item) => (item.id === visit.id ? { ...item, note } : item)))
                        }
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor={`${visit.id}-lat`}>Latitud</Label>
                          <Input
                            id={`${visit.id}-lat`}
                            type="number"
                            step="0.0001"
                            value={visit.lat}
                            onChange={(event) =>
                              setVisits(
                                draft.visits.map((item) =>
                                  item.id === visit.id ? { ...item, lat: Number(event.target.value) } : item,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`${visit.id}-lng`}>Longitud</Label>
                          <Input
                            id={`${visit.id}-lng`}
                            type="number"
                            step="0.0001"
                            value={visit.lng}
                            onChange={(event) =>
                              setVisits(
                                draft.visits.map((item) =>
                                  item.id === visit.id ? { ...item, lng: Number(event.target.value) } : item,
                                ),
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={cancelled}
                        onChange={(event) =>
                          setVisits(
                            draft.visits.map((item) =>
                              item.id === visit.id
                                ? { ...item, status: event.target.checked ? "cancelled" : "planned" }
                                : item,
                            ),
                          )
                        }
                      />
                      No voy a esta ciudad (se tacha y sale del globo)
                    </label>
                  </div>
                ) : null}
              </li>
            );
          })
        )}
      </ol>
    </section>
  );
}
