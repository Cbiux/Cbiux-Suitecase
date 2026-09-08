"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LivePosition, OfferRecord, OfferStatus, PaymentRecord, SpotStatus } from "@/lib/types";
import { padSpot } from "@/lib/positions";
import { ThemeToggle } from "./theme-toggle";

type AdminData = {
  positions: LivePosition[];
  payments: PaymentRecord[];
  offers: OfferRecord[];
};

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
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Cbiux · Suitecase</h1>
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

  const pendingSpots = useMemo(
    () => data.positions.filter((spot) => spot.status === "reserved"),
    [data.positions],
  );
  const pendingOffers = useMemo(
    () => data.offers.filter((offer) => offer.status === "pending"),
    [data.offers],
  );

  async function load() {
    const response = await fetch("/api/admin/spots", { cache: "no-store" });
    if (response.ok) setData((await response.json()) as AdminData);
  }

  async function updateSpot(positionId: number, patch: Record<string, unknown>) {
    await fetch("/api/admin/spots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ positionId, ...patch }),
    });
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

  return (
    <main className="shell py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mono-label text-primary">admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Solicitudes</h1>
          <p className="mt-2 max-w-[52ch] text-sm text-muted-foreground">
            Revisá reservas, comprobantes SINPE y ofertas libres. Aceptá para marcar vendido, o rechazá para
            liberar el spot.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={logout}
            className="inline-flex h-11 items-center rounded-full border border-border px-4 font-mono text-[10px] font-semibold tracking-[0.12em]"
          >
            Salir
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Pendientes" value={String(pendingSpots.length + pendingOffers.length)} />
        <Stat label="Reservas" value={String(pendingSpots.length)} />
        <Stat label="Ofertas" value={String(pendingOffers.length)} />
        <Stat
          label="Vendidas"
          value={String(data.positions.filter((spot) => spot.status === "sold").length)}
        />
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-medium">Bandeja</h2>
        {pendingSpots.length === 0 && pendingOffers.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            No hay solicitudes pendientes.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {pendingSpots.map((spot) => (
              <article key={spot.id} className="rounded-2xl border border-[#e6b800] bg-[#fff8e4] p-5 dark:border-[#ffd54a] dark:bg-[#4a3a10]">
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
                    {spot.email ? <p className="mt-1 text-sm text-muted-foreground">{spot.email}</p> : null}
                    <p className="mt-2 font-mono text-[11px] text-[#6b4f00]">
                      {spot.reservedAt ? `Reservó ${formatWhen(spot.reservedAt)}` : "Reserva pendiente de confirmar"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-full bg-[#147a4b] px-4 py-2 font-mono text-[10px] font-semibold tracking-[0.12em] text-white"
                      onClick={() => updateSpot(spot.id, { status: "sold", sponsor: spot.sponsor })}
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-destructive px-4 py-2 font-mono text-[10px] font-semibold tracking-[0.12em] text-destructive"
                      onClick={() => updateSpot(spot.id, { release: true })}
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-4">
                  {spot.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={spot.logo}
                      alt={`Diseño ${padSpot(spot.id)}`}
                      className="h-20 w-20 rounded-xl border border-border bg-white object-contain p-1"
                    />
                  ) : null}
                  {spot.comprobante ? (
                    <a href={spot.comprobante} target="_blank" rel="noreferrer" className="block w-fit">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={spot.comprobante}
                        alt={`Comprobante ${padSpot(spot.id)}`}
                        className="h-28 w-28 rounded-xl border border-border object-cover"
                      />
                      <span className="mt-1 block font-mono text-[9px] tracking-[0.08em] text-primary">
                        ABRIR COMPROBANTE
                      </span>
                    </a>
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

      <section className="mt-12">
        <h2 className="text-xl font-medium">Inventario</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground">
              <tr className="border-b border-border">
                <th className="p-3">ID</th>
                <th className="p-3">Nombre</th>
                <th className="p-3">$</th>
                <th className="p-3">Status</th>
                <th className="p-3">Sponsor</th>
                <th className="p-3">Logo</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.positions.map((spot) => (
                <AdminRow
                  key={`${spot.id}-${spot.status}-${spot.sponsor}-${spot.logo}`}
                  spot={spot}
                  onUpdate={updateSpot}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-medium">Ofertas</h2>
        <div className="mt-4 rounded-2xl border border-border bg-card">
          {data.offers.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Sin ofertas todavía.</p>
          ) : (
            data.offers.map((offer) => (
              <p key={offer.id} className="border-b border-border p-4 text-sm last:border-0">
                <span className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground">
                  {offer.status}
                </span>
                {" · "}
                {offer.brand} · {offer.email} · {offer.proposal}
              </p>
            ))
          )}
        </div>
      </section>

      <section className="mt-12 pb-8">
        <h2 className="text-xl font-medium">Pagos</h2>
        <div className="mt-4 rounded-2xl border border-border bg-card">
          {data.payments.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Sin pagos verificados.</p>
          ) : (
            data.payments.map((payment) => (
              <p key={payment.id} className="border-b border-border p-4 font-mono text-xs last:border-0">
                #{padSpot(payment.positionId)} · {payment.brandName} · ${payment.amount} · {payment.network} ·{" "}
                {formatWhen(payment.verifiedAt)} · {payment.txHash}
              </p>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function formatWhen(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function StatusPill({ status }: { status: "available" | "reserved" | "sold" }) {
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <span className="mono-label">{label}</span>
      <strong className="mt-1 block text-lg font-medium">{value}</strong>
    </div>
  );
}

function AdminRow({
  spot,
  onUpdate,
}: {
  spot: LivePosition;
  onUpdate: (id: number, patch: Record<string, unknown>) => Promise<void>;
}) {
  const [sponsor, setSponsor] = useState(spot.sponsor);
  const [logo, setLogo] = useState(spot.logo);
  const [status, setStatus] = useState<SpotStatus>(spot.status);

  return (
    <tr className="border-b border-border last:border-0">
      <td className="p-3 font-mono">{padSpot(spot.id)}</td>
      <td className="p-3">{spot.name}</td>
      <td className="p-3">${spot.price}</td>
      <td className="p-3">
        <div className="flex flex-col gap-2">
          <StatusPill status={spot.status} />
          <select
            className="rounded-lg border border-border bg-card px-2 py-1"
            value={status}
            onChange={(e) => setStatus(e.target.value as SpotStatus)}
          >
            <option value="available">libre</option>
            <option value="reserved">reservado</option>
            <option value="sold">confirmado</option>
          </select>
        </div>
      </td>
      <td className="p-3">
        <input
          className="w-32 rounded-lg border border-border bg-card px-2 py-1"
          value={sponsor}
          onChange={(e) => setSponsor(e.target.value)}
        />
      </td>
      <td className="p-3">
        <input
          className="w-40 rounded-lg border border-border bg-card px-2 py-1"
          value={logo}
          onChange={(e) => setLogo(e.target.value)}
          placeholder="https://… o data:"
        />
      </td>
      <td className="p-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-border px-2 py-1 font-mono text-[10px]"
            onClick={() => onUpdate(spot.id, { status, sponsor, logo })}
          >
            SAVE
          </button>
          <button
            type="button"
            className="rounded-md border border-border px-2 py-1 font-mono text-[10px]"
            onClick={() => onUpdate(spot.id, { release: true })}
          >
            RESET
          </button>
        </div>
      </td>
    </tr>
  );
}
