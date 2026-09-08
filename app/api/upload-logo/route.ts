import { ARTWORK_MAX_BYTES } from "@/lib/config";
import { parseArtworkDataUrl } from "@/lib/artwork";
import { publishLogo } from "@/lib/store";

export const dynamic = "force-dynamic";

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
    const artwork = parseArtworkDataUrl(dataUrl);
    const approxBytes = Math.ceil((artwork.length * 3) / 4);
    if (approxBytes > ARTWORK_MAX_BYTES + 64_000) {
      return Response.json({ error: "TOO_LARGE" }, { status: 400 });
    }
    const result = await publishLogo({ positionId, recoveryToken, dataUrl: artwork });
    return Response.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "UPLOAD_FAILED";
    return Response.json({ error: code }, { status: 400 });
  }
}
