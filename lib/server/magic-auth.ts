export const AUTH_COOKIE_NAME = "adga_session";
export const MAGIC_TOKEN_TTL_MINUTES = 15;
export const SESSION_TTL_DAYS = 30;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function randomToken(bytes = 32) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return bytesToBase64Url(values);
}

export async function sha256(value: string) {
  const input = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return bytesToBase64Url(new Uint8Array(digest));
}

export function isoMinutesFromNow(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

export function isoDaysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: true,
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  };
}
