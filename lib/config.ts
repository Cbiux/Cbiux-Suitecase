export const SITE = {
  name: "cbiux",
  creator: "Sebastián Ceciliano Piedra",
  handle: "Cbiux",
  x: "Cbiux_04",
  xUrl: "https://x.com/Cbiux_04",
  linkedinUrl: "https://www.linkedin.com/in/cbiux",
  email: "jsebascp04@gmail.com",
  telegram: "cbiux",
  telegramUrl: "https://t.me/cbiux",
} as const;

export const PAYMENT_DEFAULTS = {
  sinpePhone: "84358038",
  evm: "0xC38555a1Afcd8394532Caa11D0be60Df166eC188",
  stellar: "GAS52QOWKVBW2WYDRQ3KS4CSJ2QQNALPGURK2HLGJSNE2XUH7BH555BS",
} as const;

export function getWallets() {
  const solana = process.env.NEXT_PUBLIC_USDC_SOLANA_ADDRESS?.trim() || "";
  const evm =
    process.env.NEXT_PUBLIC_USDC_BASE_ADDRESS?.trim() || PAYMENT_DEFAULTS.evm;
  const stellar =
    process.env.NEXT_PUBLIC_USDC_STELLAR_ADDRESS?.trim() || PAYMENT_DEFAULTS.stellar;
  const sinpe =
    process.env.NEXT_PUBLIC_SINPE_PHONE?.trim() || PAYMENT_DEFAULTS.sinpePhone;

  return {
    sinpe,
    evm,
    base: evm,
    stellar,
    solana,
    isDemo: false,
  };
}

export function getPaymentVerifyMode(): "stub" | "indexer" {
  return process.env.PAYMENT_VERIFY_MODE === "indexer" ? "indexer" : "stub";
}

export function getHelioPayUrl() {
  return process.env.NEXT_PUBLIC_HELIO_PAY_URL?.trim() || "";
}

export const RESERVATION_MINUTES = 60;
export const SINPE_HOLD_HOURS = 48;
export const ARTWORK_MAX_BYTES = 2 * 1024 * 1024;
export const ARTWORK_ACCEPT =
  "image/png,image/webp,image/svg+xml,image/jpeg,.png,.webp,.svg,.jpg,.jpeg";
