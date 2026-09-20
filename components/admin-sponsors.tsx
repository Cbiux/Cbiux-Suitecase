"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminArtwork } from "@/components/admin-artwork";
import { adminActionBtn, formatWhen, mailErrorLabel, ReceivedAccountsCard, StatusPill } from "@/components/admin-ui";
import { padSpot } from "@/lib/positions";
import { whatsappHref } from "@/lib/phone";
import { isValidEmail } from "@/lib/email";
import {
  defaultReceivedCurrency,
  formatReceivedBookkeeping,
  formatReceivedMoney,
  guessReceivedMethod,
  receivedMethodLabel,
} from "@/lib/received";
import type { LivePosition, ReceivedCurrency, ReceivedMethod, SpotStatus } from "@/lib/types";

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
  const sold = useMemo(
    () => positions.filter((spot) => spot.status === "sold"),
    [positions],
  );
  const accounts = useMemo(() => formatReceivedBookkeeping(positions), [positions]);

  return (
    <section>
      <h2 className="text-xl font-medium">Patrocinadores</h2>
      <p className="mt-1 max-w-[62ch] text-sm text-muted-foreground">
        Editá marca, correo y teléfono de cada posición. Liberar borra esos datos y deja el spot libre.
        {missingEmail ? ` ${missingEmail} confirmados o reservados no tienen correo: no se les puede mandar el pack.` : ""}
      </p>
      <div className="mt-3">
        <ReceivedAccountsCard accounts={accounts} />
        <p className="mt-2 text-sm text-muted-foreground">
          {accounts.missing
            ? `${accounts.missing} vendidos sin anotar.`
            : sold.length
              ? "Todos los vendidos tienen monto."
              : "Todavía no hay vendidos anotados."}
        </p>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {positions.map((spot) => (
          <SponsorCard
            key={`${spot.id}-${spot.status}-${spot.sponsor}-${spot.email}-${spot.phone}-${spot.thanksEmailSentAt}-${spot.receivedConfirmedAt}-${spot.receivedAmount}-${spot.receivedMethod}-${spot.receivedCurrency}-${spot.receivedInKindItems}-${spot.logo ? "logo" : "empty"}`}
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
  const [received, setReceived] = useState(
    spot.receivedConfirmedAt && spot.receivedAmount ? String(spot.receivedAmount) : "",
  );
  const [method, setMethod] = useState<ReceivedMethod | "">(
    spot.receivedMethod || guessReceivedMethod(spot.network),
  );
  const [currency, setCurrency] = useState<ReceivedCurrency>(
    spot.receivedCurrency || defaultReceivedCurrency(spot.receivedMethod || guessReceivedMethod(spot.network)),
  );
  const [inKindItems, setInKindItems] = useState(spot.receivedInKindItems || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const missingMail = status !== "available" && !email.trim();
  const missingReceived = status === "sold" && !spot.receivedConfirmedAt;
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

  async function confirmReceived() {
    setError("");
    if (!method) {
      setError(mailErrorLabel("INVALID_METHOD"));
      return;
    }
    if (method === "in_kind" && inKindItems.trim().length < 2) {
      setError(mailErrorLabel("INVALID_IN_KIND"));
      return;
    }
    setBusy(true);
    try {
      await onUpdate(spot.id, {
        receivedAmount: received,
        receivedMethod: method,
        receivedCurrency: currency,
        receivedInKindItems: inKindItems,
      });
    } catch (err) {
      setError(
        mailErrorLabel(err instanceof Error ? err.message : "UPDATE_FAILED"),
      );
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
        missingMail || missingReceived
          ? "border-[#e6b800] dark:border-[#ffd54a]"
          : "border-border"
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

      {status === "sold" ? (
        <div className="mt-4 rounded-xl border border-border bg-background/60 p-3">
          <ChoicePills
            label="Cómo te llegó"
            value={method}
            options={[
              { id: "sinpe", label: "SINPE" },
              { id: "crypto", label: "crypto" },
              { id: "in_kind", label: "en especie" },
            ]}
            onChange={(next) => {
              setMethod(next);
              if (!spot.receivedConfirmedAt) setCurrency(defaultReceivedCurrency(next));
            }}
          />
          {method === "in_kind" ? (
            <div className="mt-3 space-y-1.5">
              <Label htmlFor={`inkind-${spot.id}`}>Artículo o artículos</Label>
              <Input
                id={`inkind-${spot.id}`}
                placeholder="ej. 2 camisetas y una gorra"
                value={inKindItems}
                onChange={(event) => setInKindItems(event.target.value)}
              />
            </div>
          ) : null}
          <div className="mt-3 space-y-1.5">
            <Label htmlFor={`received-${spot.id}`}>
              {method === "in_kind" ? "Precio aproximado" : "Monto recibido"}
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id={`received-${spot.id}`}
                inputMode="decimal"
                placeholder={
                  method === "in_kind"
                    ? currency === "crc"
                      ? "valor aprox. en ₡"
                      : "valor aprox. en $"
                    : currency === "crc"
                      ? "ej. 25000"
                      : `precio del spot: ${spot.price}`
                }
                value={received}
                onChange={(event) => setReceived(event.target.value)}
                className="max-w-[10rem]"
              />
              <ChoicePills
                compact
                label="Colones o dólares"
                value={currency}
                options={[
                  { id: "crc", label: "₡ colones" },
                  { id: "usd", label: "$ dólares" },
                ]}
                onChange={setCurrency}
              />
              <button
                type="button"
                className={`${adminActionBtn} bg-primary text-primary-foreground border-transparent`}
                disabled={busy}
                onClick={() => void confirmReceived()}
              >
                Confirmar recibido
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Para tus cuentas. No cambia el precio público del spot.
            {spot.receivedConfirmedAt
              ? ` Última confirmación: ${receivedMethodLabel(spot.receivedMethod)}${spot.receivedMethod === "in_kind" && spot.receivedInKindItems ? ` · ${spot.receivedInKindItems}` : ""} · ${formatReceivedMoney(spot.receivedAmount, spot.receivedCurrency || "usd")}${spot.receivedMethod === "in_kind" ? " aprox." : ""} el ${formatWhen(spot.receivedConfirmedAt)}.`
              : " Este confirmado todavía no tiene monto anotado."}
          </p>
        </div>
      ) : null}

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
      {missingReceived ? (
        <p className="mt-2 text-xs text-[#6b4f00] dark:text-[#ffd54a]">
          Confirmado como vendido, pero todavía no anotaste cómo y cuánto te llegó.
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

function ChoicePills<T extends string>({
  label,
  value,
  options,
  onChange,
  compact = false,
}: {
  label: string;
  value: T | "";
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "" : "space-y-1.5"}>
      {compact ? <span className="sr-only">{label}</span> : <p className="text-sm font-medium">{label}</p>}
      <div
        role="group"
        aria-label={label}
        className="flex overflow-hidden rounded-full border border-border bg-card"
      >
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={value === option.id}
            className={`min-h-8 px-3 font-mono text-[10px] font-semibold tracking-[0.12em] ${
              value === option.id ? "bg-foreground text-background" : "text-muted-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
