import { isAdminRequest } from "@/lib/admin";
import { restoreFromNeon } from "@/lib/persist";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  if (!(await isAdminRequest())) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const result = await restoreFromNeon();
  const status = result.restored ? 200 : result.reason === "NEON_QUOTA" ? 402 : 400;
  return Response.json(result, { status });
}
