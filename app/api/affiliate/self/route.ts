import { errorJson, json } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";

interface AffiliateRow {
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
  risk_flags_json: string;
  created_at: string;
  updated_at: string;
}

interface AffiliateEventRow {
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

// Returns the current signed-in user's affiliate profile, recent events, and payout history.
// Returns { ok: true, affiliate: null } if the user has not enrolled yet.
export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  const db = context.env.DB;

  if (!db) {
    return json({ ok: true, affiliate: null, events: [], payouts: [], reason: "no-db" });
  }

  const sessionToken = readSessionCookie(request);
  const sessionUser = await validateSession(db, sessionToken);

  const email = sessionUser?.email || (context.user.isLocalAdminBypass ? context.user.email : "");
  if (!email) return errorJson("Unauthorized.", 401);

  try {
    const affiliate = await db
      .prepare("SELECT * FROM affiliates WHERE email = ? LIMIT 1")
      .bind(email.toLowerCase())
      .first<AffiliateRow>();

    if (!affiliate) {
      return json({ ok: true, affiliate: null, events: [], payouts: [] });
    }

    const eventsResult = await db
      .prepare(
        "SELECT * FROM affiliate_events WHERE affiliate_id = ? ORDER BY created_at DESC LIMIT 50",
      )
      .bind(affiliate.id)
      .all<AffiliateEventRow>();

    const events = eventsResult.results || [];
    const payouts = events.filter((event) => event.event_type === "payout.paid" || event.event_type === "payout.scheduled");

    return json({ ok: true, affiliate, events, payouts });
  } catch (error) {
    return json({ ok: true, affiliate: null, events: [], payouts: [], reason: "query-failed", error: String(error) });
  }
}
