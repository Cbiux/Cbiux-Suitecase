import { SITE } from "@/lib/config";

export function CoordContacts({
  compact = false,
  label = "Para coordinar",
}: {
  compact?: boolean;
  label?: string;
}) {
  return (
    <div className={compact ? "flex flex-wrap items-center gap-2" : "rounded-2xl border border-border bg-muted/40 p-3"}>
      {compact ? null : <p className="text-sm text-muted-foreground">{label}</p>}
      <div className={`flex flex-wrap gap-2 ${compact ? "" : "mt-2"}`}>
        <a
          href={SITE.whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center rounded-full bg-foreground px-4 font-mono text-[10px] font-semibold tracking-[0.1em] text-background"
        >
          WhatsApp {SITE.phoneDisplay}
        </a>
        <a
          href={SITE.telegramUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center rounded-full border border-border px-4 font-mono text-[10px] font-semibold tracking-[0.1em]"
        >
          Telegram @{SITE.telegram}
        </a>
      </div>
    </div>
  );
}
