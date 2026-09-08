import { ARTWORK_MAX_BYTES } from "@/lib/config";
import { publishLogo } from "@/lib/store";

export const dynamic = "force-dynamic";

const ALLOWED = /^data:image\/(png|webp);base64,/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      positionId?: number;
      recoveryToken?: string;
      dataUrl?: string;
    };
    const positionId = Number(body.positionId);
    const recoveryToken = body.recoveryToken?.trim() ?? "";
    const dataUrl = body.dataUrl ?? "";
    if (!positionId || !recoveryToken || !dataUrl) {
      return Response.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }
    if (!ALLOWED.test(dataUrl)) {
      return Response.json({ error: "BAD_IMAGE" }, { status: 400 });
    }
    const approxBytes = Math.ceil((dataUrl.length * 3) / 4);
    if (approxBytes > ARTWORK_MAX_BYTES) {
      return Response.json({ error: "TOO_LARGE" }, { status: 400 });
    }
    const result = await publishLogo({ positionId, recoveryToken, dataUrl });
    return Response.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "UPLOAD_FAILED";
    return Response.json({ error: code }, { status: 400 });
  }
}
