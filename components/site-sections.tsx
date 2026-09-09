"use client";

import { SITE } from "@/lib/config";
import { useLanguage } from "./language-provider";
import { useInventory } from "./inventory-provider";
import { BrandLogo } from "./brand-logo";
import { RouteMap } from "./route-map";
import { AnimatedLetters } from "./animated-letters";

export function DailyVlog() {
  const { dict } = useLanguage();
  return (
    <section id="vlog" className="shell py-16 md:py-24">
      <div className="overflow-hidden rounded-[28px] border border-border bg-card md:grid md:grid-cols-[0.9fr_1.1fr]">
        <figure className="relative min-h-[340px] bg-muted md:min-h-[560px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/photo.jpg"
            alt={dict.vlog.photoAlt}
            width={864}
            height={1152}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover object-[center_18%] grayscale contrast-[1.05]"
          />
        </figure>
        <div className="flex flex-col justify-center p-6 md:p-12">
          <p className="mono-label text-primary">{dict.vlog.kicker}</p>
          <h2 className="mt-3 max-w-[16ch] text-[clamp(30px,7vw,48px)] font-semibold tracking-[-0.05em]">
            <AnimatedLetters text={dict.vlog.title} />
          </h2>
          <p className="mt-4 max-w-[46ch] text-[16px] leading-relaxed text-muted-foreground">
            {dict.vlog.body}
          </p>
          <ul className="mt-7 space-y-3">
            {dict.vlog.points.map((point) => (
              <li key={point} className="border-l-2 border-primary pl-3 text-sm leading-relaxed text-muted-foreground">
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function WhatYouGet() {
  const { dict } = useLanguage();
  return (
    <section id="included" className="shell py-16 md:py-24">
      <p className="mono-label text-primary">{dict.included.kicker}</p>
      <h2 className="mt-3 max-w-[16ch] text-[clamp(32px,8vw,56px)] font-semibold tracking-[-0.05em]">
        <AnimatedLetters text={dict.included.title} />
      </h2>
      <p className="mt-4 max-w-[620px] text-muted-foreground">{dict.included.intro}</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {dict.included.items.map((item) => (
          <article key={item.n} className="rounded-2xl border border-border bg-card p-6">
            <span className="mono-label text-primary">{item.n}</span>
            <h3 className="mt-3 text-xl font-medium tracking-tight">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
          </article>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-border bg-card p-5 sm:flex sm:items-center sm:gap-4">
        <span className="inline-flex shrink-0 rounded-full border border-primary/30 px-3 py-1.5 font-mono text-[10px] font-semibold tracking-[0.12em] text-primary">
          {dict.included.presentingLabel}
        </span>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:mt-0">
          <strong className="font-medium text-foreground">{dict.claim.presenting}. </strong>
          {dict.included.presenting}
        </p>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const { dict } = useLanguage();
  return (
    <section id="how" className="shell py-16 md:py-24">
      <p className="mono-label text-primary">{dict.how.kicker}</p>
      <h2 className="mt-3 text-[clamp(32px,8vw,56px)] font-semibold tracking-[-0.05em]">
        <AnimatedLetters text={dict.how.title} />
      </h2>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {dict.how.steps.map((step) => (
          <article key={step.n} className="rounded-2xl border border-border bg-card p-6">
            <span className="mono-label text-primary">{step.n}</span>
            <h3 className="mt-3 text-xl font-medium tracking-tight">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </article>
        ))}
      </div>
      <div className="mt-10 grid gap-3 md:grid-cols-4">
        {dict.timeline.items.map((item) => (
          <article key={item.title} className="rounded-2xl border border-border bg-card p-6">
            <time className="mono-label text-primary">{item.date}</time>
            <h3 className="mt-3 text-lg font-medium tracking-tight">{item.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function Funds() {
  const { dict } = useLanguage();
  return (
    <section id="trip" className="shell py-16 md:py-24">
      <RouteMap />
      <div className="mt-16 md:mt-24">
        <p className="mono-label text-primary">{dict.funds.kicker}</p>
        <h2 className="mt-3 text-[clamp(32px,8vw,56px)] font-semibold tracking-[-0.05em]">
          <AnimatedLetters text={dict.funds.title} />
        </h2>
        <p className="mt-4 max-w-[640px] text-muted-foreground">{dict.funds.intro}</p>
        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
          {dict.funds.items.map((item, index) => (
            <p
              key={item.n}
              className={`flex gap-6 px-5 py-5 ${index < dict.funds.items.length - 1 ? "border-b border-border" : ""}`}
            >
              <small className="mono-label w-8 text-primary">{item.n}</small>
              <span>
                <strong className="block">{item.title}</strong>
                {item.note ? (
                  <em className="mt-1 block text-sm text-muted-foreground not-italic">{item.note}</em>
                ) : null}
              </span>
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Addons() {
  const { dict } = useLanguage();
  return (
    <section id="addons" className="py-16 md:py-24">
      <div className="shell">
        <p className="mono-label text-primary">{dict.addons.kicker}</p>
        <h2 className="mt-3 max-w-[18ch] text-[clamp(32px,8vw,56px)] font-semibold tracking-[-0.05em]">
          <AnimatedLetters text={dict.addons.title} />
        </h2>
        <div className="mt-8 grid gap-3 lg:grid-cols-3">
          <article className="rounded-2xl border border-border bg-card p-6">
            <span className="mono-label">{dict.addons.merchLabel}</span>
            <h3 className="mt-3 text-2xl font-medium tracking-tight">{dict.addons.merchTitle}</h3>
            <div className="mt-5 flex gap-8">
              <strong className="text-2xl">
                $80<small className="ml-2 font-mono text-[10px] text-muted-foreground">{dict.addons.merchHalf}</small>
              </strong>
              <strong className="text-2xl">
                $150<small className="ml-2 font-mono text-[10px] text-muted-foreground">{dict.addons.merchFull}</small>
              </strong>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{dict.addons.merchBody}</p>
          </article>
          <article className="rounded-2xl border border-border bg-card p-6">
            <span className="mono-label">{dict.addons.walkLabel}</span>
            <h3 className="mt-3 text-2xl font-medium tracking-tight">{dict.addons.walkTitle}</h3>
            <strong className="mt-5 block text-2xl">$250</strong>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{dict.addons.walkBody}</p>
          </article>
          <article className="rounded-2xl border border-border bg-card p-6">
            <span className="mono-label">{dict.addons.videoLabel}</span>
            <h3 className="mt-3 text-2xl font-medium tracking-tight">{dict.addons.videoTitle}</h3>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{dict.addons.videoBody}</p>
            <a
              href={`${SITE.xUrl}`}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex min-h-10 items-center rounded-full bg-foreground px-4 font-mono text-[10px] font-semibold tracking-[0.1em] text-background"
            >
              {dict.addons.videoCta}
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  const { dict } = useLanguage();
  const { data, openClaim } = useInventory();
  const first = data?.positions.find((p) => p.status === "available");
  return (
    <section className="shell pb-28 pt-8 text-center md:pb-24 md:pt-12">
      <p className="mono-label text-primary">{dict.cta.kicker}</p>
      <h2 className="mx-auto mt-4 max-w-[16ch] text-[clamp(36px,9vw,64px)] font-semibold tracking-[-0.05em]">
        <AnimatedLetters text={dict.cta.title} />
      </h2>
      <p className="mt-4 text-muted-foreground">{dict.cta.body}</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => openClaim(first?.id ?? 1)}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-foreground px-6 font-mono text-[11px] font-semibold tracking-[0.1em] text-background"
        >
          {dict.cta.claim}
        </button>
        <a
          href={SITE.xUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-card px-6 font-mono text-[11px] font-semibold tracking-[0.1em]"
        >
          {dict.cta.custom}
        </a>
      </div>
    </section>
  );
}

export function Footer() {
  const { dict } = useLanguage();
  return (
    <footer className="shell flex flex-wrap items-center justify-between gap-4 border-t border-border py-8 pb-28 font-mono text-[11px] text-muted-foreground md:pb-8">
      <span className="inline-flex items-center gap-2 tracking-[0.14em] text-foreground">
        <span className="inline-flex h-6 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <BrandLogo className="h-4 w-4" />
        </span>
        {SITE.name}
      </span>
      <nav className="flex gap-5">
        <a href={SITE.xUrl} target="_blank" rel="noreferrer">
          X
        </a>
        <a href={SITE.linkedinUrl} target="_blank" rel="noreferrer">
          LinkedIn
        </a>
        <a href={`mailto:${SITE.email}`}>Email</a>
        <a href={SITE.telegramUrl} target="_blank" rel="noreferrer">
          Telegram
        </a>
        <a href={SITE.whatsappUrl} target="_blank" rel="noreferrer">
          WhatsApp
        </a>
        <a href="/admin">Admin</a>
      </nav>
      <span>{dict.footer.trip}</span>
    </footer>
  );
}
