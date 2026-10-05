"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseUsdCrcRate, USD_CRC_RATE_MAX, USD_CRC_RATE_MIN } from "@/lib/currency";
import type { SpotStatus } from "@/lib/types";

export function formatWhen(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "short",
    timeStyle: "short",
  })
    .format(date)
    .replace(/\u202f|\u00a0/g, " ");
}

export function StatusPill({ status }: { status: SpotStatus }) {
  const label = status === "sold" ? "Confirmado" : status === "reserved" ? "Reservado" : "Libre";
  const className =
    status === "sold"
      ? "bg-[#b6efcf] text-[#147a4b] border-[#147a4b]"
      : status === "reserved"
        ? "bg-[#ffd54a] text-[#6b4f00] border-[#e6b800]"
        : "border-border text-muted-foreground";
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.08em] ${className}`}>
      {label}
    </span>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <span className="mono-label">{label}</span>
      <strong className="mt-1 block text-lg font-medium">{value}</strong>
    </div>
  );
}

export function ReceivedAccountsCard({
  accounts,
}: {
  accounts: {
    cash: string;
    recorded: string;
    kind: string;
    rateNote: string;
  };
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <span className="mono-label">Efectivo real</span>
      <strong className="mt-1 block text-lg font-medium">{accounts.cash}</strong>
      <p className="mt-1 text-xs text-muted-foreground">
        Anotado: {accounts.recorded} · {accounts.rateNote}
      </p>
      {accounts.kind ? (
        <p className="mt-2 text-sm">
          <span className="mono-label">En especie</span>
          <span className="mt-0.5 block font-medium">{accounts.kind}</span>
        </p>
      ) : null}
    </div>
  );
}

export function UsdRateCard({
  value,
  onSave,
  busy,
}: {
  value: number;
  onSave: (rate: number) => Promise<void>;
  busy?: boolean;
}) {
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  async function save() {
    const raw = Number(String(draft).trim().replace(",", "."));
    if (!Number.isFinite(raw) || raw < USD_CRC_RATE_MIN || raw > USD_CRC_RATE_MAX) {
      setOk("");
      setError(`Poné un tipo entre ₡${USD_CRC_RATE_MIN} y ₡${USD_CRC_RATE_MAX}.`);
      return;
    }
    const parsed = parseUsdCrcRate(raw);
    setError("");
    setOk("");
    try {
      await onSave(parsed);
      setDraft(String(parsed));
      setOk("Guardado. Recargá la página pública para ver los colones.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <Label htmlFor="usd-crc-rate" className="mono-label">
        Tipo de cambio USD
      </Label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">₡</span>
        <Input
          id="usd-crc-rate"
          type="number"
          min={USD_CRC_RATE_MIN}
          max={USD_CRC_RATE_MAX}
          step={1}
          inputMode="decimal"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setOk("");
            setError("");
          }}
          className="h-11 w-28"
        />
        <span className="text-sm text-muted-foreground">por 1 USD</span>
        <button type="button" className={adminActionBtn} disabled={busy} onClick={() => void save()}>
          {busy ? "Guardando…" : "Guardar"}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      {ok ? <p className="mt-2 text-xs text-[#147a4b]">{ok}</p> : null}
      <p className="mt-2 text-xs text-muted-foreground">
        Los precios de la web se muestran en colones con este tipo, redondeados a ₡500.
      </p>
    </div>
  );
}

export const adminGhostBtn =
  "inline-flex h-11 items-center rounded-full border border-border px-4 font-mono text-[10px] font-semibold tracking-[0.12em] disabled:opacity-50";

export const adminActionBtn =
  "rounded-full border border-border px-4 py-2 font-mono text-[10px] font-semibold tracking-[0.12em] disabled:opacity-50";

export function mailErrorLabel(code: string) {
  if (code === "MAIL_NOT_CONFIGURED") {
    return "Falta configurar Resend (RESEND_API_KEY y MAIL_FROM con un dominio verificado).";
  }
  if (code === "MAIL_TESTING_DOMAIN") {
    return "Resend está en modo prueba (MAIL_FROM usa resend.dev). Solo puede mandar a tu propio correo. Verificá un dominio en resend.com/domains y cambiá MAIL_FROM a Cbiux <hola@tu-dominio.com>.";
  }
  if (code === "MISSING_EMAIL" || code === "INVALID_EMAIL") return "Este patrocinador no tiene un correo válido.";
  if (code === "NO_LOGO") return "Falta el logo para armar las dos imágenes.";
  if (code === "SPOT_AVAILABLE") return "El spot está libre.";
  if (code === "IMAGE_TOO_LARGE") return "Las imágenes pesaron demasiado. Probá de nuevo.";
  if (code === "MAIL_SEND_FAILED") return "Resend no pudo enviar el correo.";
  if (code === "UNAUTHORIZED") return "La sesión de admin expiró. Volvé a entrar.";
  if (code === "GEOCODE_FAILED") return "No pude buscar la ciudad. Probá de nuevo o agregala a mano.";
  if (code === "TOO_LONG") return "Algún campo es demasiado largo.";
  if (code === "UPDATE_FAILED") return "No se pudo guardar.";
  if (code === "NEED_CATALOG_TOKEN") {
    return "Falta CATALOG_GITHUB_TOKEN en Vercel. Sin ese token el logo no queda guardado cuando Neon y Blob fallan.";
  }
  if (code === "NEED_CATALOG_SECRET") {
    return "Falta ADMIN_PASSWORD o CATALOG_SECRET para cifrar la copia del catálogo.";
  }
  if (code === "CATALOG_UNREADABLE" || code === "CATALOG_DECRYPT_FAILED") {
    return "No pude leer la copia en Git. No guardé nada para no borrar logos.";
  }
  if (code === "CATALOG_SAVE_FAILED") return "No pude escribir la copia en Git. El logo no se publicó.";
  if (code === "REFUSE_EMPTY_STORE") return "No guardé un catálogo vacío encima de logos que ya estaban.";
  if (code === "INVALID_AMOUNT") return "Anotá un monto recibido mayor a 0.";
  if (code === "INVALID_METHOD") return "Elegí si fue SINPE, crypto o en especie.";
  if (code === "INVALID_CURRENCY") return "Elegí si el monto es en dólares o colones.";
  if (code === "INVALID_IN_KIND") {
    return "Anotá el artículo o los artículos que te dieron en especie.";
  }
  if (code === "NOT_ADJACENT") return "Esos espacios no están uno al lado del otro.";
  if (code === "NOT_SAME_FACE") return "Solo se pueden pegar espacios de la misma cara.";
  if (code === "NOT_RECTANGLE") return "Al pegarlos tiene que quedar un rectángulo, sin huecos.";
  if (code === "MERGE_AVAILABLE") return "Pegá espacios que ya estén reservados o vendidos.";
  if (code === "NEED_TWO") return "Elegí dos espacios para pegarlos.";
  return code;
}
