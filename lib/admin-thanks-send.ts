import { thanksBrand } from "./poster-kit";
import { renderSpotPng, spotFilename } from "./spot-poster";
import { renderThanksPng, thanksFilename } from "./thanks-poster";

export async function sendThanksMailForSpot(input: {
  positionId: number;
  sponsor: string;
  fallbackName: string;
  logo: string;
}) {
  const logoSrc = await resolveAdminLogo(input.positionId, input.logo);
  try {
    if (!logoSrc) throw new Error("NO_LOGO");
    const brand = thanksBrand(input.sponsor, input.fallbackName);
    const name = input.sponsor || input.fallbackName;
    const [thanks, spot] = await Promise.all([
      renderThanksPng({ brand, positionId: input.positionId, logoSrc }),
      renderSpotPng({ brand, positionId: input.positionId, logoSrc }),
    ]);
    const body = new FormData();
    body.set("positionId", String(input.positionId));
    body.set("thanks", thanks, thanksFilename(name, input.positionId));
    body.set("spot", spot, spotFilename(name, input.positionId));
    const response = await fetch("/api/admin/thanks-mail", {
      method: "POST",
      body,
      credentials: "same-origin",
    });
    const json = (await response.json().catch(() => ({}))) as {
      error?: string;
      sentAt?: string;
      email?: string;
    };
    if (!response.ok) throw new Error(json.error || "MAIL_SEND_FAILED");
    return json;
  } finally {
    if (logoSrc.startsWith("blob:")) URL.revokeObjectURL(logoSrc);
  }
}

async function resolveAdminLogo(positionId: number, fallback: string) {
  try {
    const response = await fetch(`/api/admin/artwork/${positionId}`, {
      credentials: "same-origin",
    });
    if (!response.ok) return fallback;
    return URL.createObjectURL(await response.blob());
  } catch {
    return fallback;
  }
}
