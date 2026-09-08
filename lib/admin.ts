import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "cbiux_admin";

function secret() {
  return process.env.ADMIN_PASSWORD || "123Cbiux@#$";
}

export function adminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function signAdminToken() {
  return createHmac("sha256", secret()).update("cbiux-admin-session").digest("hex");
}

export function passwordMatches(password: string) {
  const expected = Buffer.from(secret());
  const received = Buffer.from(password);
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

export async function isAdminRequest() {
  const jar = await cookies();
  const value = jar.get(COOKIE)?.value;
  if (!value) return false;
  const expected = Buffer.from(signAdminToken());
  const received = Buffer.from(value);
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

function cookieExtras() {
  return process.env.VERCEL === "1" ? "; Secure" : "";
}

export function adminSessionCookie(token: string) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 12}${cookieExtras()}`;
}

export function clearAdminSessionCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${cookieExtras()}`;
}

export { COOKIE as ADMIN_COOKIE };
