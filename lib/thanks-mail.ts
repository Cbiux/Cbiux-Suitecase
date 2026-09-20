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
    testingFrom: /@resend\.dev\b/i.test(from),
  };
}

export function classifyMailError(message: string) {
  const text = message.toLowerCase();
  if (text.includes("only send testing emails") || text.includes("verify a domain")) {
    return "MAIL_TESTING_DOMAIN";
  }
  if (text.includes("invalid api key") || text.includes("missing api key")) {
    return "MAIL_NOT_CONFIGURED";
  }
  return "MAIL_SEND_FAILED";
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
  const bcc = status.testingFrom ? "" : process.env.MAIL_BCC?.trim();
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
        content: input.thanksPng.toString("base64"),
        contentId: "cbiux-thanks",
      },
      {
        filename: spotFilename(copy.brand, input.positionId),
        content: input.spotPng.toString("base64"),
        contentId: "cbiux-spot",
      },
    ],
  });
  if (error) {
    const message = error.message || "MAIL_SEND_FAILED";
    console.error("[thanks-mail] resend failed", message);
    throw new Error(classifyMailError(message));
  }
  return data;
}
