import { isAdminRequest } from "@/lib/admin";
import { adminUpdateOffer } from "@/lib/store";
import type { OfferStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  try {
    const body = (await request.json()) as { id?: string; status?: OfferStatus };
    if (!body.id || (body.status !== "accepted" && body.status !== "declined")) {
      return Response.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }
    const offer = await adminUpdateOffer({ id: body.id, status: body.status });
    return Response.json({ offer });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UPDATE_FAILED";
    return Response.json({ error: code }, { status: 400 });
  }
}
