import { Resend } from "resend";
import { SITE } from "./config";
import { spotFilename } from "./spot-poster";
import { thanksEmailCopy } from "./thanks-mail-copy";
import { thanksFilename } from "./thanks-poster";

const PNG_MAX_BYTES = 4 * 1024 * 1024;

export function thanksMailStatus() {
  const from = process.env.MAIL_FROM?.trim() ?? "";
  return {
    configured: Boolean(process.env.RESEND_API_KEY?.trim() && from),
    from,
    replyTo: SITE.email,
    hasBcc: Boolean(process.env.MAIL_BCC?.trim()),
  };
}

export async function sendThanksEmail(input: {
  to: string;
  sponsor: string;
  positionId: number;
  thanksPng: Buffer;
  spotPng: Buffer;
}) {
  const status = thanksMailStatus();
  if (!status.configured) throw new Error("MAIL_NOT_CONFIGURED");
  if (input.thanksPng.length > PNG_MAX_BYTES || input.spotPng.length > PNG_MAX_BYTES) {
    throw new Error("IMAGE_TOO_LARGE");
  }
  const copy = thanksEmailCopy(input.sponsor, input.positionId);
  const resend = new Resend(process.env.RESEND_API_KEY);
  const bcc = process.env.MAIL_BCC?.trim();
  const { data, error } = await resend.emails.send({
    from: status.from,
    to: input.to,
    replyTo: SITE.email,
    ...(bcc ? { bcc } : {}),
    subject: copy.subject,
    html: copy.html,
    text: copy.text,
    attachments: [
      {
        filename: thanksFilename(copy.brand, input.positionId),
        content: input.thanksPng,
        contentId: "cbiux-thanks",
      },
      {
        filename: spotFilename(copy.brand, input.positionId),
        content: input.spotPng,
        contentId: "cbiux-spot",
      },
    ],
  });
  if (error) throw new Error(error.message || "MAIL_SEND_FAILED");
  return data;
}
