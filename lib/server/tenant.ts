import type { SessionUser } from "@/lib/server/magic-auth";

export const DEFAULT_ORG_ID = "org_adga_primary";
export const OWNER_EMAIL = "hellonolen@gmail.com";

const PERSONAL_EMAIL_DOMAINS = new Set(["gmail.com", "icloud.com", "outlook.com", "hotmail.com", "yahoo.com"]);

export function orgIdForEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized === OWNER_EMAIL) return DEFAULT_ORG_ID;
  const [local, domain = ""] = normalized.split("@");
  const source = domain && !PERSONAL_EMAIL_DOMAINS.has(domain)
    ? domain.replace(/\.[^.]+$/, "")
    : local;
  return `org_${source.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase()}`;
}

export function orgSlugForEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized === OWNER_EMAIL) return "adga-primary";
  const [local, domain = "workspace"] = normalized.split("@");
  const base = PERSONAL_EMAIL_DOMAINS.has(domain)
    ? local
    : domain.replace(/\.[^.]+$/, "");
  return base.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "workspace";
}

export function orgNameForEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized === OWNER_EMAIL) return "ADGA";
  const domain = normalized.split("@")[1] || "";
  const source = domain && !PERSONAL_EMAIL_DOMAINS.has(domain)
    ? domain.replace(/\.[^.]+$/, "")
    : normalized.split("@")[0];
  return source
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Workspace";
}

export function organizationIdForSession(sessionUser: SessionUser | null, fallback = DEFAULT_ORG_ID) {
  return sessionUser?.organization_id || fallback;
}
