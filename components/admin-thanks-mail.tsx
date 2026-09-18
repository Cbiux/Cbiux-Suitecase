"use client";

import { useEffect, useMemo, useState } from "react";
import { adminActionBtn, formatWhen, mailErrorLabel } from "@/components/admin-ui";
import { sendThanksMailForSpot } from "@/lib/admin-thanks-send";
import { SITE } from "@/lib/config";
import { isValidEmail } from "@/lib/email";
import { padSpot } from "@/lib/positions";
import { thanksEmailCopy } from "@/lib/thanks-mail-copy";
import type { LivePosition } from "@/lib/types";

type MailStatus = {
  configured: boolean;
  from: string;
  replyTo: string;
  hasBcc: boolean;
};

export function AdminThanksMail({
  positions,
  onSent,
  sendingId,
  setSendingId,
}: {
  positions: LivePosition[];
  onSent: () => Promise<void>;
  sendingId: number | null;
  setSendingId: (id: number | null) => void;
}) {
  const eligible = useMemo(
    () =>
      positions.filter(
        (spot) =>
          spot.status !== "available" &&
          isValidEmail(spot.email) &&
          Boolean(spot.logo),
      ),
    [positions],
  );
  const defaultSelected = useMemo(
    () => eligible.filter((spot) => !spot.thanksEmailSentAt).map((spot) => spot.id),
    [eligible],
  );
  const [selected, setSelected] = useState<number[]>(defaultSelected);
  const [status, setStatus] = useState<MailStatus | null>(null);
  const [progress, setProgress] = useState("");
  const [busy, setBusy] = useState(false);
  const [includeSent, setIncludeSent] = useState(false);
  const [results, setResults] = useState<Record<number, string>>({});

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/thanks-mail", { credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: MailStatus | null) => {
        if (!cancelled && body) setStatus(body);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSelected(defaultSelected);
  }, [defaultSelected.join(",")]);

  const previewSpot = eligible[0] ?? positions.find((spot) => spot.status !== "available");
  const preview = previewSpot
    ? thanksEmailCopy(previewSpot.sponsor || previewSpot.name, previewSpot.id)
    : null;
  const visible = includeSent ? eligible : eligible.filter((spot) => !spot.thanksEmailSentAt);
  const selectedSet = new Set(selected);

  function toggle(id: number) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function sendMany() {
    const targets = eligible.filter((spot) => selectedSet.has(spot.id));
    if (!targets.length) return;
    setBusy(true);
    setResults({});
    let done = 0;
    const next: Record<number, string> = {};
    for (const spot of targets) {
      setSendingId(spot.id);
      setProgress(`${done} / ${targets.length}`);
      try {
        await sendThanksMailForSpot({
          positionId: spot.id,
          sponsor: spot.sponsor,
          fallbackName: spot.name,
          logo: spot.logo,
        });
        next[spot.id] = "ok";
      } catch (error) {
        next[spot.id] = error instanceof Error ? error.message : "MAIL_SEND_FAILED";
      }
      done += 1;
      setResults({ ...next });
      setProgress(`${done} / ${targets.length}`);
    }
    setSendingId(null);
    setBusy(false);
    await onSent();
  }

  return (
    <section>
      <h2 className="text-xl font-medium">Correo de gracias</h2>
      <p className="mt-1 max-w-[62ch] text-sm text-muted-foreground">
        Manda a cada patrocinador un agradecimiento con las dos imágenes (post de gracias y vista de la maleta),
        con el número de espacio. Reply-To: {SITE.email}. WhatsApp no se usa para este envío.
      </p>

      {!status || status.configured ? null : (
        <p className="mt-4 rounded-2xl border border-[#e6b800] bg-[#fff8e4] p-4 text-sm text-[#6b4f00] dark:border-[#ffd54a] dark:bg-[#4a3a10] dark:text-[#ffd54a]">
          Falta <code className="font-mono text-[11px]">RESEND_API_KEY</code> y{" "}
          <code className="font-mono text-[11px]">MAIL_FROM</code> en Vercel. Resend no puede remitir desde Gmail:
          verificá un dominio y usá algo como <code className="font-mono text-[11px]">Cbiux &lt;hola@tu-dominio.com&gt;</code>.
        </p>
      )}
      {status?.configured ? (
        <p className="mt-3 font-mono text-[10px] text-muted-foreground">
          From {status.from}
          {status.hasBcc ? " · BCC activo" : ""}
        </p>
      ) : null}

      {preview ? (
        <article className="mt-6 rounded-2xl border border-border bg-card p-5">
          <p className="mono-label text-primary">preview</p>
          <p className="mt-2 text-sm font-medium">{preview.subject}</p>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
            {preview.text}
          </pre>
        </article>
      ) : (
        <p className="mt-4 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Todavía no hay un patrocinador con logo y correo para armar el preview.
        </p>
      )}

      <label className="mt-6 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={includeSent}
          onChange={(event) => setIncludeSent(event.target.checked)}
        />
        Mostrar a quienes ya se les mandó (para reenviar)
      </label>

      <div className="mt-4 space-y-2">
        {visible.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            No hay destinatarios. Guardá un correo en Patrocinadores y un logo.
          </p>
        ) : (
          visible.map((spot) => (
            <label
              key={spot.id}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={selectedSet.has(spot.id)}
                onChange={() => toggle(spot.id)}
                disabled={busy}
              />
              <span className="min-w-0 flex-1">
                <span className="font-mono text-[10px] tracking-[0.12em] text-primary">
                  posición {padSpot(spot.id)}
                </span>
                <span className="mt-1 block truncate font-medium">
                  {spot.sponsor || spot.name}
                </span>
                <span className="block truncate text-sm text-muted-foreground">{spot.email}</span>
                {spot.thanksEmailSentAt ? (
                  <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
                    Enviado {formatWhen(spot.thanksEmailSentAt)}
                  </span>
                ) : null}
                {results[spot.id] ? (
                  <span
                    className={`mt-1 block text-xs ${results[spot.id] === "ok" ? "text-[#147a4b]" : "text-destructive"}`}
                  >
                    {results[spot.id] === "ok" ? "Enviado" : mailErrorLabel(results[spot.id])}
                  </span>
                ) : null}
                {sendingId === spot.id ? (
                  <span className="mt-1 block text-xs text-primary">Armando imágenes y enviando…</span>
                ) : null}
              </span>
            </label>
          ))
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={`${adminActionBtn} bg-primary text-primary-foreground border-transparent`}
          disabled={busy || !selected.length || status?.configured === false}
          onClick={() => void sendMany()}
        >
          {busy ? `Enviando ${progress}` : `Enviar a ${selected.length} patrocinadores`}
        </button>
        <button
          type="button"
          className={adminActionBtn}
          disabled={busy}
          onClick={() => setSelected(visible.map((spot) => spot.id))}
        >
          Seleccionar visibles
        </button>
        <button
          type="button"
          className={adminActionBtn}
          disabled={busy}
          onClick={() => setSelected([])}
        >
          Ninguno
        </button>
      </div>
    </section>
  );
}
