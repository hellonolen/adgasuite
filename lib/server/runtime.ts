import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface RequestUser {
  email: string;
  role: "owner" | "admin" | "member";
  isLocalAdminBypass: boolean;
}

export interface RuntimeContext {
  env: CloudflareEnv;
  user: RequestUser;
}

const ADMIN_EMAILS = ["hellonolen@gmail.com", "kamarokyle5@gmail.com", "tracyhogan76@gmail.com"];

function envFromProcess(): CloudflareEnv {
  return {
    ADGA_AI_MODEL: process.env.ADGA_AI_MODEL,
    ADGA_ADMIN_EMAIL: process.env.ADGA_ADMIN_EMAIL,
    ADGA_ADMIN_EMAILS: process.env.ADGA_ADMIN_EMAILS,
    ADGA_LOCAL_ADMIN_BYPASS: process.env.ADGA_LOCAL_ADMIN_BYPASS,
    ADP_REFERRAL_TO_EMAIL: process.env.ADP_REFERRAL_TO_EMAIL,
    CLOUDFLARE_EMAIL_FROM: process.env.CLOUDFLARE_EMAIL_FROM,
    POSTMARK_SERVER_TOKEN: process.env.POSTMARK_SERVER_TOKEN,
    POSTMARK_FROM_EMAIL: process.env.POSTMARK_FROM_EMAIL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY,
    STRIPE_PRICE_PRO_ANNUAL: process.env.STRIPE_PRICE_PRO_ANNUAL,
    STRIPE_PRICE_TEAM_BASE_MONTHLY: process.env.STRIPE_PRICE_TEAM_BASE_MONTHLY,
    STRIPE_PRICE_TEAM_BASE_ANNUAL: process.env.STRIPE_PRICE_TEAM_BASE_ANNUAL,
    STRIPE_PRICE_TEAM_SEAT_MONTHLY: process.env.STRIPE_PRICE_TEAM_SEAT_MONTHLY,
    STRIPE_PRICE_TEAM_SEAT_ANNUAL: process.env.STRIPE_PRICE_TEAM_SEAT_ANNUAL,
    STRIPE_PRICE_ENTERPRISE_BASE_MONTHLY: process.env.STRIPE_PRICE_ENTERPRISE_BASE_MONTHLY,
    STRIPE_PRICE_ENTERPRISE_BASE_ANNUAL: process.env.STRIPE_PRICE_ENTERPRISE_BASE_ANNUAL,
    STRIPE_PRICE_ENTERPRISE_SEAT_MONTHLY: process.env.STRIPE_PRICE_ENTERPRISE_SEAT_MONTHLY,
    STRIPE_PRICE_ENTERPRISE_SEAT_ANNUAL: process.env.STRIPE_PRICE_ENTERPRISE_SEAT_ANNUAL,
    SMS_GATEWAY_URL: process.env.SMS_GATEWAY_URL,
    SMS_GATEWAY_API_KEY: process.env.SMS_GATEWAY_API_KEY,
    SMS_GATEWAY_PROVIDER: process.env.SMS_GATEWAY_PROVIDER,
    WHOP_API_KEY: process.env.WHOP_API_KEY,
    WHOP_WEBHOOK_SECRET: process.env.WHOP_WEBHOOK_SECRET,
    WHOP_COMPANY_ID: process.env.WHOP_COMPANY_ID,
    WHOP_REDIRECT_URL: process.env.WHOP_REDIRECT_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
    GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    ADGA_PUBLIC_HOST: process.env.ADGA_PUBLIC_HOST,
    ADGA_ENCRYPTION_KEY: process.env.ADGA_ENCRYPTION_KEY,
  };
}

export function getRuntimeContext(request?: Request): RuntimeContext {
  let env = envFromProcess();

  try {
    env = { ...env, ...getCloudflareContext().env };
  } catch {
    // next dev does not always expose Cloudflare bindings. Local fallback keeps
    // the app usable without leaking into production behavior.
  }

  const adminEmails = (env.ADGA_ADMIN_EMAILS || ADMIN_EMAILS.join(","))
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const hostname = request ? new URL(request.url).hostname : "";
  const isLocalhost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1";
  const localBypass =
    process.env.NODE_ENV !== "production" &&
    (isLocalhost || env.ADGA_LOCAL_ADMIN_BYPASS !== "false");

  // SECURITY: the x-adga-admin-email header is only honored when local bypass
  // is active. In production every authenticated request must validate against
  // the sessions table (see validateSession in lib/server/magic-auth).
  const requestedEmail = localBypass
    ? request?.headers.get("x-adga-admin-email")?.toLowerCase() ?? null
    : null;

  const email = localBypass
    ? requestedEmail && adminEmails.includes(requestedEmail)
      ? requestedEmail
      : adminEmails[0]
    : "";

  return {
    env,
    user: {
      email,
      role: localBypass
        ? email === "hellonolen@gmail.com"
          ? "owner"
          : "admin"
        : "member",
      isLocalAdminBypass: localBypass,
    },
  };
}

/**
 * Hydrate `context.user` from the session cookie when local-admin-bypass isn't
 * active. Without this, every production request lands with context.user.email
 * = "" and requireUser / requireAdmin reject everything. Call from the route
 * before requireUser / requireAdmin.
 */
export async function hydrateUserFromSession(
  context: RuntimeContext,
  request: Request,
): Promise<void> {
  if (context.user.isLocalAdminBypass && context.user.email) return;
  const { readSessionCookie, validateSession } = await import("@/lib/server/magic-auth");
  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));
  if (!sessionUser) return;
  const role: "owner" | "admin" | "member" =
    sessionUser.role === "owner" || sessionUser.role === "admin" ? sessionUser.role : "member";
  context.user = {
    email: sessionUser.email,
    role,
    isLocalAdminBypass: false,
  };
}

export function requireAdmin(context: RuntimeContext) {
  if (context.user.role !== "owner" && context.user.role !== "admin") {
    throw new Response("Forbidden", { status: 403 });
  }
}

export function requireUser(context: RuntimeContext) {
  if (!context.user.email) {
    throw new Response("Unauthorized", { status: 401 });
  }
}
