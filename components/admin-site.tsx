"use client";

import { useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminActionBtn, adminGhostBtn, mailErrorLabel } from "@/components/admin-ui";
import {
  defaultSiteContent,
  emptyCard,
  emptyPoint,
  type Localized,
  type SiteCard,
  type SiteContent,
} from "@/lib/site-content";
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

function LocField({
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
  const current = value[locale];
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {multiline ? (
        <textarea
          id={id}
          className={fieldClass}
          value={current}
          onChange={(event) => onChange({ ...value, [locale]: event.target.value })}
        />
      ) : (
        <Input
          id={id}
          value={current}
          onChange={(event) => onChange({ ...value, [locale]: event.target.value })}
        />
      )}
    </div>
  );
}

function CardEditor({
  card,
  locale,
  kickerLabel,
  onChange,
  onRemove,
  onMove,
  canMoveUp,
  canMoveDown,
}: {
  card: SiteCard;
  locale: Locale;
  kickerLabel: string;
  onChange: (card: SiteCard) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  return (
    <article className="space-y-3 rounded-2xl border border-border bg-background p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <LocField
          id={`${card.id}-kicker`}
          label={kickerLabel}
          value={card.kicker}
          locale={locale}
          onChange={(kicker) => onChange({ ...card, kicker })}
        />
        <LocField
          id={`${card.id}-title`}
          label="Título"
          value={card.title}
          locale={locale}
          onChange={(title) => onChange({ ...card, title })}
        />
      </div>
      <LocField
        id={`${card.id}-body`}
        label="Texto"
        value={card.body}
        locale={locale}
        onChange={(body) => onChange({ ...card, body })}
        multiline
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" className={adminGhostBtn} disabled={!canMoveUp} onClick={() => onMove(-1)}>
          Subir
        </button>
        <button type="button" className={adminGhostBtn} disabled={!canMoveDown} onClick={() => onMove(1)}>
          Bajar
        </button>
        <button type="button" className={`${adminGhostBtn} text-destructive`} onClick={onRemove}>
          Quitar
        </button>
      </div>
    </article>
  );
}

export function AdminSite({
  initial,
  onSaved,
}: {
  initial: SiteContent;
  onSaved?: (next: SiteContent) => void;
}) {
  const [draft, setDraft] = useState<SiteContent>(initial);
  const [locale, setLocale] = useState<Locale>("es");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  function patch<K extends keyof SiteContent>(key: K, value: SiteContent[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setOk("");
  }

  async function save() {
    setError("");
    setOk("");
    setBusy(true);
    try {
      const latestRes = await fetch("/api/admin/spots", { cache: "no-store" });
      const latest = (await latestRes.json().catch(() => ({}))) as { siteContent?: SiteContent };
      const content: SiteContent = {
        ...draft,
        visits: latest.siteContent?.visits ?? draft.visits,
        outboundHops: latest.siteContent?.outboundHops ?? draft.outboundHops,
        route: latest.siteContent?.route ?? draft.route,
        usdCrcRate: latest.siteContent?.usdCrcRate ?? draft.usdCrcRate,
        reel: latest.siteContent?.reel ?? draft.reel,
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
      setOk("Guardado. Recargá la página pública para verlo.");
    } catch (err) {
      setError(mailErrorLabel(err instanceof Error ? err.message : "UPDATE_FAILED"));
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!window.confirm("Esto vuelve los textos de la página a los originales. Las ciudades de la ruta no se tocan. ¿Continuar?")) {
      return;
    }
    setError("");
    setOk("");
    setBusy(true);
    try {
      const latestRes = await fetch("/api/admin/spots", { cache: "no-store" });
      const latest = (await latestRes.json().catch(() => ({}))) as { siteContent?: SiteContent };
      const defaults = defaultSiteContent();
      const content: SiteContent = {
        ...defaults,
        visits: latest.siteContent?.visits ?? defaults.visits,
        outboundHops: latest.siteContent?.outboundHops ?? defaults.outboundHops,
        route: latest.siteContent?.route ?? defaults.route,
        usdCrcRate: latest.siteContent?.usdCrcRate ?? draft.usdCrcRate,
        reel: latest.siteContent?.reel ?? draft.reel,
      };
      const response = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; siteContent?: SiteContent };
      if (!response.ok) throw new Error(body.error || "UPDATE_FAILED");
      const next = body.siteContent ?? defaultSiteContent();
      setDraft(next);
      onSaved?.(next);
      setOk("Volviste a los textos originales.");
    } catch (err) {
      setError(mailErrorLabel(err instanceof Error ? err.message : "UPDATE_FAILED"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-1 py-3 backdrop-blur">
        <div>
          <h2 className="text-xl font-medium">Textos de la página</h2>
          <p className="mt-1 max-w-[62ch] text-sm text-muted-foreground">
            Editá lo que se lee en la home: aviso, tarjetas, hero, extras. Las ciudades del mapa están en la pestaña
            Ruta. Si el inglés queda vacío, se usa el español.
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
          <button type="button" className={adminGhostBtn} disabled={busy} onClick={() => void reset()}>
            Restaurar original
          </button>
          <button
            type="button"
            className={`${adminActionBtn} border-transparent bg-primary text-primary-foreground`}
            disabled={busy}
            onClick={() => void save()}
          >
            {busy ? "Guardando…" : "Guardar textos"}
          </button>
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      {ok ? <p className="mt-3 text-sm text-[#147a4b]">{ok}</p> : null}

      <div className="mt-8 space-y-8">
        <Section title="Aviso en la página" hint="Sirve para cosas como “Compile se canceló”." open>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.banner.enabled}
              onChange={(event) => patch("banner", { ...draft.banner, enabled: event.target.checked })}
            />
            Mostrar aviso arriba de todo
          </label>
          <LocField
            id="banner-text"
            label="Texto del aviso"
            value={draft.banner.text}
            locale={locale}
            onChange={(text) => patch("banner", { ...draft.banner, text })}
            multiline
          />
        </Section>

        <Section title="Título de Google / redes">
          <LocField id="meta-title" label="Título" value={draft.meta.title} locale={locale} onChange={(title) => patch("meta", { ...draft.meta, title })} />
          <LocField
            id="meta-desc"
            label="Descripción"
            value={draft.meta.description}
            locale={locale}
            onChange={(description) => patch("meta", { ...draft.meta, description })}
            multiline
          />
        </Section>

        <Section title="Hero">
          <div className="grid gap-3 sm:grid-cols-2">
            <LocField id="hero-kicker" label="Kicker" value={draft.hero.kicker} locale={locale} onChange={(kicker) => patch("hero", { ...draft.hero, kicker })} />
            <LocField id="hero-dates" label="Fechas" value={draft.hero.dates} locale={locale} onChange={(dates) => patch("hero", { ...draft.hero, dates })} />
            <LocField id="hero-a" label="Título 1" value={draft.hero.titleA} locale={locale} onChange={(titleA) => patch("hero", { ...draft.hero, titleA })} />
            <LocField id="hero-b" label="Título 2" value={draft.hero.titleB} locale={locale} onChange={(titleB) => patch("hero", { ...draft.hero, titleB })} />
            <LocField id="hero-accent" label="Título destacado" value={draft.hero.titleAccent} locale={locale} onChange={(titleAccent) => patch("hero", { ...draft.hero, titleAccent })} />
            <LocField id="hero-cta" label="Botón" value={draft.hero.cta} locale={locale} onChange={(cta) => patch("hero", { ...draft.hero, cta })} />
          </div>
          <LocField id="hero-sub" label="Párrafo" value={draft.hero.subtitle} locale={locale} onChange={(subtitle) => patch("hero", { ...draft.hero, subtitle })} multiline />
          <LocField id="hero-signal" label="Franja inferior / sticky" value={draft.hero.signal} locale={locale} onChange={(signal) => patch("hero", { ...draft.hero, signal })} />
        </Section>

        <Section title="Fechas de la maleta">
          <div className="grid gap-3 sm:grid-cols-2">
            <LocField id="sheet-start" label="Precio inicial" value={draft.sheet.startingValue} locale={locale} onChange={(startingValue) => patch("sheet", { ...draft.sheet, startingValue })} />
            <LocField id="sheet-close" label="Cierre de ventas" value={draft.sheet.salesCloseValue} locale={locale} onChange={(salesCloseValue) => patch("sheet", { ...draft.sheet, salesCloseValue })} />
            <LocField id="sheet-art" label="Plazo de arte" value={draft.sheet.artworkValue} locale={locale} onChange={(artworkValue) => patch("sheet", { ...draft.sheet, artworkValue })} />
            <LocField id="sheet-trip" label="Ventana del viaje" value={draft.sheet.tripValue} locale={locale} onChange={(tripValue) => patch("sheet", { ...draft.sheet, tripValue })} />
          </div>
        </Section>

        <Section title="Menú">
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(draft.nav) as (keyof SiteContent["nav"])[]).map((key) => (
              <LocField
                key={key}
                id={`nav-${key}`}
                label={key}
                value={draft.nav[key]}
                locale={locale}
                onChange={(value) => patch("nav", { ...draft.nav, [key]: value })}
              />
            ))}
          </div>
        </Section>

        <Section title="Qué incluye">
          <LocField id="inc-kicker" label="Kicker" value={draft.included.kicker} locale={locale} onChange={(kicker) => patch("included", { ...draft.included, kicker })} />
          <LocField id="inc-title" label="Título" value={draft.included.title} locale={locale} onChange={(title) => patch("included", { ...draft.included, title })} />
          <LocField id="inc-intro" label="Intro" value={draft.included.intro} locale={locale} onChange={(intro) => patch("included", { ...draft.included, intro })} multiline />
          {draft.included.items.map((card, index) => (
            <CardEditor
              key={card.id}
              card={card}
              locale={locale}
              kickerLabel="Número"
              onChange={(next) =>
                patch("included", {
                  ...draft.included,
                  items: draft.included.items.map((item) => (item.id === card.id ? next : item)),
                })
              }
              onRemove={() =>
                patch("included", {
                  ...draft.included,
                  items: draft.included.items.filter((item) => item.id !== card.id),
                })
              }
              onMove={(direction) =>
                patch("included", { ...draft.included, items: moveItem(draft.included.items, index, direction) })
              }
              canMoveUp={index > 0}
              canMoveDown={index < draft.included.items.length - 1}
            />
          ))}
          <button
            type="button"
            className={adminGhostBtn}
            onClick={() => patch("included", { ...draft.included, items: [...draft.included.items, emptyCard("included")] })}
          >
            Agregar tarjeta
          </button>
          <LocField id="inc-pres-label" label="Etiqueta presenting" value={draft.included.presentingLabel} locale={locale} onChange={(presentingLabel) => patch("included", { ...draft.included, presentingLabel })} />
          <LocField id="inc-pres" label="Presenting sponsor" value={draft.included.presenting} locale={locale} onChange={(presenting) => patch("included", { ...draft.included, presenting })} multiline />
        </Section>

        <Section title="Vlog">
          <LocField id="vlog-kicker" label="Kicker" value={draft.vlog.kicker} locale={locale} onChange={(kicker) => patch("vlog", { ...draft.vlog, kicker })} />
          <LocField id="vlog-title" label="Título" value={draft.vlog.title} locale={locale} onChange={(title) => patch("vlog", { ...draft.vlog, title })} />
          <LocField id="vlog-body" label="Párrafo" value={draft.vlog.body} locale={locale} onChange={(body) => patch("vlog", { ...draft.vlog, body })} multiline />
          {draft.vlog.points.map((point, index) => (
            <div key={point.id} className="flex gap-2">
              <div className="min-w-0 flex-1">
                <LocField
                  id={point.id}
                  label={`Punto ${index + 1}`}
                  value={point.text}
                  locale={locale}
                  onChange={(text) =>
                    patch("vlog", {
                      ...draft.vlog,
                      points: draft.vlog.points.map((item) => (item.id === point.id ? { ...item, text } : item)),
                    })
                  }
                />
              </div>
              <button
                type="button"
                className={`${adminGhostBtn} mt-6 text-destructive`}
                onClick={() =>
                  patch("vlog", { ...draft.vlog, points: draft.vlog.points.filter((item) => item.id !== point.id) })
                }
              >
                Quitar
              </button>
            </div>
          ))}
          <button
            type="button"
            className={adminGhostBtn}
            onClick={() => patch("vlog", { ...draft.vlog, points: [...draft.vlog.points, emptyPoint()] })}
          >
            Agregar punto
          </button>
        </Section>

        <Section title="Cómo funciona">
          <LocField id="how-kicker" label="Kicker" value={draft.how.kicker} locale={locale} onChange={(kicker) => patch("how", { ...draft.how, kicker })} />
          <LocField id="how-title" label="Título" value={draft.how.title} locale={locale} onChange={(title) => patch("how", { ...draft.how, title })} />
          {draft.how.steps.map((card, index) => (
            <CardEditor
              key={card.id}
              card={card}
              locale={locale}
              kickerLabel="Paso"
              onChange={(next) =>
                patch("how", {
                  ...draft.how,
                  steps: draft.how.steps.map((item) => (item.id === card.id ? next : item)),
                })
              }
              onRemove={() => patch("how", { ...draft.how, steps: draft.how.steps.filter((item) => item.id !== card.id) })}
              onMove={(direction) => patch("how", { ...draft.how, steps: moveItem(draft.how.steps, index, direction) })}
              canMoveUp={index > 0}
              canMoveDown={index < draft.how.steps.length - 1}
            />
          ))}
          <button
            type="button"
            className={adminGhostBtn}
            onClick={() => patch("how", { ...draft.how, steps: [...draft.how.steps, emptyCard("how")] })}
          >
            Agregar paso
          </button>
        </Section>

        <Section title="Tarjetas del viaje" hint="Acá cambiás lo de Compile, Devcon, etc." open>
          {draft.timeline.map((card, index) => (
            <CardEditor
              key={card.id}
              card={card}
              locale={locale}
              kickerLabel="Fecha / momento"
              onChange={(next) =>
                patch(
                  "timeline",
                  draft.timeline.map((item) => (item.id === card.id ? next : item)),
                )
              }
              onRemove={() => patch("timeline", draft.timeline.filter((item) => item.id !== card.id))}
              onMove={(direction) => patch("timeline", moveItem(draft.timeline, index, direction))}
              canMoveUp={index > 0}
              canMoveDown={index < draft.timeline.length - 1}
            />
          ))}
          <button
            type="button"
            className={adminGhostBtn}
            onClick={() => patch("timeline", [...draft.timeline, emptyCard("timeline")])}
          >
            Agregar tarjeta
          </button>
        </Section>

        <Section title="Qué financia">
          <LocField id="funds-kicker" label="Kicker" value={draft.funds.kicker} locale={locale} onChange={(kicker) => patch("funds", { ...draft.funds, kicker })} />
          <LocField id="funds-title" label="Título" value={draft.funds.title} locale={locale} onChange={(title) => patch("funds", { ...draft.funds, title })} />
          <LocField id="funds-intro" label="Intro" value={draft.funds.intro} locale={locale} onChange={(intro) => patch("funds", { ...draft.funds, intro })} multiline />
          {draft.funds.items.map((card, index) => (
            <CardEditor
              key={card.id}
              card={card}
              locale={locale}
              kickerLabel="Número"
              onChange={(next) =>
                patch("funds", {
                  ...draft.funds,
                  items: draft.funds.items.map((item) => (item.id === card.id ? next : item)),
                })
              }
              onRemove={() =>
                patch("funds", { ...draft.funds, items: draft.funds.items.filter((item) => item.id !== card.id) })
              }
              onMove={(direction) =>
                patch("funds", { ...draft.funds, items: moveItem(draft.funds.items, index, direction) })
              }
              canMoveUp={index > 0}
              canMoveDown={index < draft.funds.items.length - 1}
            />
          ))}
          <button
            type="button"
            className={adminGhostBtn}
            onClick={() => patch("funds", { ...draft.funds, items: [...draft.funds.items, emptyCard("funds")] })}
          >
            Agregar ítem
          </button>
        </Section>

        <Section title="Extras">
          <div className="grid gap-3 sm:grid-cols-2">
            <LocField id="add-kicker" label="Kicker" value={draft.addons.kicker} locale={locale} onChange={(kicker) => patch("addons", { ...draft.addons, kicker })} />
            <LocField id="add-title" label="Título" value={draft.addons.title} locale={locale} onChange={(title) => patch("addons", { ...draft.addons, title })} />
            <LocField id="add-merch-title" label="Merch · título" value={draft.addons.merchTitle} locale={locale} onChange={(merchTitle) => patch("addons", { ...draft.addons, merchTitle })} />
            <LocField id="add-merch-body" label="Merch · texto" value={draft.addons.merchBody} locale={locale} onChange={(merchBody) => patch("addons", { ...draft.addons, merchBody })} multiline />
            <div className="space-y-1.5">
              <Label htmlFor="price-half">Precio medio día</Label>
              <Input
                id="price-half"
                type="number"
                value={draft.addons.merchHalfPrice}
                onChange={(event) => patch("addons", { ...draft.addons, merchHalfPrice: Number(event.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price-full">Precio día completo</Label>
              <Input
                id="price-full"
                type="number"
                value={draft.addons.merchFullPrice}
                onChange={(event) => patch("addons", { ...draft.addons, merchFullPrice: Number(event.target.value) })}
              />
            </div>
            <LocField id="add-walk-title" label="Walk-around · título" value={draft.addons.walkTitle} locale={locale} onChange={(walkTitle) => patch("addons", { ...draft.addons, walkTitle })} />
            <div className="space-y-1.5">
              <Label htmlFor="price-walk">Precio walk-around</Label>
              <Input
                id="price-walk"
                type="number"
                value={draft.addons.walkPrice}
                onChange={(event) => patch("addons", { ...draft.addons, walkPrice: Number(event.target.value) })}
              />
            </div>
            <LocField id="add-walk-body" label="Walk-around · texto" value={draft.addons.walkBody} locale={locale} onChange={(walkBody) => patch("addons", { ...draft.addons, walkBody })} multiline />
            <LocField id="add-video-title" label="Video · título" value={draft.addons.videoTitle} locale={locale} onChange={(videoTitle) => patch("addons", { ...draft.addons, videoTitle })} />
            <LocField id="add-video-body" label="Video · texto" value={draft.addons.videoBody} locale={locale} onChange={(videoBody) => patch("addons", { ...draft.addons, videoBody })} multiline />
          </div>
        </Section>

        <Section title="Cierre y oferta">
          <LocField id="cta-title" label="CTA · título" value={draft.cta.title} locale={locale} onChange={(title) => patch("cta", { ...draft.cta, title })} />
          <LocField id="cta-body" label="CTA · texto" value={draft.cta.body} locale={locale} onChange={(body) => patch("cta", { ...draft.cta, body })} multiline />
          <LocField id="offer-title" label="Oferta · título" value={draft.offer.title} locale={locale} onChange={(title) => patch("offer", { ...draft.offer, title })} />
          <LocField id="offer-body" label="Oferta · texto" value={draft.offer.body} locale={locale} onChange={(body) => patch("offer", { ...draft.offer, body })} multiline />
          <LocField id="footer-trip" label="Pie de página" value={draft.footer.trip} locale={locale} onChange={(trip) => patch("footer", { trip })} />
        </Section>
      </div>
    </section>
  );
}

function Section({
  title,
  hint,
  children,
  open = false,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details open={open} className="rounded-2xl border border-border bg-card p-5">
      <summary className="cursor-pointer text-lg font-medium">{title}</summary>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
      <div className="mt-4 space-y-3">{children}</div>
    </details>
  );
}

