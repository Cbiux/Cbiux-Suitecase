import { getSiteContent } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ siteContent: await getSiteContent() });
}
