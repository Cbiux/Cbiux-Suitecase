import { startCheckout } from "@/lib/store";
import { paymentMemo } from "@/lib/payments";
import { phoneLooksValid } from "@/lib/phone";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      positionId?: number;
      brandName?: string;
      email?: string;
      phone?: string;
      logo?: string;
    };
    const positionId = Number(body.positionId);
    const brandName = body.brandName?.trim() ?? "";
    const phone = body.phone?.trim() ?? "";
    const logo = body.logo?.trim() ?? "";
    if (!positionId || !brandName) {
      return Response.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }
    if (!phoneLooksValid(phone)) {
      return Response.json({ error: "MISSING_PHONE" }, { status: 400 });
    }
    if (!logo) {
      return Response.json({ error: "MISSING_ARTWORK" }, { status: 400 });
    }
    const order = await startCheckout({
      positionId,
      brandName,
      email: body.email,
      phone,
      logo,
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
