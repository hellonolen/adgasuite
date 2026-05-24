import { sha256 } from "@/lib/server/magic-auth";

export const FIVE_SECRETS_ACCESS_COOKIE = "adga_five_secrets_access";
export const FIVE_SECRETS_MAGIC_TTL_MINUTES = 30;
export const FIVE_SECRETS_ACCESS_TTL_DAYS = 30;

type TokenPurpose = "five-secrets-magic" | "five-secrets-access";

interface FiveSecretsTokenPayload {
  email: string;
  exp: number;
  purpose: TokenPurpose;
}

function secret(env: CloudflareEnv = {}) {
  return env.SESSION_SECRET || process.env.SESSION_SECRET || "adga-five-secrets-local-dev";
}

function encodePayload(payload: FiveSecretsTokenPayload) {
  return btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodePayload(value: string): FiveSecretsTokenPayload | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const parsed = JSON.parse(atob(padded)) as FiveSecretsTokenPayload;
    if (!parsed.email || !parsed.exp || !parsed.purpose) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function sign(payloadPart: string, env: CloudflareEnv = {}) {
  return sha256(`${payloadPart}.${secret(env)}`);
}

async function createToken(email: string, purpose: TokenPurpose, ttlMs: number, env: CloudflareEnv = {}) {
  const payloadPart = encodePayload({
    email,
    purpose,
    exp: Date.now() + ttlMs,
  });
  const signature = await sign(payloadPart, env);
  return `${payloadPart}.${signature}`;
}

export async function createFiveSecretsMagicToken(email: string, env: CloudflareEnv = {}) {
  return createToken(email, "five-secrets-magic", FIVE_SECRETS_MAGIC_TTL_MINUTES * 60 * 1000, env);
}

export async function createFiveSecretsAccessToken(email: string, env: CloudflareEnv = {}) {
  return createToken(email, "five-secrets-access", FIVE_SECRETS_ACCESS_TTL_DAYS * 24 * 60 * 60 * 1000, env);
}

export async function validateFiveSecretsToken(
  token: string | undefined | null,
  purpose: TokenPurpose,
  env: CloudflareEnv = {}
) {
  if (!token) return null;
  const [payloadPart, signature] = token.split(".");
  if (!payloadPart || !signature) return null;
  const expected = await sign(payloadPart, env);
  if (signature !== expected) return null;
  const payload = decodePayload(payloadPart);
  if (!payload || payload.purpose !== purpose || payload.exp < Date.now()) return null;
  return payload.email;
}

export function fiveSecretsAccessCookieOptions(requestUrl: string) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: new URL(requestUrl).protocol === "https:",
    path: "/5-secrets",
    maxAge: FIVE_SECRETS_ACCESS_TTL_DAYS * 24 * 60 * 60,
  };
}
