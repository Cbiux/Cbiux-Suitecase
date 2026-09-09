import { comprobanteFromForm } from "@/lib/comprobante";
import { submitSinpe } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function readPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    return {
      positionId: Number(form.get("positionId")),
      recoveryToken: String(form.get("recoveryToken") ?? "").trim(),
      reference: String(form.get("reference") ?? ""),
      comprobante: await comprobanteFromForm(form),
      logo: String(form.get("logo") ?? "").trim(),
    };
  }

  const body = (await request.json()) as {
    positionId?: number;
    recoveryToken?: string;
    reference?: string;
    comprobante?: string;
    logo?: string;
  };
  return {
    positionId: Number(body.positionId),
    recoveryToken: body.recoveryToken?.trim() ?? "",
    reference: body.reference,
    comprobante: body.comprobante?.trim() ?? "",
    logo: body.logo?.trim() ?? "",
  };
}

export async function POST(request: Request) {
  try {
    const payload = await readPayload(request);
    if (!payload.positionId || !payload.recoveryToken) {
      return Response.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }
    if (!payload.comprobante) {
      return Response.json({ error: "MISSING_COMPROBANTE" }, { status: 400 });
    }
    const result = await submitSinpe(payload);
    return Response.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "SINPE_FAILED";
    const status = code === "SOLD" || code === "RESERVED" ? 409 : 400;
    return Response.json({ error: code }, { status });
  }
}
