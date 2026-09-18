import { STORY_CAPTION, STORY_SLIDES } from "@/lib/story-carousel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Carrusel Instagram · cbiux",
  robots: { index: false, follow: false },
};

export default function StoryCarouselPage() {
  return (
    <main className="shell py-10">
      <p className="mono-label text-primary">instagram · 4:5</p>
      <h1 className="mt-3 max-w-[16ch] text-[clamp(32px,7vw,52px)] font-semibold tracking-[-0.05em]">
        Carrusel de tu historia
      </h1>
      <p className="mt-4 max-w-[62ch] text-muted-foreground">
        Siete láminas 1080×1350: estudiante de CR, Compile / HackMeridian / Devcon, y pedir ayuda para abrir esa
        puerta a más estudiantes. Descargalas en orden, subí el álbum y pegá el texto abajo.
      </p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {STORY_SLIDES.map((slide) => (
          <article key={slide.id} className="overflow-hidden rounded-3xl border border-border bg-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/story-carousel/${slide.id}`} alt={slide.label} className="block h-auto w-full" />
            <div className="flex items-center justify-between gap-3 p-4">
              <p className="font-mono text-[11px] font-semibold tracking-[0.08em]">{slide.label}</p>
              <a
                href={`/api/story-carousel/${slide.id}`}
                download={slide.file}
                className="rounded-full bg-foreground px-3 py-2 font-mono text-[10px] font-semibold tracking-[0.08em] text-background"
              >
                Descargar
              </a>
            </div>
          </article>
        ))}
      </div>
      <section className="mt-10 rounded-3xl border border-border bg-card p-5">
        <p className="mono-label text-primary">texto del post</p>
        <pre className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{STORY_CAPTION}</pre>
      </section>
    </main>
  );
}
