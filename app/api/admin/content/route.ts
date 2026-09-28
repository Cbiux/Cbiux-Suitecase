import { isAdminRequest } from "@/lib/admin";
import { adminUpdateSiteContent } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  try {
    const body = (await request.json()) as { reset?: boolean; content?: unknown };
    const siteContent = await adminUpdateSiteContent(body.content, { reset: Boolean(body.reset) });
    return Response.json({ siteContent });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UPDATE_FAILED";
    return Response.json({ error: code }, { status: 400 });
  }
}
