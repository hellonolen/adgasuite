import { json } from "@/lib/server/http";
import { createEvent } from "@/lib/server/repository";
import { getRuntimeContext } from "@/lib/server/runtime";
import { verifyWhopWebhook } from "@/lib/integrations/whop";
import { newId, nowIso } from "@/lib/server/id";
import { orgIdForEmail } from "@/lib/server/tenant";

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  const rawBody = await request.text();
  const signature = request.headers.get("x-whop-signature") || "";
  const verified = await verifyWhopWebhook({
    secret: context.env.WHOP_WEBHOOK_SECRET,
    signature,
    rawBody,
  });

  if (!verified.ok) return json({ ok: false, error: verified.reason }, { status: 401 });

  const payload = JSON.parse(rawBody || "{}") as Record<string, unknown>;
  const email = extractEmail(payload);
  const organizationId = email ? orgIdForEmail(email) : "org_adga_primary";
  const subscriptionStatus = normalizeStatus(payload);
  const plan = extractPlan(payload);

  if (context.env.DB) {
    const now = nowIso();
    await context.env.DB
      .prepare(
        `INSERT OR IGNORE INTO organizations (id, name, slug, plan, subscription_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        organizationId,
        email ? email.split("@")[0] : "ADGA",
        organizationId.replace(/^org_/, "").replace(/_/g, "-") || "adga-primary",
        plan,
        subscriptionStatus,
        now,
        now,
      )
      .run();

    await context.env.DB
      .prepare(
        `INSERT INTO subscriptions
          (id, organization_id, provider, provider_customer_id, provider_subscription_id, status, plan, current_period_end, created_at, updated_at)
         VALUES (?, ?, 'whop', ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           status = excluded.status,
           plan = excluded.plan,
           current_period_end = excluded.current_period_end,
           updated_at = excluded.updated_at`,
      )
      .bind(
        subscriptionId(payload),
        organizationId,
        stringFrom(payload, ["customer_id", "customerId", "user_id", "userId"]),
        stringFrom(payload, ["subscription_id", "subscriptionId", "membership_id", "membershipId", "id"]),
        subscriptionStatus,
        plan,
        stringFrom(payload, ["current_period_end", "renewal_period_end", "expires_at"]),
        now,
        now,
      )
      .run();

    await context.env.DB
      .prepare("UPDATE organizations SET plan = ?, subscription_status = ?, updated_at = ? WHERE id = ?")
      .bind(plan, subscriptionStatus, now, organizationId)
      .run();
  }

  const event = await createEvent(context.env.DB, {
    organization_id: organizationId,
    event_type: `whop.${String(payload.type || "event")}`,
    actor_type: "webhook",
    actor_id: "whop",
    resource_type: "subscription",
    resource_id: String(payload.id || ""),
    payload,
  });

  return json({ ok: true, event_id: event.id });
}

function subscriptionId(payload: Record<string, unknown>) {
  const id = stringFrom(payload, ["subscription_id", "subscriptionId", "membership_id", "membershipId", "id"]);
  return id ? `whop_${id}` : newId("sub");
}

function extractEmail(payload: Record<string, unknown>) {
  return (
    stringFrom(payload, ["email", "customer_email", "user_email"]) ||
    stringFrom(nested(payload, "metadata"), ["email"]) ||
    stringFrom(nested(payload, "data"), ["email", "customer_email", "user_email"]) ||
    stringFrom(nested(nested(payload, "data"), "metadata"), ["email"])
  )?.toLowerCase();
}

function extractPlan(payload: Record<string, unknown>) {
  return (
    stringFrom(nested(payload, "metadata"), ["plan"]) ||
    stringFrom(nested(nested(payload, "data"), "metadata"), ["plan"]) ||
    stringFrom(payload, ["plan", "product", "tier"]) ||
    "team"
  );
}

function normalizeStatus(payload: Record<string, unknown>) {
  const raw = (stringFrom(payload, ["status"]) || stringFrom(nested(payload, "data"), ["status"]) || String(payload.type || "")).toLowerCase();
  if (raw.includes("cancel")) return "canceled";
  if (raw.includes("past_due") || raw.includes("failed")) return "past_due";
  if (raw.includes("trial")) return "trialing";
  if (raw.includes("active") || raw.includes("paid") || raw.includes("payment")) return "active";
  return "unknown";
}

function nested(payload: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = payload[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringFrom(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}
