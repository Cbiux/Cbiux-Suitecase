"use client";

import { useMemo, useState } from "react";
import { AdminArtwork } from "./admin-artwork";
import { AdminSponsors } from "./admin-sponsors";
import { AdminThanksCard } from "./admin-thanks";
import { AdminThanksMail } from "./admin-thanks-mail";
import { CoordContacts } from "./coord-contacts";
import { ThemeToggle } from "./theme-toggle";
import { adminGhostBtn, formatWhen, Stat, StatusPill } from "./admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendThanksMailForSpot } from "@/lib/admin-thanks-send";
import { isValidEmail } from "@/lib/email";
import { padSpot } from "@/lib/positions";
import { whatsappHref } from "@/lib/phone";
import type { LivePosition, OfferRecord, OfferStatus, PaymentRecord } from "@/lib/types";

type AdminData = {
  positions: LivePosition[];
  payments: PaymentRecord[];
  offers: OfferRecord[];
};

type AdminTab = "inbox" | "sponsors" | "mail" | "art";

export function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!response.ok) {
      setError("Contraseña incorrecta.");
      return;
    }
    window.location.reload();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <div className="mb-6 flex justify-end">
        <ThemeToggle />
      </div>
      <p className="mono-label text-primary">admin</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Cbiux · Suitcase</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Entrá con la contraseña para ver solicitudes y aceptarlas.
      </p>
      <form className="mt-8 space-y-4" onSubmit={login}>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full rounded-full" disabled={busy}>
          {busy ? "Entrando…" : "Entrar"}
        </Button>
        {error ? <p className="font-mono text-xs text-destructive">{error}</p> : null}
      </form>
    </main>
  );
}

export function AdminBoard({ initial }: { initial: AdminData }) {
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState<AdminTab>("inbox");
  const [restoreMsg, setRestoreMsg] = useState("");
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);

  const pendingSpots = useMemo(
    () => data.positions.filter((spot) => spot.status === "reserved"),
    [data.positions],
  );
  const pendingOffers = useMemo(
    () => data.offers.filter((offer) => offer.status === "pending"),
    [data.offers],
  );
  const artworkSpots = useMemo(
    () => data.positions.filter((spot) => Boolean(spot.logo)),
    [data.positions],
  );
  const sold = useMemo(
    () => data.positions.filter((spot) => spot.status === "sold"),
    [data.positions],
  );
  const soldWithEmail = sold.filter((spot) => isValidEmail(spot.email)).length;
  const soldWithoutEmail = sold.length - soldWithEmail;
  const mailsSent = data.positions.filter((spot) => Boolean(spot.thanksEmailSentAt)).length;

  async function load() {
    const response = await fetch("/api/admin/spots", { cache: "no-store" });
    if (response.ok) setData((await response.json()) as AdminData);
  }

  async function updateSpot(positionId: number, patch: Record<string, unknown>) {
    const response = await fetch("/api/admin/spots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ positionId, ...patch }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error || "UPDATE_FAILED");
    }
    await load();
  }

  async function updateOffer(id: string, status: OfferStatus) {
    await fetch("/api/admin/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await load();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  async function restoreNeon() {
    setRestoreMsg("");
    setRestoreBusy(true);
    const response = await fetch("/api/admin/restore-neon", { method: "POST" });
    const body = (await response.json().catch(() => ({}))) as {
      restored?: boolean;
      reason?: string;
      sold?: number;
      reserved?: number;
      offers?: number;
    };
    setRestoreBusy(false);
    if (!response.ok || !body.restored) {
      setRestoreMsg(
        body.reason === "NEON_QUOTA"
          ? "Neon sigue bloqueada por cuota. Los datos no se borraron; hay que esperar el 1 oct o subir el plan."
          : "No se pudo leer Neon.",
      );
      return;
    }
    await load();
    setRestoreMsg(
      `Listo: ${body.sold ?? 0} vendidos, ${body.reserved ?? 0} reservados, ${body.offers ?? 0} ofertas.`,
    );
  }

  async function sendOne(spot: LivePosition) {
    setSendingId(spot.id);
    try {
      await sendThanksMailForSpot({
        positionId: spot.id,
        sponsor: spot.sponsor,
        fallbackName: spot.name,
        logo: spot.logo,
      });
      await load();
    } finally {
      setSendingId(null);
    }
  }

  const tabs: { id: AdminTab; label: string }[] = [
    { id: "inbox", label: "Bandeja" },
    { id: "sponsors", label: "Patrocinadores" },
    { id: "mail", label: "Correo" },
    { id: "art", label: "Arte" },
  ];

  return (
    <main className="shell py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mono-label text-primary">admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Solicitudes</h1>
          <p className="mt-2 max-w-[52ch] text-sm text-muted-foreground">
            Editá patrocinadores, confirmá reservas y mandá el correo de gracias con las dos imágenes.
            WhatsApp queda como enlace; el pack sale por email.
          </p>
          <div className="mt-3">
            <CoordContacts compact />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => void restoreNeon()}
              disabled={restoreBusy}
              className={adminGhostBtn}
            >
              {restoreBusy ? "Restaurando…" : "Restaurar Neon"}
            </button>
            <button type="button" onClick={logout} className={adminGhostBtn}>
              Salir
            </button>
          </div>
          {restoreMsg ? (
            <p className="max-w-[36ch] text-right font-mono text-[10px] text-muted-foreground">{restoreMsg}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-4 py-2 font-mono text-[10px] font-semibold tracking-[0.12em] ${
              tab === item.id
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "inbox" ? (
        <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label="Pendientes" value={String(pendingSpots.length + pendingOffers.length)} />
          <Stat label="Reservas" value={String(pendingSpots.length)} />
          <Stat label="Ofertas" value={String(pendingOffers.length)} />
          <Stat label="Vendidas" value={String(sold.length)} />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label="Vendidas" value={String(sold.length)} />
          <Stat label="Con correo" value={String(soldWithEmail)} />
          <Stat label="Sin correo" value={String(soldWithoutEmail)} />
          <Stat label="Correos enviados" value={String(mailsSent)} />
        </div>
      )}

      {tab === "inbox" ? (
        <>
          <Inbox
            pendingSpots={pendingSpots}
            pendingOffers={pendingOffers}
            updateSpot={updateSpot}
            updateOffer={updateOffer}
          />
          <OffersList offers={data.offers} />
          <PaymentsList payments={data.payments} />
        </>
      ) : null}

      {tab === "sponsors" ? (
        <div className="mt-10">
          <AdminSponsors
            positions={data.positions}
            onUpdate={updateSpot}
            onSend={(spot) => sendOne(spot)}
            sendingId={sendingId}
          />
        </div>
      ) : null}

      {tab === "mail" ? (
        <div className="mt-10">
          <AdminThanksMail
            positions={data.positions}
            onSent={load}
            sendingId={sendingId}
            setSendingId={setSendingId}
          />
        </div>
      ) : null}

      {tab === "art" ? (
        <ArtSections artworkSpots={artworkSpots} updateSpot={updateSpot} />
      ) : null}
    </main>
  );
}

function Inbox({
  pendingSpots,
  pendingOffers,
  updateSpot,
  updateOffer,
}: {
  pendingSpots: LivePosition[];
  pendingOffers: OfferRecord[];
  updateSpot: (id: number, patch: Record<string, unknown>) => Promise<void>;
  updateOffer: (id: string, status: OfferStatus) => Promise<void>;
}) {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-medium">Bandeja</h2>
      {pendingSpots.length === 0 && pendingOffers.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          No hay solicitudes pendientes.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {pendingSpots.map((spot) => (
            <article
              key={spot.id}
              className="rounded-2xl border border-[#e6b800] bg-[#fff8e4] p-5 dark:border-[#ffd54a] dark:bg-[#4a3a10]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="mono-label text-[#6b4f00]">posición {padSpot(spot.id)}</p>
                    <StatusPill status="reserved" />
                  </div>
                  <h3 className="mt-1 text-lg font-medium">{spot.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {spot.sponsor || "Sin marca"} · ${spot.price}
                    {spot.network ? ` · ${spot.network.toUpperCase()}` : ""}
                  </p>
                  {spot.email ? (
                    <a
                      href={`mailto:${spot.email}?subject=${encodeURIComponent(`Cbiux suitcase · posición ${padSpot(spot.id)}`)}`}
                      className="mt-1 block text-sm text-primary underline-offset-2 hover:underline"
                    >
                      {spot.email}
                    </a>
                  ) : null}
                  {spot.phone ? (
                    <a
                      href={whatsappHref(spot.phone)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block text-sm text-primary underline-offset-2 hover:underline"
                    >
                      WhatsApp {spot.phone}
                    </a>
                  ) : null}
                  <p className="mt-2 font-mono text-[11px] text-[#6b4f00]">
                    {spot.reservedAt ? `Reservó ${formatWhen(spot.reservedAt)}` : "Reserva pendiente de confirmar"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-[#147a4b] px-4 py-2 font-mono text-[10px] font-semibold tracking-[0.12em] text-white"
                    onClick={() => void updateSpot(spot.id, { status: "sold", sponsor: spot.sponsor }).catch(() => undefined)}
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-destructive px-4 py-2 font-mono text-[10px] font-semibold tracking-[0.12em] text-destructive"
                    onClick={() => void updateSpot(spot.id, { release: true }).catch(() => undefined)}
                  >
                    Rechazar
                  </button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-start gap-6">
                <AdminArtwork
                  positionId={spot.id}
                  sponsor={spot.sponsor}
                  src={spot.logo}
                  panelSize={spot.size}
                  size="lg"
                  onReplace={(logo) => updateSpot(spot.id, { logo })}
                />
                {spot.comprobante ? (
                  <AdminArtwork
                    positionId={spot.id}
                    sponsor={spot.sponsor}
                    src={spot.comprobante}
                    kind="comprobante"
                    size="lg"
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {spot.network === "sinpe" ? "SINPE sin captura todavía." : "Esperando pago o comprobante."}
                  </p>
                )}
              </div>
            </article>
          ))}
          {pendingOffers.map((offer) => (
            <article key={offer.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="mono-label text-primary">oferta libre</p>
                  <h3 className="mt-1 text-lg font-medium">{offer.brand}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{offer.email}</p>
                  {offer.phone ? (
                    <a
                      href={whatsappHref(offer.phone)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block text-sm text-primary underline-offset-2 hover:underline"
                    >
                      WhatsApp {offer.phone}
                    </a>
                  ) : null}
                  <p className="mt-3 text-sm">{offer.proposal}</p>
                  {offer.note ? <p className="mt-2 text-sm text-muted-foreground">{offer.note}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-foreground px-4 py-2 font-mono text-[10px] font-semibold tracking-[0.12em] text-background"
                    onClick={() => updateOffer(offer.id, "accepted")}
                  >
                    Aceptar
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-destructive px-4 py-2 font-mono text-[10px] font-semibold tracking-[0.12em] text-destructive"
                    onClick={() => updateOffer(offer.id, "declined")}
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ArtSections({
  artworkSpots,
  updateSpot,
}: {
  artworkSpots: LivePosition[];
  updateSpot: (id: number, patch: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <>
      <section className="mt-10">
        <h2 className="text-xl font-medium">Logos y comprobantes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tocá <strong>Descargar logo</strong> para guardar el archivo, o <strong>Cambiar logo</strong> para
          reemplazarlo. El recuadro indica el tamaño exacto.
        </p>
        {artworkSpots.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            Todavía no hay logos. Cuando alguien reserve y suba el diseño, aparece acá.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {artworkSpots.map((spot) => (
              <article key={`art-${spot.id}`} className="rounded-2xl border border-border bg-card p-4">
                <p className="mono-label text-primary">posición {padSpot(spot.id)}</p>
                <p className="mt-1 truncate text-lg font-medium">{spot.sponsor || spot.name}</p>
                {spot.phone ? (
                  <a
                    href={whatsappHref(spot.phone)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block truncate text-sm text-primary underline-offset-2 hover:underline"
                  >
                    WhatsApp {spot.phone}
                  </a>
                ) : null}
                <div className="mt-4 space-y-4">
                  <AdminArtwork
                    positionId={spot.id}
                    sponsor={spot.sponsor}
                    src={spot.logo}
                    panelSize={spot.size}
                    size="lg"
                    onReplace={(logo) => updateSpot(spot.id, { logo })}
                  />
                  {spot.comprobante ? (
                    <AdminArtwork
                      positionId={spot.id}
                      sponsor={spot.sponsor}
                      src={spot.comprobante}
                      kind="comprobante"
                      size="lg"
                    />
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12 pb-8">
        <h2 className="text-xl font-medium">Posts para Instagram</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Dos piezas 1080×1350: el agradecimiento con el logo grande, y la vista de la maleta con el espacio que compraron.
        </p>
        {artworkSpots.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            Cuando haya un logo, acá aparecen los posts listos para descargar.
          </p>
        ) : (
          <div className="mt-4 grid gap-4">
            {artworkSpots.map((spot) => (
              <AdminThanksCard
                key={`thanks-${spot.id}`}
                positionId={spot.id}
                sponsor={spot.sponsor}
                fallbackName={spot.name}
                logo={spot.logo}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function OffersList({ offers }: { offers: OfferRecord[] }) {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-medium">Ofertas</h2>
      <div className="mt-4 rounded-2xl border border-border bg-card">
        {offers.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Sin ofertas todavía.</p>
        ) : (
          offers.map((offer) => (
            <p key={offer.id} className="border-b border-border p-4 text-sm last:border-0">
              <span className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground">
                {offer.status}
              </span>
              {" · "}
              {offer.brand} · {offer.email}
              {offer.phone ? ` · ${offer.phone}` : ""} · {offer.proposal}
            </p>
          ))
        )}
      </div>
    </section>
  );
}

function PaymentsList({ payments }: { payments: PaymentRecord[] }) {
  return (
    <section className="mt-12 pb-8">
      <h2 className="text-xl font-medium">Pagos</h2>
      <div className="mt-4 rounded-2xl border border-border bg-card">
        {payments.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Sin pagos verificados.</p>
        ) : (
          payments.map((payment) => (
            <p key={payment.id} className="border-b border-border p-4 font-mono text-xs last:border-0" suppressHydrationWarning>
              #{padSpot(payment.positionId)} · {payment.brandName} · ${payment.amount} · {payment.network} ·{" "}
              {formatWhen(payment.verifiedAt)} · {payment.txHash}
              {payment.email ? ` · ${payment.email}` : ""}
            </p>
          ))
        )}
      </div>
    </section>
  );
}
