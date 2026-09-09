import { ClaimSheet } from "@/components/claim-sheet";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { InventoryProvider } from "@/components/inventory-provider";
import { LanguageProvider } from "@/components/language-provider";
import { CurrencyProvider } from "@/components/currency-provider";
import { OfferForm } from "@/components/offer-form";
import { PositionsBoard } from "@/components/positions-board";
import { ShareSupport } from "@/components/share-support";
import { StickyCta } from "@/components/sticky-cta";
import {
  Addons,
  DailyVlog,
  FinalCta,
  Footer,
  Funds,
  HowItWorks,
  WhatYouGet,
} from "@/components/site-sections";
import { getInventory } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const inventory = await getInventory("es");

  return (
    <LanguageProvider>
      <CurrencyProvider>
        <InventoryProvider initial={inventory}>
        <Header />
        <main id="main" className="pb-24 md:pb-0">
          <Hero />
          <PositionsBoard />
          <ShareSupport />
          <OfferForm />
          <WhatYouGet />
          <DailyVlog />
          <HowItWorks />
          <Funds />
          <Addons />
          <FinalCta />
        </main>
        <Footer />
        <StickyCta />
        <ClaimSheet />
      </InventoryProvider>
      </CurrencyProvider>
    </LanguageProvider>
  );
}
