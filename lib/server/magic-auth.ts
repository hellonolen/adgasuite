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

export async function codeChallenge(verifier: string) {
  return sha256(verifier);
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
    sameSite: "strict" as const,
    secure: true,
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  };
}

export function authCookieOptions(requestUrl?: string) {
  const secure = requestUrl ? new URL(requestUrl).protocol === "https:" : true;
  const base = cookieOptions();
  return { httpOnly: base.httpOnly, sameSite: base.sameSite, path: base.path, maxAge: base.maxAge, secure };
}

export function transientAuthCookieOptions(requestUrl: string, maxAge = 600) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: new URL(requestUrl).protocol === "https:",
    path: "/",
    maxAge,
  };
}

export function safeAuthRedirect(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/suite";
  return value;
}

export function userIdForEmail(email: string) {
  return `usr_${email.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase()}`;
}

export interface SessionUser {
  user_id: string;
  email: string;
  organization_id: string | null;
  role: "owner" | "admin" | "member";
}

export function readSessionCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const target = `${AUTH_COOKIE_NAME}=`;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(target)) {
      const value = trimmed.slice(target.length);
      return value ? decodeURIComponent(value) : null;
    }
  }
  return null;
}

export async function validateSession(db: D1Database | undefined, cookieValue: string | null): Promise<SessionUser | null> {
  if (!db || !cookieValue) return null;
  const hash = await sha256(cookieValue);
  const row = await db
    .prepare(
      `SELECT s.user_id, s.organization_id, s.expires_at, u.email, u.role
       FROM sessions s
       INNER JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`
    )
    .bind(hash)
    .first<{ user_id: string; organization_id: string | null; expires_at: string; email: string; role: string }>();
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  const role = row.role === "owner" || row.role === "admin" ? row.role : "member";
  return {
    user_id: row.user_id,
    email: row.email,
    organization_id: row.organization_id,
    role,
  };
}
