import { getWallets, getPaymentVerifyMode } from "@/lib/config";
import { detectNetwork, paymentDestination, verifyOnChain } from "@/lib/payments";
import { verifyPayment } from "@/lib/store";
import { getCatalogById } from "@/lib/positions";
import type { PaymentNetwork } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      positionId?: number;
      recoveryToken?: string;
      txHash?: string;
      network?: PaymentNetwork;
    };
    const positionId = Number(body.positionId);
    const recoveryToken = body.recoveryToken?.trim() ?? "";
    const txHash = body.txHash?.trim() ?? "";
    const catalog = getCatalogById(positionId);
    if (!catalog || !recoveryToken || !txHash) {
      return Response.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }

    const network = body.network || detectNetwork(txHash);
    if (!network || network === "sinpe") {
      return Response.json(
        { error: network === "sinpe" ? "SINPE_MANUAL" : "INVALID_HASH" },
        { status: 400 },
      );
    }

    const wallets = getWallets();
    if (network === "solana" && !wallets.solana) {
      return Response.json({ error: "SOLANA_DISABLED" }, { status: 400 });
    }

    const chain = await verifyOnChain({
      txHash,
      network,
      amountUsd: catalog.price,
      recipient: paymentDestination(network, wallets),
    });
    if (!chain.ok) {
      return Response.json({ error: chain.reason }, { status: 400 });
    }

    const result = await verifyPayment({
      positionId,
      recoveryToken,
      txHash,
      network,
      mode: getPaymentVerifyMode(),
    });
    return Response.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "VERIFY_FAILED";
    const status = code === "SOLD" || code === "TX_REUSED" ? 409 : 400;
    return Response.json({ error: code }, { status });
  }
}
