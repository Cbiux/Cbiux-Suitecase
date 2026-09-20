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

export const adminGhostBtn =
  "inline-flex h-11 items-center rounded-full border border-border px-4 font-mono text-[10px] font-semibold tracking-[0.12em] disabled:opacity-50";

export const adminActionBtn =
  "rounded-full border border-border px-4 py-2 font-mono text-[10px] font-semibold tracking-[0.12em] disabled:opacity-50";

export function mailErrorLabel(code: string) {
  if (code === "MAIL_NOT_CONFIGURED") {
    return "Falta configurar Resend (RESEND_API_KEY y MAIL_FROM con un dominio verificado).";
  }
  if (code === "MISSING_EMAIL" || code === "INVALID_EMAIL") return "Este patrocinador no tiene un correo válido.";
  if (code === "NO_LOGO") return "Falta el logo para armar las dos imágenes.";
  if (code === "SPOT_AVAILABLE") return "El spot está libre.";
  if (code === "IMAGE_TOO_LARGE") return "Las imágenes pesaron demasiado. Probá de nuevo.";
  if (code === "MAIL_SEND_FAILED") return "Resend no pudo enviar el correo.";
  if (code === "UNAUTHORIZED") return "La sesión de admin expiró. Volvé a entrar.";
  if (code === "TOO_LONG") return "Algún campo es demasiado largo.";
  if (code === "UPDATE_FAILED") return "No se pudo guardar.";
  if (code === "INVALID_AMOUNT") return "Anotá un monto recibido mayor a 0.";
  return code;
}
