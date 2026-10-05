import { ReelStudio } from "@/components/reel-studio";
import { getInventory } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reel de la maleta · cbiux",
  robots: { index: false, follow: false },
};

export default async function ReelPage() {
  const inventory = await getInventory("es");
  return (
    <main className="shell py-10">
      <p className="mono-label text-primary">video · partners</p>
      <h1 className="mt-3 max-w-[16ch] text-[clamp(32px,7vw,52px)] font-semibold tracking-[-0.05em]">
        Video de la maleta
      </h1>
      <p className="mt-4 max-w-[62ch] text-muted-foreground">
        Un reel de ~18 s con las cuatro caras, los logos reales y un cierre con QR. Elegí el formato, generá y
        subilo a Instagram, TikTok o LinkedIn. El preview ya corre con lo que está publicado.
      </p>
      <div className="mt-8">
        <ReelStudio positions={inventory.positions} />
      </div>
    </main>
  );
}
