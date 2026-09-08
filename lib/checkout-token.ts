import { createHmac, timingSafeEqual } from "crypto";
import { RESERVATION_MINUTES } from "./config";

export type CheckoutGrant = {
  positionId: number;
  brand: string;
  email: string;
  exp: number;
};

function secret() {
  return process.env.CHECKOUT_SECRET || process.env.ADMIN_PASSWORD || "cbiux-checkout-dev";
}

export function issueCheckoutGrant(input: {
  positionId: number;
  brand: string;
  email: string;
  hours?: number;
}) {
  const minutes = input.hours ? input.hours * 60 : RESERVATION_MINUTES;
  const payload: CheckoutGrant = {
    positionId: input.positionId,
    brand: input.brand.trim(),
    email: input.email.trim(),
    exp: Date.now() + minutes * 60_000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readCheckoutGrant(token: string): CheckoutGrant | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const grant = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as CheckoutGrant;
    if (!grant.positionId || !grant.brand || !grant.exp) return null;
    if (grant.exp <= Date.now()) return null;
    return grant;
  } catch {
    return null;
  }
}
