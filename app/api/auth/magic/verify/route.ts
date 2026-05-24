import { NextResponse } from "next/server";
import { errorJson, readJson } from "@/lib/server/http";
import { provisionUserSession } from "@/lib/server/auth-provision";
import { getRuntimeContext } from "@/lib/server/runtime";
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  normalizeEmail,
  sha256,
} from "@/lib/server/magic-auth";

interface VerifyBody {
  token?: string;
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
  const session = await provisionUserSession(context.env.DB, { email, plan: row.plan });

  await context.env.DB.prepare(
    "UPDATE magic_tokens SET used_at = datetime('now') WHERE token_hash = ?"
  ).bind(tokenHash).run();

  const response = NextResponse.json({ ok: true, redirect: row.redirect_path || "/suite" });
  response.cookies.set(AUTH_COOKIE_NAME, session.sessionToken, authCookieOptions(request.url));
  return response;
}
