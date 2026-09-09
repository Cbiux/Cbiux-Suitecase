import { comprobanteFromForm } from "@/lib/comprobante";
import { getWallets, getPaymentVerifyMode } from "@/lib/config";
import { detectNetwork, paymentDestination, verifyOnChain } from "@/lib/payments";
import { verifyPayment } from "@/lib/store";
import { getCatalogById } from "@/lib/positions";
import type { PaymentNetwork } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function readPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const network = String(form.get("network") ?? "").trim() as PaymentNetwork | "";
    return {
      positionId: Number(form.get("positionId")),
      recoveryToken: String(form.get("recoveryToken") ?? "").trim(),
      txHash: String(form.get("txHash") ?? "").trim(),
      network: network || undefined,
      logo: String(form.get("logo") ?? "").trim(),
      comprobante: await comprobanteFromForm(form),
    };
  }

  const body = (await request.json()) as {
    positionId?: number;
    recoveryToken?: string;
    txHash?: string;
    network?: PaymentNetwork;
    logo?: string;
    comprobante?: string;
  };
  return {
    positionId: Number(body.positionId),
    recoveryToken: body.recoveryToken?.trim() ?? "",
    txHash: body.txHash?.trim() ?? "",
    network: body.network,
    logo: body.logo?.trim() ?? "",
    comprobante: body.comprobante?.trim() ?? "",
  };
}

export async function POST(request: Request) {
  try {
    const payload = await readPayload(request);
    const catalog = getCatalogById(payload.positionId);
    if (!catalog || !payload.recoveryToken || !payload.txHash) {
      return Response.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }

    const network = payload.network || detectNetwork(payload.txHash);
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
      txHash: payload.txHash,
      network,
      amountUsd: catalog.price,
      recipient: paymentDestination(network, wallets),
    });
    if (!chain.ok) {
      return Response.json({ error: chain.reason }, { status: 400 });
    }

    const result = await verifyPayment({
      positionId: payload.positionId,
      recoveryToken: payload.recoveryToken,
      txHash: payload.txHash,
      network,
      mode: getPaymentVerifyMode(),
      logo: payload.logo,
      comprobante: payload.comprobante,
    });
    return Response.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "VERIFY_FAILED";
    const status = code === "SOLD" || code === "TX_REUSED" ? 409 : 400;
    return Response.json({ error: code }, { status });
  }
}
