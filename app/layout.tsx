import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://cbiux-suitecase.vercel.app"),
  title: "Poné tu marca en mi ruta a Europa e India | Cbiux",
  description:
    "22 posiciones en la maleta de cabina de Sebastián (Cbiux), 55×40×20 cm, rumbo a Compile Amsterdam, Europa y Devcon India. Vlog diario de todo el trip. Desde $45.",
  openGraph: {
    title: "Tu marca, en mi ruta a Europa e India",
    description: "22 spots en una maleta de cabina (55×40×20 cm) desde $45. Vlog diario Costa Rica → Compile → Devcon.",
    type: "website",
    locale: "es_CR",
    siteName: "cbiux",
  },
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tu marca, en mi ruta a Europa e India",
    description: "22 spots de cabina desde $45. Vlog diario de todo el trip. SINPE o USDC.",
    creator: "@Cbiux_04",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${jetbrains.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
