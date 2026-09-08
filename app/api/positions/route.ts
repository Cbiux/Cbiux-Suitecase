import { getInventory } from "@/lib/store";
import type { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") === "en" ? "en" : "es";
  const inventory = await getInventory(locale as Locale);
  return Response.json(inventory);
}
