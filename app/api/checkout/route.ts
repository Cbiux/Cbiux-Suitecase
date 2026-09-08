import { startCheckout } from "@/lib/store";
import { paymentMemo } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      positionId?: number;
      brandName?: string;
      email?: string;
    };
    const positionId = Number(body.positionId);
    const brandName = body.brandName?.trim() ?? "";
    if (!positionId || !brandName) {
      return Response.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }
    const order = await startCheckout({
      positionId,
      brandName,
      email: body.email,
    });
    return Response.json({
      ...order,
      memo: paymentMemo(positionId),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "CHECKOUT_FAILED";
    const status = code === "SOLD" || code === "RESERVED" ? 409 : 400;
    return Response.json({ error: code }, { status });
  }
}
