import { isAdminRequest } from "@/lib/admin";
import { isValidEmail } from "@/lib/email";
import { adminList, markThanksEmailSent } from "@/lib/store";
import { sendThanksEmail, thanksMailStatus } from "@/lib/thanks-mail";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PNG_MAX_BYTES = 4 * 1024 * 1024;

export async function GET() {
  if (!(await isAdminRequest())) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  return Response.json(thanksMailStatus());
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const status = thanksMailStatus();
  if (!status.configured) {
    return Response.json({ error: "MAIL_NOT_CONFIGURED" }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const positionId = Number(form.get("positionId"));
  const thanksFile = form.get("thanks");
  const spotFile = form.get("spot");
  if (!positionId || !(thanksFile instanceof File) || !(spotFile instanceof File)) {
    return Response.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }
  if (thanksFile.size > PNG_MAX_BYTES || spotFile.size > PNG_MAX_BYTES) {
    return Response.json({ error: "IMAGE_TOO_LARGE" }, { status: 400 });
  }

  const data = await adminList();
  const spot = data.positions.find((item) => item.id === positionId);
  if (!spot) return Response.json({ error: "UNKNOWN_POSITION" }, { status: 400 });
  if (spot.status === "available") {
    return Response.json({ error: "SPOT_AVAILABLE" }, { status: 400 });
  }
  if (!spot.email || !isValidEmail(spot.email)) {
    return Response.json({ error: "MISSING_EMAIL" }, { status: 400 });
  }
  if (!spot.logo) {
    return Response.json({ error: "NO_LOGO" }, { status: 400 });
  }

  const thanksPng = Buffer.from(await thanksFile.arrayBuffer());
  const spotPng = Buffer.from(await spotFile.arrayBuffer());

  try {
    await sendThanksEmail({
      to: spot.email,
      sponsor: spot.sponsor || spot.name,
      positionId: spot.id,
      thanksPng,
      spotPng,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MAIL_SEND_FAILED";
    const code =
      message === "MAIL_NOT_CONFIGURED" || message === "IMAGE_TOO_LARGE"
        ? message
        : "MAIL_SEND_FAILED";
    return Response.json({ error: code, detail: message }, { status: 400 });
  }

  const sentAt = await markThanksEmailSent(spot.id);
  return Response.json({ ok: true, sentAt, email: spot.email, positionId: spot.id });
}
