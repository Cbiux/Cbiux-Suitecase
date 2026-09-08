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
      logo?: string;
      release?: boolean;
    };
    const positionId = Number(body.positionId);
    if (!positionId) {
      return Response.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }
    const spot = await adminUpdateSpot({
      positionId,
      status: body.status,
      sponsor: body.sponsor,
      logo: body.logo,
      release: body.release,
    });
    return Response.json({ spot });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UPDATE_FAILED";
    return Response.json({ error: code }, { status: 400 });
  }
}
