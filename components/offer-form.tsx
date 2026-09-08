"use client";

import { FormEvent, useState } from "react";
import { SITE } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "./language-provider";
import { AnimatedLetters } from "./animated-letters";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type OfferFields = {
  brand: string;
  email: string;
  proposal: string;
  note: string;
};

const empty: OfferFields = { brand: "", email: "", proposal: "", note: "" };

function interpolate(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

function buildMailto(fields: OfferFields, dict: ReturnType<typeof useLanguage>["dict"]) {
  const subject = interpolate(dict.offer.mailSubject, { brand: fields.brand });
  const lines = [
    `${dict.offer.mailBrand}: ${fields.brand}`,
    `${dict.offer.mailEmail}: ${fields.email}`,
    `${dict.offer.mailProposal}: ${fields.proposal}`,
  ];
  if (fields.note) lines.push(`${dict.offer.mailNote}: ${fields.note}`);
  const href = `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
  return href;
}

export function OfferForm() {
  const { dict } = useLanguage();
  const [fields, setFields] = useState<OfferFields>(empty);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  function update<K extends keyof OfferFields>(key: K, value: OfferFields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const brand = fields.brand.trim();
    const email = fields.email.trim();
    const proposal = fields.proposal.trim();
    const note = fields.note.trim();

    if (!brand || !email || !proposal) {
      setError(dict.offer.required);
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setError(dict.offer.invalidEmail);
      return;
    }

    setError("");
    setBusy(true);
    const payload = { brand, email, proposal, note };
    try {
      await fetch("/api/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // mailto still goes out if the store is unavailable
    }
    window.location.href = buildMailto(payload, dict);
    setSent(true);
    setBusy(false);
  }

  return (
    <section id="offer" className="shell py-16 md:py-24">
      <p className="mono-label text-primary">{dict.offer.kicker}</p>
      <h2 className="mt-3 max-w-[16ch] text-[clamp(32px,8vw,56px)] font-semibold tracking-[-0.05em]">
        <AnimatedLetters text={dict.offer.title} />
      </h2>
      <p className="mt-4 max-w-[620px] text-muted-foreground">{dict.offer.body}</p>

      {sent ? (
        <div className="mt-8 max-w-xl rounded-2xl border border-border bg-card p-6">
          <h3 className="text-xl font-medium tracking-tight">{dict.offer.successTitle}</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {interpolate(dict.offer.successBody, { email: SITE.email })}
          </p>
          <button
            type="button"
            className="mt-6 inline-flex min-h-11 items-center font-mono text-[11px] font-semibold tracking-[0.1em] text-primary underline-offset-4 hover:underline"
            onClick={() => {
              setFields(empty);
              setSent(false);
            }}
          >
            {dict.offer.another}
          </button>
        </div>
      ) : (
        <form
          className="mt-8 max-w-xl space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6"
          onSubmit={onSubmit}
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="offer-brand">
              {dict.offer.brand} <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="offer-brand"
              name="brand"
              required
              autoComplete="organization"
              maxLength={80}
              value={fields.brand}
              onChange={(e) => update("brand", e.target.value)}
              className="min-h-11 bg-card"
              aria-required="true"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offer-email">
              {dict.offer.email} <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="offer-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              maxLength={120}
              value={fields.email}
              onChange={(e) => update("email", e.target.value)}
              className="min-h-11 bg-card"
              aria-required="true"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offer-proposal">
              {dict.offer.proposal} <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="offer-proposal"
              name="proposal"
              required
              maxLength={400}
              value={fields.proposal}
              onChange={(e) => update("proposal", e.target.value)}
              placeholder={dict.offer.proposalHint}
              className="min-h-11 bg-card"
              aria-required="true"
              aria-describedby="offer-proposal-hint"
            />
            <p id="offer-proposal-hint" className="text-xs text-muted-foreground">
              {dict.offer.proposalHint}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="offer-note">
              {dict.offer.note}{" "}
              <span className="font-normal text-muted-foreground">({dict.offer.noteHint})</span>
            </Label>
            <textarea
              id="offer-note"
              name="note"
              rows={4}
              maxLength={1000}
              value={fields.note}
              onChange={(e) => update("note", e.target.value)}
              placeholder={dict.offer.notePlaceholder}
              className="w-full min-w-0 rounded-lg border border-input bg-card px-2.5 py-2 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="min-h-12 w-full rounded-full" disabled={busy}>
            {busy ? dict.offer.sending : dict.offer.submit}
          </Button>
        </form>
      )}
    </section>
  );
}
