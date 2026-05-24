import { NextResponse } from "next/server";
import { provisionUserSession } from "@/lib/server/auth-provision";
import { getRuntimeContext } from "@/lib/server/runtime";
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  safeAuthRedirect,
  transientAuthCookieOptions,
} from "@/lib/server/magic-auth";

const GOOGLE_OAUTH_COOKIE = "adga_google_oauth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

interface GoogleCookieState {
  state?: string;
  verifier?: string;
  next?: string;
}

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
}

interface GoogleUserInfo {
  email?: string;
  email_verified?: boolean;
  name?: string;
}

function redirectUri(request: Request) {
  return new URL("/api/auth/google/callback", request.url).toString();
}

function loginRedirect(request: Request, error: string, next = "/suite") {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", error);
  loginUrl.searchParams.set("next", safeAuthRedirect(next));
  return NextResponse.redirect(loginUrl);
}

function readStateCookie(request: Request): GoogleCookieState | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const target = `${GOOGLE_OAUTH_COOKIE}=`;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(target)) continue;
    try {
      return JSON.parse(decodeURIComponent(trimmed.slice(target.length))) as GoogleCookieState;
    } catch {
      return null;
    }
  }
  return null;
}

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  const clientId = context.env.GOOGLE_CLIENT_ID;
  const clientSecret = context.env.GOOGLE_CLIENT_SECRET;
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const stored = readStateCookie(request);
  const next = safeAuthRedirect(stored?.next);

  if (!clientId || !clientSecret) return loginRedirect(request, "google_not_configured", next);
  if (!context.env.DB) return loginRedirect(request, "auth_storage_missing", next);
  if (!code || !state || !stored?.state || !stored.verifier || state !== stored.state) {
    return loginRedirect(request, "google_state_invalid", next);
  }

  const tokenBody = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    code_verifier: stored.verifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri(request),
  });

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody,
  });
  const token = (await tokenResponse.json().catch(() => ({}))) as GoogleTokenResponse;
  if (!tokenResponse.ok || !token.access_token) return loginRedirect(request, "google_token_failed", next);

  const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const userInfo = (await userInfoResponse.json().catch(() => ({}))) as GoogleUserInfo;
  if (!userInfoResponse.ok || !userInfo.email || userInfo.email_verified === false) {
    return loginRedirect(request, "google_email_unverified", next);
  }

  const session = await provisionUserSession(context.env.DB, {
    email: userInfo.email,
    name: userInfo.name,
  });

  const response = NextResponse.redirect(new URL(next, request.url));
  response.cookies.set(AUTH_COOKIE_NAME, session.sessionToken, authCookieOptions(request.url));
  response.cookies.set(GOOGLE_OAUTH_COOKIE, "", { ...transientAuthCookieOptions(request.url, 0), maxAge: 0 });
  return response;
}
