import { NextResponse } from "next/server";
import { getRuntimeContext } from "@/lib/server/runtime";
import { codeChallenge, randomToken, safeAuthRedirect, transientAuthCookieOptions } from "@/lib/server/magic-auth";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OAUTH_COOKIE = "adga_google_oauth";

function redirectUri(request: Request) {
  return new URL("/api/auth/google/callback", request.url).toString();
}

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  const clientId = context.env.GOOGLE_CLIENT_ID;
  const clientSecret = context.env.GOOGLE_CLIENT_SECRET;
  const requestUrl = new URL(request.url);
  const next = safeAuthRedirect(requestUrl.searchParams.get("next") || requestUrl.searchParams.get("redirect"));

  if (!clientId || !clientSecret) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "google_not_configured");
    loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl);
  }

  const state = randomToken(24);
  const verifier = randomToken(48);
  const challenge = await codeChallenge(verifier);
  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri(request));
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(
    GOOGLE_OAUTH_COOKIE,
    encodeURIComponent(JSON.stringify({ state, verifier, next })),
    transientAuthCookieOptions(request.url),
  );
  return response;
}
