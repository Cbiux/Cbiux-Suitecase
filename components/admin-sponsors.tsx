"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminArtwork } from "@/components/admin-artwork";
import { adminActionBtn, formatWhen, mailErrorLabel, StatusPill } from "@/components/admin-ui";
import { padSpot } from "@/lib/positions";
import { whatsappHref } from "@/lib/phone";
import { isValidEmail } from "@/lib/email";
import type { LivePosition, SpotStatus } from "@/lib/types";

export function AdminSponsors({
  positions,
  onUpdate,
  onSend,
  sendingId,
}: {
  positions: LivePosition[];
  onUpdate: (id: number, patch: Record<string, unknown>) => Promise<void>;
  onSend: (spot: LivePosition) => Promise<void>;
  sendingId: number | null;
}) {
  const missingEmail = useMemo(
    () => positions.filter((spot) => spot.status !== "available" && !spot.email).length,
    [positions],
  );

  return (
    <section>
      <h2 className="text-xl font-medium">Patrocinadores</h2>
      <p className="mt-1 max-w-[62ch] text-sm text-muted-foreground">
        Editá marca, correo y teléfono de cada posición. Liberar borra esos datos y deja el spot libre.
        {missingEmail ? ` ${missingEmail} confirmados o reservados no tienen correo: no se les puede mandar el pack.` : ""}
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {positions.map((spot) => (
          <SponsorCard
            key={`${spot.id}-${spot.status}-${spot.sponsor}-${spot.email}-${spot.phone}-${spot.thanksEmailSentAt}-${spot.logo ? "logo" : "empty"}`}
            spot={spot}
            onUpdate={onUpdate}
            onSend={onSend}
            sending={sendingId === spot.id}
          />
        ))}
      </div>
    </section>
  );
}

function SponsorCard({
  spot,
  onUpdate,
  onSend,
  sending,
}: {
  spot: LivePosition;
  onUpdate: (id: number, patch: Record<string, unknown>) => Promise<void>;
  onSend: (spot: LivePosition) => Promise<void>;
  sending: boolean;
}) {
  const [sponsor, setSponsor] = useState(spot.sponsor);
  const [email, setEmail] = useState(spot.email);
  const [phone, setPhone] = useState(spot.phone);
  const [status, setStatus] = useState<SpotStatus>(spot.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const missingMail = status !== "available" && !email.trim();
  const wa = phone.trim() ? whatsappHref(phone) : "";

  async function saveAndSend() {
    setError("");
    if (!isValidEmail(email)) {
      setError("Ingresá un email válido.");
      return;
    }
    setBusy(true);
    try {
      await onUpdate(spot.id, { status, sponsor, email, phone });
      await onSend({ ...spot, sponsor, email, phone, status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setError("");
    if (email.trim() && !isValidEmail(email)) {
      setError("Ingresá un email válido.");
      return;
    }
    setBusy(true);
    try {
      await onUpdate(spot.id, { status, sponsor, email, phone });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  async function release() {
    if (
      !window.confirm(
        "Esto borra marca, correo, logo y deja el spot libre. ¿Continuar?",
      )
    ) {
      return;
    }
    setError("");
    setBusy(true);
    try {
      await onUpdate(spot.id, { release: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo liberar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      className={`rounded-2xl border bg-card p-4 ${
        missingMail ? "border-[#e6b800] dark:border-[#ffd54a]" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mono-label text-primary">posición {padSpot(spot.id)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {spot.name} · ${spot.price}
          </p>
        </div>
        <StatusPill status={spot.status} />
      </div>

      <div className="mt-4 flex gap-4">
        <AdminArtwork
          positionId={spot.id}
          sponsor={sponsor || spot.sponsor}
          src={spot.logo}
          panelSize={spot.size}
          size="sm"
          onReplace={(logo) => onUpdate(spot.id, { logo })}
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`sponsor-${spot.id}`}>Marca / nombre</Label>
            <Input
              id={`sponsor-${spot.id}`}
              value={sponsor}
              onChange={(event) => setSponsor(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`status-${spot.id}`}>Estado</Label>
            <select
              id={`status-${spot.id}`}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value as SpotStatus)}
            >
              <option value="available">libre</option>
              <option value="reserved">reservado</option>
              <option value="sold">confirmado</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={`email-${spot.id}`}>Correo</Label>
          <Input
            id={`email-${spot.id}`}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={missingMail || (email.trim() ? !isValidEmail(email) : undefined)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`phone-${spot.id}`}>Teléfono / WhatsApp</Label>
          <Input
            id={`phone-${spot.id}`}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="block text-xs text-primary underline-offset-2 hover:underline"
            >
              Abrir WhatsApp {phone.trim()}
            </a>
          ) : (
            <p className="text-xs text-muted-foreground">WhatsApp no se envía desde acá; solo el enlace si hay número.</p>
          )}
        </div>
      </div>

      {spot.thanksEmailSentAt ? (
        <p className="mt-3 font-mono text-[10px] text-muted-foreground">
          Correo de gracias enviado {formatWhen(spot.thanksEmailSentAt)}
        </p>
      ) : null}
      {missingMail ? (
        <p className="mt-2 text-xs text-[#6b4f00] dark:text-[#ffd54a]">
          Sin correo no se puede mandar el pack de agradecimiento.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={adminActionBtn} disabled={busy} onClick={() => void save()}>
          {busy ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          className={`${adminActionBtn} border-destructive text-destructive`}
          disabled={busy || spot.status === "available"}
          onClick={() => void release()}
        >
          Liberar
        </button>
        <button
          type="button"
          className={`${adminActionBtn} bg-primary text-primary-foreground border-transparent`}
          disabled={
            sending ||
            busy ||
            !spot.logo ||
            !isValidEmail(email) ||
            status === "available"
          }
          onClick={() => void saveAndSend()}
        >
          {sending ? "Enviando…" : spot.thanksEmailSentAt ? "Reenviar correo" : "Enviar este correo"}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-destructive">{mailErrorLabel(error)}</p> : null}
    </article>
  );
}
