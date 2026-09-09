import { isAdminRequest } from "@/lib/admin";
import { artworkFileMeta, decodeArtwork } from "@/lib/logo-file";
import { adminList } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminRequest())) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const positionId = Number((await context.params).id);
  if (!positionId) {
    return Response.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }
  const kind = new URL(request.url).searchParams.get("kind") === "comprobante" ? "comprobante" : "logo";
  const data = await adminList();
  const spot = data.positions.find((item) => item.id === positionId);
  const src = kind === "comprobante" ? spot?.comprobante : spot?.logo;
  if (!spot || !src) {
    return Response.json({ error: "NO_LOGO" }, { status: 404 });
  }
  if (/^https?:\/\//i.test(src)) {
    return Response.redirect(src, 302);
  }
  const decoded = decodeArtwork(src);
  if (!decoded?.buffer.length) {
    return Response.json({ error: "BAD_IMAGE" }, { status: 400 });
  }
  const { filename, mime } = artworkFileMeta(src, spot.sponsor, spot.id, kind);
  return new Response(new Uint8Array(decoded.buffer), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
