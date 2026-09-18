"use client";

export default function Error({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="shell flex min-h-[70vh] flex-col items-start justify-center py-16">
      <p className="mono-label text-primary">error de servidor</p>
      <h1 className="mt-3 max-w-[16ch] text-[clamp(32px,7vw,52px)] font-semibold tracking-[-0.05em]">
        La página no pudo cargar
      </h1>
      <p className="mt-4 max-w-[46ch] text-muted-foreground">
        Recargá en unos segundos. Si sigue fallando, el inventario no está llegando desde la base.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-8 rounded-full bg-foreground px-5 py-3 font-mono text-[11px] font-semibold tracking-[0.08em] text-background"
      >
        Reintentar
      </button>
    </main>
  );
}
