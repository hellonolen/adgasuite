import { errorJson, json, readJson } from "@/lib/server/http";
import { createEvent } from "@/lib/server/repository";
import { newId, nowIso } from "@/lib/server/id";
import { getRuntimeContext, requireAdmin } from "@/lib/server/runtime";

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  requireAdmin(context);
  if (!context.env.DB) return json({ ok: true, affiliates: [] });

  try {
    const result = await context.env.DB.prepare(
      "SELECT * FROM affiliates WHERE organization_id = ? ORDER BY created_at DESC LIMIT 250",
    ).bind("org_adga_primary").all();
    return json({ ok: true, affiliates: result.results || [] });
  } catch {
    return json({ ok: true, affiliates: [] });
  }
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  requireAdmin(context);
  const body = await readJson<{ name?: string; email?: string; referral_code?: string; commission_rate_bps?: number }>(request);

  if (!body.name || !body.email) return errorJson("name and email are required.");

  const timestamp = nowIso();
  const referralCode = (body.referral_code || body.name.replace(/[^a-z0-9]/gi, "").slice(0, 10) + Math.random().toString(36).slice(2, 6)).toUpperCase();
  const affiliate = {
    id: newId("aff"),
    organization_id: "org_adga_primary",
    name: body.name,
    email: body.email,
    referral_code: referralCode,
    referral_url: `https://adga.ai/?ref=${encodeURIComponent(referralCode)}`,
    status: "pending",
    commission_rate_bps: Math.max(0, Number(body.commission_rate_bps || 1000)),
    created_at: timestamp,
    updated_at: timestamp,
  };

  if (context.env.DB) try {
    await context.env.DB.prepare(
      `INSERT INTO affiliates
        (id, organization_id, name, email, referral_code, referral_url, status, commission_rate_bps, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(affiliate.id, affiliate.organization_id, affiliate.name, affiliate.email, affiliate.referral_code, affiliate.referral_url, affiliate.status, affiliate.commission_rate_bps, affiliate.created_at, affiliate.updated_at)
      .run();
  } catch {}

  await createEvent(context.env.DB, {
    organization_id: affiliate.organization_id,
    event_type: "affiliate.created",
    actor_type: "user",
    actor_id: context.user.email,
    resource_type: "affiliate",
    resource_id: affiliate.id,
    payload: { affiliate },
  });

  return json({ ok: true, affiliate });
}
