/**
 * Google OAuth helpers for inbox-sync (Gmail v1).
 *
 * IMPORTANT — separate OAuth client from sign-in:
 *   - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET → sign-in only (lib/server/magic-auth via /api/auth/google)
 *   - GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET → Gmail/Calendar inbox sync (this module)
 *
 * Keeping them split means rotating an inbox-sync client does NOT log every
 * user out of the product.
 *
 * SECURITY: this module NEVER logs tokens, codes, or refresh tokens. Failures
 * surface as opaque error strings the caller can render. The handler decides
 * whether to persist a failure reason — it should redact before doing so.
 */

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export const GMAIL_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export interface OAuthBuildAuthUrlInput {
  state: string;
  redirect_uri: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string | null;
  expires_in: number;
  token_type: string;
  scope?: string;
  id_token?: string;
}

export interface OAuthExchangeInput {
  code: string;
  redirect_uri: string;
}

export interface OAuthRefreshInput {
  refresh_token: string;
}

function readClientCredentials(env: CloudflareEnv): { client_id: string; client_secret: string } {
  const client_id = env.GOOGLE_OAUTH_CLIENT_ID;
  const client_secret = env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!client_id || !client_secret) {
    throw new Error("oauth_not_configured");
  }
  return { client_id, client_secret };
}

export function buildAuthUrl(env: CloudflareEnv, input: OAuthBuildAuthUrlInput): string {
  const { client_id } = readClientCredentials(env);
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", client_id);
  url.searchParams.set("redirect_uri", input.redirect_uri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GMAIL_OAUTH_SCOPES);
  url.searchParams.set("access_type", "offline");           // forces refresh_token issuance
  url.searchParams.set("prompt", "consent");                 // ensures refresh_token returned even on re-auth
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", input.state);
  return url.toString();
}

export async function exchangeCode(
  env: CloudflareEnv,
  input: OAuthExchangeInput,
): Promise<OAuthTokenResponse> {
  const { client_id, client_secret } = readClientCredentials(env);
  const body = new URLSearchParams({
    code: input.code,
    client_id,
    client_secret,
    redirect_uri: input.redirect_uri,
    grant_type: "authorization_code",
  });
  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!resp.ok) {
    // intentionally do not include resp.text() so error details don't leak
    throw new Error(`oauth_exchange_failed_${resp.status}`);
  }
  return (await resp.json()) as OAuthTokenResponse;
}

export async function refreshToken(
  env: CloudflareEnv,
  input: OAuthRefreshInput,
): Promise<OAuthTokenResponse> {
  const { client_id, client_secret } = readClientCredentials(env);
  const body = new URLSearchParams({
    refresh_token: input.refresh_token,
    client_id,
    client_secret,
    grant_type: "refresh_token",
  });
  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!resp.ok) {
    throw new Error(`oauth_refresh_failed_${resp.status}`);
  }
  return (await resp.json()) as OAuthTokenResponse;
}

/**
 * Derives the canonical redirect URI for inbox-sync OAuth. Reads from
 * `ADGA_PUBLIC_HOST` env if available, otherwise falls back to adgasuite.com.
 *
 * The request URL is honored when localhost-bypass is active so dev flows
 * land back on the dev server.
 */
export function inboxSyncRedirectUri(env: CloudflareEnv, requestUrl?: string): string {
  if (requestUrl) {
    try {
      const url = new URL(requestUrl);
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
        return `${url.protocol}//${url.host}/api/inbox-sync/callback`;
      }
    } catch {
      // fall through
    }
  }
  const host = env.ADGA_PUBLIC_HOST || "adgasuite.com";
  return `https://${host}/api/inbox-sync/callback`;
}

/**
 * Fetches the authenticated user's email from Google's userinfo endpoint.
 * Used after `exchangeCode` to learn which mailbox the operator just granted.
 */
export async function fetchUserinfoEmail(accessToken: string): Promise<string | null> {
  const resp = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) return null;
  const data = (await resp.json()) as { email?: string };
  return data.email ? data.email.toLowerCase() : null;
}
