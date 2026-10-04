import { isAdminRequest } from "@/lib/admin";
import { searchCities } from "@/lib/geocode";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAdminRequest())) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const q = new URL(request.url).searchParams.get("q") ?? "";
  try {
    const results = await searchCities(q);
    return Response.json({ results });
  } catch {
    return Response.json({ error: "GEOCODE_FAILED" }, { status: 400 });
  }
}
