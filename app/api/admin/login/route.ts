import { adminConfigured, adminSessionCookie, passwordMatches, signAdminToken } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { password?: string };
  if (!passwordMatches(body.password ?? "")) {
    return Response.json({ error: "BAD_PASSWORD" }, { status: 401 });
  }
  const response = Response.json({
    ok: true,
    demo: !adminConfigured(),
  });
  response.headers.set("Set-Cookie", adminSessionCookie(signAdminToken()));
  return response;
}
