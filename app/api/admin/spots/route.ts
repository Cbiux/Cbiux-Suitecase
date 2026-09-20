import { isAdminRequest } from "@/lib/admin";
import { adminList, adminUpdateSpot } from "@/lib/store";
import type { SpotStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminRequest())) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  return Response.json(await adminList());
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      positionId?: number;
      status?: SpotStatus;
      sponsor?: string;
      email?: string;
      phone?: string;
      logo?: string;
      release?: boolean;
      thanksEmailSentAt?: string;
      receivedAmount?: number | string;
      receivedMethod?: string;
      receivedCurrency?: string;
      receivedInKindItems?: string;
    };
    const positionId = Number(body.positionId);
    if (!positionId) {
      return Response.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }
    const spot = await adminUpdateSpot({
      positionId,
      status: body.status,
      sponsor: body.sponsor,
      email: body.email,
      phone: body.phone,
      logo: body.logo,
      release: body.release,
      thanksEmailSentAt: body.thanksEmailSentAt,
      receivedAmount: body.receivedAmount,
      receivedMethod: body.receivedMethod,
      receivedCurrency: body.receivedCurrency,
      receivedInKindItems: body.receivedInKindItems,
    });
    return Response.json({ spot });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UPDATE_FAILED";
    return Response.json({ error: code }, { status: 400 });
  }
}
