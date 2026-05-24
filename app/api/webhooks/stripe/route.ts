import { json } from "@/lib/server/http";
import { verifyStripeWebhook } from "@/lib/integrations/stripe";
import { createEvent } from "@/lib/server/repository";
import { getRuntimeContext } from "@/lib/server/runtime";
import { newId, nowIso } from "@/lib/server/id";
import { orgIdForEmail, orgNameForEmail, orgSlugForEmail } from "@/lib/server/tenant";

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature") || "";
  const verified = await verifyStripeWebhook({
    secret: context.env.STRIPE_WEBHOOK_SECRET,
    signature,
    rawBody,
  });

  if (!verified.ok) return json({ ok: false, error: verified.reason }, { status: 401 });

  const payload = JSON.parse(rawBody || "{}") as StripeEvent;
  const object = payload.data?.object || {};
  const email = extractEmail(object);
  const organizationId = email ? orgIdForEmail(email) : "org_adga_primary";
  const plan = String(object.metadata?.plan || "team");
  const status = subscriptionStatus(payload.type, object);
  const now = nowIso();

  if (context.env.DB) {
    await context.env.DB
      .prepare(
        `INSERT OR IGNORE INTO organizations (id, name, slug, plan, subscription_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        organizationId,
        email ? orgNameForEmail(email) : "ADGA",
        email ? orgSlugForEmail(email) : "adga-primary",
        plan,
        status,
        now,
        now,
      )
      .run();

    if (payload.type.startsWith("checkout.session.") || payload.type.startsWith("customer.subscription.")) {
      await context.env.DB
        .prepare(
          `INSERT INTO subscriptions
            (id, organization_id, provider, provider_customer_id, provider_subscription_id, status, plan, current_period_end, created_at, updated_at)
           VALUES (?, ?, 'stripe', ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             status = excluded.status,
             plan = excluded.plan,
             current_period_end = excluded.current_period_end,
             updated_at = excluded.updated_at`,
        )
        .bind(
          subscriptionRowId(object),
          organizationId,
          stringValue(object.customer),
          stringValue(object.subscription || object.id),
          status,
          plan,
          periodEnd(object),
          now,
          now,
        )
        .run();

      await context.env.DB
        .prepare("UPDATE organizations SET plan = ?, subscription_status = ?, updated_at = ? WHERE id = ?")
        .bind(plan, status, now, organizationId)
        .run();
    }
  }

  const event = await createEvent(context.env.DB, {
    organization_id: organizationId,
    event_type: `stripe.${payload.type || "event"}`,
    actor_type: "webhook",
    actor_id: "stripe",
    resource_type: "subscription",
    resource_id: String(object.id || payload.id || ""),
    payload: payload as unknown as Record<string, unknown>,
  });

  return json({ ok: true, event_id: event.id });
}

interface StripeEvent {
  id?: string;
  type: string;
  data?: { object?: StripeObject };
}

interface StripeObject {
  id?: string;
  customer?: unknown;
  customer_email?: string;
  customer_details?: { email?: string };
  subscription?: unknown;
  status?: string;
  current_period_end?: number;
  metadata?: Record<string, string | undefined>;
}

function extractEmail(object: StripeObject) {
  return (
    object.customer_email ||
    object.customer_details?.email ||
    object.metadata?.email ||
    ""
  ).toLowerCase();
}

function subscriptionStatus(type: string, object: StripeObject) {
  const raw = String(object.status || type).toLowerCase();
  if (raw.includes("cancel")) return "canceled";
  if (raw.includes("past_due") || raw.includes("failed")) return "past_due";
  if (raw.includes("trial")) return "trialing";
  if (raw.includes("active") || raw.includes("complete") || raw.includes("paid")) return "active";
  return "unknown";
}

function subscriptionRowId(object: StripeObject) {
  const id = stringValue(object.subscription || object.id);
  return id ? `stripe_${id}` : newId("sub");
}

function periodEnd(object: StripeObject) {
  return object.current_period_end
    ? new Date(object.current_period_end * 1000).toISOString()
    : null;
}

function stringValue(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}
