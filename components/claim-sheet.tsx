"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import QRCode from "qrcode";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { compressReceipt } from "@/lib/compress-receipt";
import { SITE } from "@/lib/config";
import { padSpot } from "@/lib/positions";
import { formatMoney } from "@/lib/currency";
import type { LivePosition, PaymentNetwork, PaymentWallets } from "@/lib/types";
import { useLanguage } from "./language-provider";
import { useInventory } from "./inventory-provider";
import { useCurrency } from "./currency-provider";

type Step = "detail" | "pay" | "success";

function useMobileSheet() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const media = window.matchMedia("(max-width: 767px)");
      media.addEventListener("change", onStoreChange);
      return () => media.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(max-width: 767px)").matches,
    () => false,
  );
}

export function ClaimSheet() {
  const { selected, claimOpen, setSelectedId } = useInventory();
  const mobile = useMobileSheet();

  return (
    <Sheet open={claimOpen && Boolean(selected)} onOpenChange={(next) => !next && setSelectedId(null)}>
      {selected ? <ClaimBody key={selected.id} selected={selected} mobile={mobile} /> : null}
    </Sheet>
  );
}

function ClaimBody({ selected, mobile }: { selected: LivePosition; mobile: boolean }) {
  const { dict, locale } = useLanguage();
  const { format, currency } = useCurrency();
  const { refresh, data } = useInventory();
  const [step, setStep] = useState<Step>("detail");
  const [brandName, setBrandName] = useState("");
  const [email, setEmail] = useState("");
  const [network, setNetwork] = useState<PaymentNetwork>("sinpe");
  const [txHash, setTxHash] = useState("");
  const [sinpeRef, setSinpeRef] = useState("");
  const [sinpeSent, setSinpeSent] = useState(false);
  const [comprobante, setComprobante] = useState("");
  const [receiptName, setReceiptName] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState("");
  const [memo, setMemo] = useState("");
  const [qr, setQr] = useState("");
  const [logo, setLogo] = useState("");

  const wallets = data?.wallets;
  const address =
    network === "sinpe"
      ? wallets?.sinpe
      : network === "stellar"
        ? wallets?.stellar
        : network === "solana"
          ? wallets?.solana
          : wallets?.evm;

  const shareText = useMemo(() => {
    const n = padSpot(selected.id);
    return locale === "es"
      ? `Acabo de poner el logo de ${brandName || "mi marca"} en la maleta de cabina de @${SITE.x} rumbo a Europa e India. Posición ${n}.\n\nCarry-on 55×40×20 · 22 spots · desde ${formatMoney(45, currency)} · USDC`
      : `Just put ${brandName || "our"} logo on @${SITE.x}'s carry-on cabin bag to Europe & India. Position ${n}.\n\nCabin 55×40×20 · 22 spots · from ${formatMoney(45, currency)} · USDC`;
  }, [selected, brandName, locale, currency]);

  async function makeQr(nextNetwork: PaymentNetwork, nextWallets: PaymentWallets) {
    const value =
      nextNetwork === "sinpe"
        ? nextWallets.sinpe
        : nextNetwork === "stellar"
          ? nextWallets.stellar
          : nextNetwork === "solana"
            ? nextWallets.solana
            : nextWallets.evm;
    if (!value) {
      setQr("");
      return;
    }
    const image = await QRCode.toDataURL(value, {
      width: 220,
      margin: 1,
      color: { dark: "#0a0a0a", light: "#f5f5f5" },
    });
    setQr(image);
  }

  async function startPay(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionId: selected.id,
          brandName,
          email,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error);
      setRecoveryToken(json.recoveryToken);
      setMemo(json.memo);
      if (json.wallets) await makeQr("sinpe", json.wallets);
      setStep("pay");
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "CHECKOUT_FAILED");
    } finally {
      setBusy(false);
    }
  }

  async function pickNetwork(next: PaymentNetwork) {
    setNetwork(next);
    if (wallets) await makeQr(next, wallets);
  }

  function receiptError(code: string) {
    if (code === "MISSING_COMPROBANTE") return dict.claim.sinpeNeedReceipt;
    if (code === "BAD_IMAGE") return dict.claim.sinpeBadImage;
    if (code === "TOO_LARGE") return dict.claim.sinpeTooLarge;
    return code;
  }

  async function onReceipt(file: File | undefined) {
    if (!file) return;
    setStatus("");
    try {
      const dataUrl = await compressReceipt(file);
      setComprobante(dataUrl);
      setReceiptName(file.name);
    } catch (error) {
      setComprobante("");
      setReceiptName("");
      setStatus(receiptError(error instanceof Error ? error.message : "BAD_IMAGE"));
    }
  }

  async function submitSinpe(event: React.FormEvent) {
    event.preventDefault();
    if (!comprobante) {
      setStatus(dict.claim.sinpeNeedReceipt);
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/sinpe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionId: selected.id,
          recoveryToken,
          reference: sinpeRef,
          comprobante,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error);
      setSinpeSent(true);
      await refresh();
    } catch (error) {
      setStatus(receiptError(error instanceof Error ? error.message : "SINPE_FAILED"));
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionId: selected.id,
          recoveryToken,
          txHash,
          network,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error);
      setStep("success");
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "VERIFY_FAILED");
    } finally {
      setBusy(false);
    }
  }

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (!logo) return;
    setBusy(true);
    try {
      const response = await fetch("/api/upload-logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionId: selected.id,
          recoveryToken,
          dataUrl: logo,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error);
      setStatus("ok");
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "UPLOAD_FAILED");
    } finally {
      setBusy(false);
    }
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    if (!["image/png", "image/webp"].includes(file.type)) {
      setStatus("BAD_IMAGE");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setStatus("TOO_LARGE");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <SheetContent
      side={mobile ? "bottom" : "right"}
      className="w-full overflow-y-auto border-border bg-card text-foreground sm:max-w-md data-[side=bottom]:max-h-[78vh] data-[side=bottom]:rounded-t-3xl"
    >
      <SheetHeader className="px-6 pt-6">
          <p className="mono-label text-primary">
            {dict.facesLong[selected.face]} {dict.claim.placement}
            {selected.tier === "presenting" ? ` · ${dict.claim.presenting}` : ""}
          </p>
          <SheetTitle className="text-3xl font-semibold tracking-tight">
            {dict.claim.position} {padSpot(selected.id)}
          </SheetTitle>
        </SheetHeader>
        <div className="px-6 pb-10">
        <p className="mt-1 text-sm text-muted-foreground">{selected.name}</p>
        <div className="mt-3 text-5xl font-semibold tracking-tight text-primary">
          {format(selected.price)}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {currency === "crc" ? `≈ $${selected.price} USD` : `≈ ${formatMoney(selected.price, "crc")}`}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{dict.currency.rateNote}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {dict.claim.approx} {selected.size}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{selected.logoGuidance}</p>

        <ul className="mt-5 space-y-2 text-sm text-foreground">
          {selected.benefits.map((item) => (
            <li key={item} className="border-l-2 border-primary pl-3">
              {item}
            </li>
          ))}
        </ul>

        {selected.status === "sold" && step !== "success" ? (
          <p className="mt-6 text-sm text-destructive">{dict.claim.soldNote}</p>
        ) : null}
        {selected.status === "reserved" && step === "detail" ? (
          <p className="mt-6 text-sm text-[#8a6a12]">{dict.claim.heldNote}</p>
        ) : null}

        {step === "detail" && selected.status === "available" ? (
          <form className="mt-8 space-y-4" onSubmit={startPay}>
            <div className="space-y-2">
              <Label htmlFor="brand">{dict.claim.brand}</Label>
              <Input
                id="brand"
                required
                maxLength={60}
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{dict.claim.email}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full rounded-full" disabled={busy}>
              {busy ? dict.claim.preparing : dict.claim.continue}
            </Button>
          </form>
        ) : null}

        {step === "pay" ? (
          <div className="mt-8 space-y-5">
            <div>
              <p className="font-mono text-[11px] font-semibold tracking-[0.12em] text-foreground">
                {dict.claim.payTitle}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{dict.claim.payBody}</p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {(
                [
                  ["sinpe", dict.claim.methodSinpe],
                  ["evm", dict.claim.methodEvm],
                  ["stellar", dict.claim.methodStellar],
                ] as const
              ).map(([item, label]) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => void pickNetwork(item)}
                  className={`min-h-11 rounded-xl px-3 text-left font-mono text-[11px] font-semibold tracking-[0.08em] ${
                    network === item
                      ? "bg-foreground text-background"
                      : "border border-border text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qr}
                alt={network === "sinpe" ? "SINPE QR" : "USDC QR"}
                className="mx-auto h-40 w-40 rounded-xl border border-border"
              />
            ) : null}
            <div className="rounded-2xl border border-border bg-muted p-3">
              <p className="mono-label">
                {network === "sinpe"
                  ? dict.claim.sinpePhone
                  : network === "stellar"
                    ? "USDC · STELLAR"
                    : "USDC · EVM / BASE"}{" "}
                · {network === "sinpe" ? format(selected.price) : `$${selected.price}`}
              </p>
              <p className="mt-2 break-all font-mono text-[13px]">{address}</p>
              <button
                type="button"
                className="mt-2 font-mono text-[10px] tracking-[0.1em] text-primary"
                onClick={() => address && void navigator.clipboard.writeText(address)}
              >
                COPY
              </button>
              <p className="mt-3 font-mono text-[11px] text-primary">MEMO {memo}</p>
            </div>
            {network === "sinpe" ? (
              sinpeSent ? (
                <p className="rounded-2xl border border-primary/30 bg-primary/10 px-3 py-3 text-sm text-primary">
                  {dict.claim.sinpeWait}
                </p>
              ) : (
                <form className="space-y-3" onSubmit={submitSinpe}>
                  <p className="text-sm leading-relaxed text-muted-foreground">{dict.claim.sinpeHelp}</p>
                  <div className="space-y-2">
                    <Label htmlFor="sinpe-receipt">{dict.claim.sinpeReceipt}</Label>
                    <Input
                      id="sinpe-receipt"
                      type="file"
                      required
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => void onReceipt(e.target.files?.[0])}
                    />
                    <p className="text-xs text-muted-foreground">{dict.claim.sinpeReceiptHint}</p>
                    {comprobante ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={comprobante}
                        alt={receiptName || "comprobante"}
                        className="max-h-36 rounded-xl border border-border object-contain"
                      />
                    ) : null}
                  </div>
                  <Label htmlFor="sinpe-ref">{dict.claim.sinpeReference}</Label>
                  <Input
                    id="sinpe-ref"
                    value={sinpeRef}
                    onChange={(e) => setSinpeRef(e.target.value)}
                    maxLength={120}
                  />
                  <Button
                    type="submit"
                    className="w-full rounded-full"
                    disabled={busy || !comprobante}
                  >
                    {busy ? dict.claim.sinpeUploading : dict.claim.sinpeSubmit}
                  </Button>
                </form>
              )
            ) : (
              <form className="space-y-3" onSubmit={verify}>
                <Label htmlFor="tx">{dict.claim.paste}</Label>
                <Input
                  id="tx"
                  required
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder={network === "evm" ? "0x…" : "stellar hash"}
                />
                <p className="text-xs text-muted-foreground">{dict.claim.demoNote}</p>
                <Button type="submit" className="w-full rounded-full" disabled={busy}>
                  {busy ? dict.claim.verifying : dict.claim.verify}
                </Button>
              </form>
            )}
          </div>
        ) : null}

        {step === "success" ? (
          <div className="mt-8 space-y-5">
            <p className="mono-label text-[#147a4b]">{dict.claim.successKicker}</p>
            <h3 className="text-3xl font-semibold tracking-tight">{dict.claim.successTitle}</h3>
            <p className="text-sm text-muted-foreground">
              {brandName} · {selected.name} · {format(selected.price)}
            </p>
            <p className="break-all font-mono text-[11px] text-muted-foreground">{txHash}</p>
            <form className="space-y-3" onSubmit={publish}>
              <Label htmlFor="logo">{dict.claim.uploadLabel}</Label>
              <Input
                id="logo"
                type="file"
                accept="image/png,image/webp"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
              <p className="text-xs text-muted-foreground">{dict.claim.uploadHint}</p>
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="" className="h-16 object-contain" />
              ) : null}
              <Button type="submit" className="w-full rounded-full" disabled={busy || !logo}>
                {busy ? dict.claim.publishing : dict.claim.publish}
              </Button>
            </form>
            <div className="grid grid-cols-2 gap-2">
              <a
                className="inline-flex min-h-9 items-center justify-center rounded-full bg-foreground font-mono text-[10px] font-semibold tracking-[0.08em] text-background"
                href={`https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noreferrer"
              >
                {dict.claim.shareX}
              </a>
              <button
                type="button"
                className="min-h-9 rounded-full border border-border font-mono text-[10px] font-semibold tracking-[0.08em]"
                onClick={() => void navigator.clipboard.writeText(shareText)}
              >
                {dict.claim.copyPost}
              </button>
              <a
                className="inline-flex min-h-9 items-center justify-center rounded-full border border-border font-mono text-[10px] font-semibold tracking-[0.08em]"
                href={SITE.xUrl}
                target="_blank"
                rel="noreferrer"
              >
                {dict.claim.sendSvg}
              </a>
              <a
                className="inline-flex min-h-9 items-center justify-center rounded-full border border-border font-mono text-[10px] font-semibold tracking-[0.08em]"
                href={SITE.telegramUrl}
                target="_blank"
                rel="noreferrer"
              >
                {dict.claim.sendTelegram}
              </a>
            </div>
          </div>
        ) : null}

        {status && status !== "ok" ? (
          <p className="mt-4 font-mono text-xs text-destructive">{status}</p>
        ) : null}
      </div>
    </SheetContent>
  );
}
