import { errorJson, json } from "@/lib/server/http";
import { createEvent } from "@/lib/server/repository";
import { newId, nowIso } from "@/lib/server/id";
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
  created_at: string;
  updated_at: string;
}

const DEFAULT_ORG_ID = "org_adga_primary";
const DEFAULT_COMMISSION_RATE_BPS = 2000; // 20% default

function buildReferralCode(email: string) {
  const slug = email.split("@")[0]?.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "user";
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${slug}${suffix}`.toUpperCase();
}

// Self-enrollment for any signed-in user. Idempotent: returns existing record on retry.
export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  const db = context.env.DB;

  const sessionToken = readSessionCookie(request);
  const sessionUser = await validateSession(db, sessionToken);

  const email = sessionUser?.email || (context.user.isLocalAdminBypass ? context.user.email : "");
  if (!email) return errorJson("Unauthorized.", 401);

  if (!db) {
    // Stub response when D1 is not bound — keeps the UI testable in pure-Next dev.
    const referralCode = buildReferralCode(email);
    return json({
      ok: true,
      affiliate: {
        id: newId("aff"),
        organization_id: DEFAULT_ORG_ID,
        name: email,
        email,
        referral_code: referralCode,
        referral_url: `https://adga.ai/?ref=${encodeURIComponent(referralCode)}`,
        status: "active",
        commission_rate_bps: DEFAULT_COMMISSION_RATE_BPS,
        clicks: 0,
        leads: 0,
        signups: 0,
        paid_accounts: 0,
        revenue_cents: 0,
        commission_owed_cents: 0,
        payout_status: "not_due",
        created_at: nowIso(),
        updated_at: nowIso(),
      },
      stub: true,
    });
  }

  const normalizedEmail = email.toLowerCase();

  try {
    const existing = await db
      .prepare("SELECT * FROM affiliates WHERE email = ? LIMIT 1")
      .bind(normalizedEmail)
      .first<AffiliateRow>();

    if (existing) {
      return json({ ok: true, affiliate: existing, existed: true });
    }
  } catch {
    // Continue to insert path.
  }

  const timestamp = nowIso();
  const referralCode = buildReferralCode(email);
  const affiliate: AffiliateRow = {
    id: newId("aff"),
    organization_id: sessionUser?.organization_id || DEFAULT_ORG_ID,
    name: email.split("@")[0] || email,
    email: normalizedEmail,
    referral_code: referralCode,
    referral_url: `https://adga.ai/?ref=${encodeURIComponent(referralCode)}`,
    status: "active",
    commission_rate_bps: DEFAULT_COMMISSION_RATE_BPS,
    clicks: 0,
    leads: 0,
    signups: 0,
    paid_accounts: 0,
    revenue_cents: 0,
    commission_owed_cents: 0,
    payout_status: "not_due",
    created_at: timestamp,
    updated_at: timestamp,
  };

  try {
    await db
      .prepare(
        `INSERT INTO affiliates
          (id, organization_id, name, email, referral_code, referral_url, status, commission_rate_bps, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        affiliate.id,
        affiliate.organization_id,
        affiliate.name,
        affiliate.email,
        affiliate.referral_code,
        affiliate.referral_url,
        affiliate.status,
        affiliate.commission_rate_bps,
        affiliate.created_at,
        affiliate.updated_at,
      )
      .run();
  } catch (error) {
    return errorJson("Could not create affiliate record.", 500, { error: String(error) });
  }

  await createEvent(db, {
    organization_id: affiliate.organization_id,
    event_type: "affiliate.self_enrolled",
    actor_type: "user",
    actor_id: email,
    resource_type: "affiliate",
    resource_id: affiliate.id,
    payload: { referral_code: affiliate.referral_code },
  });

  return json({ ok: true, affiliate, existed: false });
}
