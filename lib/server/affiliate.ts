import { redirect } from "next/navigation";
import { getRuntimeContext } from "@/lib/server/runtime";
import { validateSession } from "@/lib/server/magic-auth";

export interface AffiliateRow {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  referral_code: string;
  referral_url: string;
  status: string;
  commission_rate_bps: number;
  clicks: number;
  leads: number;
  signups: number;
  paid_accounts: number;
  revenue_cents: number;
  commission_owed_cents: number;
  payout_status: string;
  created_at: string;
  updated_at: string;
}

export interface AffiliateEventRow {
  id: string;
  affiliate_id: string | null;
  referral_code: string | null;
  event_type: string;
  customer_email: string | null;
  source: string | null;
  campaign: string | null;
  amount_cents: number;
  metadata_json: string;
  created_at: string;
}

export interface AffiliateContext {
  email: string;
  affiliate: AffiliateRow | null;
  db: D1Database | null;
  hasDb: boolean;
}

// Loads the current signed-in user's session + affiliate row.
// Redirects to /login on missing session (server-side). Never throws.
export async function loadAffiliateContext(returnTo: string): Promise<AffiliateContext> {
  const context = getRuntimeContext(new Request("http://localhost/"));
  const db = context.env.DB ?? null;

  let email = "";

  if (db) {
    const cookieToken = await readCookieFromHeaders();
    const sessionUser = await validateSession(db, cookieToken);
    if (sessionUser) {
      email = sessionUser.email;
    } else if (context.user.isLocalAdminBypass && context.user.email) {
      email = context.user.email;
    } else {
      redirect(`/login?redirect=${encodeURIComponent(returnTo)}`);
    }
  } else {
    // No D1 binding (pure-Next local dev). Fall back to bypass email so the UI is testable.
    if (!context.user.email) {
      redirect(`/login?redirect=${encodeURIComponent(returnTo)}`);
    }
    email = context.user.email;
  }

  let affiliate: AffiliateRow | null = null;
  if (db) {
    try {
      affiliate = await db
        .prepare("SELECT * FROM affiliates WHERE email = ? LIMIT 1")
        .bind(email.toLowerCase())
        .first<AffiliateRow>();
    } catch {
      affiliate = null;
    }
  }

  return { email, affiliate, db, hasDb: Boolean(db) };
}

// Cookie read in the server context — uses next/headers to access the request.
async function readCookieFromHeaders(): Promise<string | null> {
  try {
    const { cookies } = await import("next/headers");
    const store = await cookies();
    return store.get("adga_session")?.value ?? null;
  } catch {
    return null;
  }
}

export function formatUsdFromCents(cents: number | null | undefined) {
  const value = Number(cents || 0) / 100;
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export function commissionRatePercent(bps: number | null | undefined) {
  return `${((Number(bps || 0)) / 100).toFixed(0)}%`;
}
