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

const ADMIN_EMAILS = ["hellonolen@gmail.com", "kamarokyle5@gmail.com"];

function envFromProcess(): CloudflareEnv {
  return {
    ADGA_AI_MODEL: process.env.ADGA_AI_MODEL,
    ADGA_ADMIN_EMAIL: process.env.ADGA_ADMIN_EMAIL,
    ADGA_ADMIN_EMAILS: process.env.ADGA_ADMIN_EMAILS,
    ADGA_LOCAL_ADMIN_BYPASS: process.env.ADGA_LOCAL_ADMIN_BYPASS,
    POSTMARK_SERVER_TOKEN: process.env.POSTMARK_SERVER_TOKEN,
    POSTMARK_FROM_EMAIL: process.env.POSTMARK_FROM_EMAIL,
    WHOP_API_KEY: process.env.WHOP_API_KEY,
    WHOP_WEBHOOK_SECRET: process.env.WHOP_WEBHOOK_SECRET,
    WHOP_COMPANY_ID: process.env.WHOP_COMPANY_ID,
    WHOP_REDIRECT_URL: process.env.WHOP_REDIRECT_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
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

  const requestedEmail = request?.headers.get("x-adga-admin-email")?.toLowerCase();
  const localBypass =
    process.env.NODE_ENV !== "production" ||
    env.ADGA_LOCAL_ADMIN_BYPASS === "true";
  const email = requestedEmail && adminEmails.includes(requestedEmail)
    ? requestedEmail
    : adminEmails[0];

  return {
    env,
    user: {
      email,
      role: email === "hellonolen@gmail.com" ? "owner" : "admin",
      isLocalAdminBypass: localBypass,
    },
  };
}

export function requireAdmin(context: RuntimeContext) {
  if (context.user.role !== "owner" && context.user.role !== "admin") {
    throw new Response("Forbidden", { status: 403 });
  }
}
