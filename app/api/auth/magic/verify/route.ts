import { NextResponse } from "next/server";
import { errorJson, readJson } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import {
  AUTH_COOKIE_NAME,
  cookieOptions,
  isoDaysFromNow,
  normalizeEmail,
  randomToken,
  sha256,
} from "@/lib/server/magic-auth";
import { orgIdForEmail, orgNameForEmail, orgSlugForEmail, OWNER_EMAIL } from "@/lib/server/tenant";

interface VerifyBody {
  token?: string;
}

function userIdForEmail(email: string) {
  return `usr_${email.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase()}`;
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  const body = await readJson<VerifyBody>(request);
  const token = body.token || "";

  if (!token) return errorJson("Missing sign-in token.", 400);
  if (!context.env.DB) return errorJson("Authentication storage is not configured.", 503);

  const tokenHash = await sha256(token);
  const row = await context.env.DB.prepare(
    "SELECT * FROM magic_tokens WHERE token_hash = ? AND used_at IS NULL"
  ).bind(tokenHash).first<{ email: string; plan: string | null; redirect_path: string; expires_at: string }>();

  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    return errorJson("This sign-in link is invalid or expired.", 401);
  }

  const email = normalizeEmail(row.email);
  const userId = userIdForEmail(email);
  const organizationId = orgIdForEmail(email);
  const organizationName = orgNameForEmail(email);
  const organizationSlug = orgSlugForEmail(email);
  const role = email === OWNER_EMAIL ? "owner" : "owner";
  const now = new Date().toISOString();
  const sessionToken = randomToken();
  const sessionHash = await sha256(sessionToken);
  const sessionId = crypto.randomUUID();

  await context.env.DB.prepare(
    `INSERT OR IGNORE INTO organizations (id, name, slug, plan, subscription_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(organizationId, organizationName, organizationSlug, row.plan || "team", "trialing", now, now).run();

  await context.env.DB.prepare(
    `INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(userId, email, email.split("@")[0], role, now, now).run();

  await context.env.DB.prepare(
    `INSERT OR IGNORE INTO organization_members (organization_id, user_id, role, created_at)
     VALUES (?, ?, ?, ?)`
  ).bind(organizationId, userId, role, now).run();

  await context.env.DB.prepare(
    `INSERT INTO sessions (id, user_id, organization_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(sessionId, userId, organizationId, sessionHash, isoDaysFromNow(30), now).run();

  await context.env.DB.prepare(
    "UPDATE magic_tokens SET used_at = datetime('now') WHERE token_hash = ?"
  ).bind(tokenHash).run();

  const response = NextResponse.json({ ok: true, redirect: row.redirect_path || "/suite" });
  response.cookies.set(AUTH_COOKIE_NAME, sessionToken, cookieOptions());
  return response;
}
