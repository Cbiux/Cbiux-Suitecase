"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import QRCode from "qrcode";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { compressReceipt } from "@/lib/compress-receipt";
import { ARTWORK_ACCEPT, SITE } from "@/lib/config";
import { padSpot } from "@/lib/positions";
import { formatMoney } from "@/lib/currency";
import { phoneLooksValid } from "@/lib/phone";
import type { LivePosition, PaymentNetwork, PaymentWallets } from "@/lib/types";
import { useLanguage } from "./language-provider";
import { useInventory } from "./inventory-provider";
import { useCurrency } from "./currency-provider";
import { FileAttachButton } from "./file-attach";
import { CoordContacts } from "./coord-contacts";
import { spotOwnerLabel } from "@/lib/spot-copy";

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
  const [phone, setPhone] = useState("");
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
  const [logoName, setLogoName] = useState("");
  const [verified, setVerified] = useState(false);

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

  useEffect(() => {
    try {
      const token = sessionStorage.getItem(grantKey(selected.id));
      if (!token) return;
      setRecoveryToken(token);
      if (selected.status === "reserved") setStep("pay");
      if (selected.logo) {
        setLogo(selected.logo);
        setLogoName(dict.claim.attached);
      }
    } catch {
      /* ignore private mode */
    }
  }, [dict.claim.attached, selected.id, selected.logo, selected.status]);

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
    if (!logo) {
      setStatus(dict.claim.needArtwork);
      return;
    }
    if (!phoneLooksValid(phone)) {
      setStatus(dict.claim.needPhone);
      return;
    }
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
          phone,
          logo,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error);
      rememberGrant(selected.id, json.recoveryToken);
      setMemo(json.memo);
      if (json.wallets) await makeQr("sinpe", json.wallets);
      setStep("pay");
      await refresh();
    } catch (error) {
      setStatus(payError(error instanceof Error ? error.message : "CHECKOUT_FAILED"));
    } finally {
      setBusy(false);
    }
  }

  async function pickNetwork(next: PaymentNetwork) {
    setNetwork(next);
    if (wallets) await makeQr(next, wallets);
  }

  function grantKey(id: number) {
    return `cbiux-grant-${id}`;
  }

  function rememberGrant(id: number, token: string) {
    setRecoveryToken(token);
    try {
      sessionStorage.setItem(grantKey(id), token);
    } catch {
      /* ignore private mode */
    }
  }

  function currentGrant() {
    if (recoveryToken) return recoveryToken;
    try {
      return sessionStorage.getItem(grantKey(selected.id)) ?? "";
    } catch {
      return "";
    }
  }

  function appendReceipt(form: FormData) {
    if (!comprobante) return;
    const blob = dataUrlToBlob(comprobante);
    form.append(
      "comprobante",
      blob,
      `${receiptName.replace(/\.[^.]+$/, "") || "comprobante"}.jpg`,
    );
  }

  function payError(code: string) {
    if (code === "MISSING_FIELDS") return dict.claim.needBrand;
    if (code === "MISSING_ARTWORK") return dict.claim.needArtwork;
    if (code === "MISSING_PHONE") return dict.claim.needPhone;
    if (code === "SOLD") return dict.claim.soldNote;
    if (code === "RESERVED") return dict.claim.heldNote;
    if (code === "BAD_TOKEN" || code === "NOT_RESERVED") return dict.claim.payExpired;
    if (code === "MISSING_COMPROBANTE") return dict.claim.sinpeNeedReceipt;
    if (code === "BAD_IMAGE") return dict.claim.sinpeBadImage;
    if (code === "TOO_LARGE") return dict.claim.sinpeTooLarge;
    if (code === "CHECKOUT_FAILED") return dict.claim.checkoutFailed;
    if (code === "SINPE_FAILED") return dict.claim.sinpeFailed;
    return code;
  }

  function receiptError(code: string) {
    return payError(code);
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
    const token = currentGrant();
    if (!comprobante) {
      setStatus(dict.claim.sinpeNeedReceipt);
      return;
    }
    if (!token) {
      setStatus(dict.claim.payExpired);
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      const form = new FormData();
      form.append("positionId", String(selected.id));
      form.append("recoveryToken", token);
      form.append("reference", sinpeRef);
      appendReceipt(form);
      if (logo) form.append("logo", logo);
      const response = await fetch("/api/sinpe", {
        method: "POST",
        body: form,
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error);
      setSinpeSent(true);
      setVerified(false);
      setStep("success");
      await refresh();
    } catch (error) {
      setStatus(receiptError(error instanceof Error ? error.message : "SINPE_FAILED"));
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    const token = currentGrant();
    if (!token) {
      setStatus(dict.claim.payExpired);
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      const form = new FormData();
      form.append("positionId", String(selected.id));
      form.append("recoveryToken", token);
      form.append("txHash", txHash.trim());
      form.append("network", network);
      if (logo) form.append("logo", logo);
      appendReceipt(form);
      const response = await fetch("/api/verify", {
        method: "POST",
        body: form,
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error);
      setVerified(true);
      setStep("success");
      await refresh();
    } catch (error) {
      setStatus(payError(error instanceof Error ? error.message : "VERIFY_FAILED"));
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
          recoveryToken: currentGrant(),
          dataUrl: logo,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error);
      setStatus("ok");
      await refresh();
    } catch (error) {
      setStatus(payError(error instanceof Error ? error.message : "UPLOAD_FAILED"));
    } finally {
      setBusy(false);
    }
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    const named = /\.(png|webp|svg|jpe?g)$/i.test(file.name);
    const typed = ["image/png", "image/webp", "image/svg+xml", "image/jpeg", "image/jpg"].includes(file.type);
    if (!typed && !named) {
      setStatus(dict.claim.sinpeBadImage);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setStatus(dict.claim.sinpeTooLarge);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(String(reader.result));
      setLogoName(file.name);
    };
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
          <p className="mt-6 text-sm text-[#147a4b]">{spotOwnerLabel(selected, dict)}</p>
        ) : null}
        {selected.status === "reserved" && step === "detail" ? (
          <p className="mt-6 text-sm text-[#8a6a12]">
            {spotOwnerLabel(selected, dict)}. {dict.claim.heldNote}
          </p>
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
            <div className="space-y-2">
              <Label htmlFor="company-phone">{dict.claim.phone}</Label>
              <Input
                id="company-phone"
                type="tel"
                required
                inputMode="tel"
                autoComplete="tel"
                placeholder={dict.claim.phoneHint}
                maxLength={20}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <FileAttachButton
              id="artwork"
              label={dict.claim.attachLogo}
              hint={dict.claim.artworkOnBag}
              accept={ARTWORK_ACCEPT}
              required
              fileName={logoName}
              previewUrl={logo}
              onFile={onFile}
            />
            <Button type="submit" className="w-full rounded-full" disabled={busy || !logo || !phoneLooksValid(phone)}>
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
            <div className="mt-3">
              <CoordContacts label={dict.claim.coordHelp} />
            </div>
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
              {network === "sinpe" && memo ? (
                <p className="mt-3 font-mono text-[11px] text-primary">MEMO {memo}</p>
              ) : null}
            </div>
            {network === "sinpe" ? (
              sinpeSent ? (
                <p className="rounded-2xl border border-primary/30 bg-primary/10 px-3 py-3 text-sm text-primary">
                  {dict.claim.sinpeWait}
                </p>
              ) : (
                <form className="space-y-3" onSubmit={submitSinpe}>
                  <p className="text-sm leading-relaxed text-muted-foreground">{dict.claim.sinpeHelp}</p>
                  <FileAttachButton
                    id="sinpe-receipt"
                    label={dict.claim.attachReceipt}
                    hint={dict.claim.sinpeReceiptHint}
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    required
                    fileName={receiptName}
                    previewUrl={comprobante}
                    onFile={(file) => void onReceipt(file)}
                  />
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
                <FileAttachButton
                  id="tx-receipt"
                  label={dict.claim.attachTxReceipt}
                  hint={dict.claim.txReceiptHint}
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  fileName={receiptName}
                  previewUrl={comprobante}
                  onFile={(file) => void onReceipt(file)}
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
            <p className={`mono-label ${verified ? "text-[#147a4b]" : "text-primary"}`}>
              {verified ? dict.claim.successKicker : dict.claim.pendingKicker}
            </p>
            <h3 className="text-3xl font-semibold tracking-tight">
              {verified ? dict.claim.successTitle : dict.claim.pendingTitle}
            </h3>
            <p className="text-sm text-muted-foreground">
              {brandName} · {selected.name} · {format(selected.price)}
            </p>
            {verified && txHash ? (
              <p className="break-all font-mono text-[11px] text-muted-foreground">{txHash}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{dict.claim.pendingBody}</p>
            )}
            {comprobante ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={comprobante}
                alt=""
                className="max-h-36 rounded-xl border border-border object-contain"
              />
            ) : null}
            <CoordContacts label={dict.claim.coordHelp} />
            <form className="space-y-3" onSubmit={publish}>
              <FileAttachButton
                id="logo"
                label={dict.claim.attachLogo}
                hint={dict.claim.uploadHint}
                accept={ARTWORK_ACCEPT}
                fileName={logoName || (logo ? dict.claim.attached : "")}
                previewUrl={logo}
                onFile={onFile}
              />
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

function dataUrlToBlob(dataUrl: string) {
  const [header, body] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(header)?.[1] ?? "image/jpeg";
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
