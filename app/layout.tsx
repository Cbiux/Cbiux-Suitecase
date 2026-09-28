import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { BagPhotoWarmup } from "@/components/bag-photo-warmup";
import { ThemeProvider } from "@/components/theme-provider";
import { pickLocale } from "@/lib/site-content";
import { getSiteContent } from "@/lib/store";
import "./globals.css";

const THEME_BOOTSTRAP = `(function(){try{var s=localStorage.getItem("cbiux-theme");var d=s==="dark"||(s!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://cbiux-suitcase.vercel.app";
  try {
    const site = await getSiteContent();
    const title = pickLocale("es", site.meta.title);
    const description = pickLocale("es", site.meta.description);
    const ogTitle = [
      pickLocale("es", site.hero.titleA),
      pickLocale("es", site.hero.titleB),
      pickLocale("es", site.hero.titleAccent),
    ]
      .filter(Boolean)
      .join(" ");
    return {
      metadataBase: new URL(origin),
      title,
      description,
      openGraph: {
        title: ogTitle || title,
        description,
        type: "website",
        locale: "es_CR",
        siteName: "cbiux",
      },
      icons: {
        icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
      },
      twitter: {
        card: "summary_large_image",
        title: ogTitle || title,
        description,
        creator: "@Cbiux_04",
      },
    };
  } catch {
    return {
      metadataBase: new URL(origin),
      title: "Poné tu marca en mi ruta a Europa e India | Cbiux",
      description:
        "34 posiciones en la maleta de cabina de Sebastián (Cbiux), 55×40×20 cm. Vlog diario de todo el trip. Desde $45.",
    };
  }
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${jetbrains.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        <link rel="preload" as="image" href="/suitcase-front.png" type="image/png" fetchPriority="high" />
        <link rel="preload" as="image" href="/suitcase-side.png" type="image/png" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <BagPhotoWarmup />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
