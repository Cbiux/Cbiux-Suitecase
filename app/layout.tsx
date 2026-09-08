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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:43147"),
  title: "Poné tu marca en mi ruta a Europa e India | Cbiux",
  description:
    "22 posiciones en la maleta de cabina de Sebastián (Cbiux), 55×40×20 cm, rumbo a Compile Amsterdam, Europa y Devcon India. Vlog diario de todo el trip. Desde $45.",
  openGraph: {
    title: "Put your brand on my road to Europe & India",
    description: "22 spots on a carry-on cabin bag (55×40×20 cm) from $45. Daily vlog for the whole Costa Rica → Compile → Devcon route.",
    images: [{ url: "/og.png", width: 1200, height: 675 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Put your brand on my road to Europe & India",
    description: "22 carry-on cabin spots from $45. Daily vlog for the whole route. SINPE or USDC.",
    images: ["/og.png"],
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
