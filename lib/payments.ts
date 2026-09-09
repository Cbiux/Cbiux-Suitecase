import { getPaymentVerifyMode } from "./config";
import type { PaymentNetwork } from "./types";

const SOLANA_HASH = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;
const EVM_HASH = /^0x[a-fA-F0-9]{64}$/;
const STELLAR_HASH = /^[a-fA-F0-9]{64}$/;

export function detectNetwork(txHash: string): PaymentNetwork | null {
  const value = txHash.trim();
  if (EVM_HASH.test(value)) return "evm";
  if (STELLAR_HASH.test(value)) return "stellar";
  if (SOLANA_HASH.test(value)) return "solana";
  return null;
}

export function validateTxHash(txHash: string, network: PaymentNetwork) {
  const value = txHash.trim();
  if (network === "sinpe") return value.length > 0 && value.length <= 120;
  if (network === "evm") return EVM_HASH.test(value);
  if (network === "stellar") return STELLAR_HASH.test(value);
  return SOLANA_HASH.test(value);
}

/**
 * Payment verification.
 *
 * SINPE is always manual (admin marks sold).
 *
 * TODO for on-chain:
 * - EVM / Base: Alchemy / Basescan, USDC 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
 *   to == NEXT_PUBLIC_USDC_BASE_ADDRESS, value >= price * 1e6.
 * - Stellar: Horizon, USDC issuer, destination ==
 *   NEXT_PUBLIC_USDC_STELLAR_ADDRESS.
 * - Solana (optional): only if NEXT_PUBLIC_USDC_SOLANA_ADDRESS is set.
 */
export async function verifyOnChain(input: {
  txHash: string;
  network: PaymentNetwork;
  amountUsd: number;
  recipient: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (input.network === "sinpe") {
    return { ok: false, reason: "SINPE_MANUAL" };
  }

  if (!validateTxHash(input.txHash, input.network)) {
    return { ok: false, reason: "INVALID_HASH" };
  }

  if (getPaymentVerifyMode() === "stub") {
    return { ok: true };
  }

  return {
    ok: false,
    reason: "INDEXER_NOT_CONFIGURED",
  };
}

export function paymentMemo(positionId: number) {
  return `CBIUX-${String(positionId).padStart(2, "0")}`;
}

export function paymentDestination(
  network: PaymentNetwork,
  wallets: { sinpe: string; evm: string; stellar: string; solana: string },
) {
  if (network === "sinpe") return wallets.sinpe;
  if (network === "stellar") return wallets.stellar;
  if (network === "solana") return wallets.solana;
  return wallets.evm;
}
