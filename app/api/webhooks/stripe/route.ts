import { json } from "@/lib/server/http";
import { verifyStripeWebhook } from "@/lib/integrations/stripe";
import { createEvent } from "@/lib/server/repository";
import { getRuntimeContext } from "@/lib/server/runtime";
import { newId, nowIso } from "@/lib/server/id";
import { DEFAULT_ORG_ID, orgIdForEmail, orgNameForEmail, orgSlugForEmail } from "@/lib/server/tenant";
import { normalizePlan } from "@/lib/plans";
import { publish } from "@/lib/events/bus";
import { callSkill } from "@/lib/agents/skill-registry";
import "@/lib/agents/handlers"; // side-effect: registers handlers

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

  let payload: StripeEvent;
  try {
    payload = JSON.parse(rawBody || "{}") as StripeEvent;
  } catch {
    return json({ ok: false, error: "Malformed Stripe webhook payload." }, { status: 400 });
  }

  const object = payload.data?.object || {};
  const email = extractEmail(object);
  const organizationId =
    normalizedString(object.metadata?.organization_id) ||
    (await findOrganizationIdForStripeObject(context.env.DB, object)) ||
    (email ? orgIdForEmail(email) : DEFAULT_ORG_ID);
  const plan = normalizePlan(object.metadata?.plan || (await findPlanForStripeObject(context.env.DB, object)) || "team");
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

    if (shouldReconcileSubscription(payload.type)) {
      await context.env.DB
        .prepare(
          `INSERT INTO subscriptions
            (id, organization_id, provider, provider_customer_id, provider_subscription_id, status, plan, current_period_end, created_at, updated_at)
           VALUES (?, ?, 'stripe', ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             provider_customer_id = COALESCE(excluded.provider_customer_id, provider_customer_id),
             provider_subscription_id = COALESCE(excluded.provider_subscription_id, provider_subscription_id),
             status = excluded.status,
             plan = excluded.plan,
             current_period_end = excluded.current_period_end,
             updated_at = excluded.updated_at`,
        )
        .bind(
          subscriptionRowId(object),
          organizationId,
          stripeCustomerId(object),
          stripeSubscriptionId(object),
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

  // When this webhook represents a paid checkout, fire the activation chain:
  // emit subscription.activated → Conductor runs workspace-activation skill →
  // workspace.activated emitted for Sales + Intelligence to pick up.
  if (
    isCheckoutActivation(payload.type, object, status) &&
    email &&
    context.env.DB
  ) {
    await publish(context.env.DB, {
      organization_id: organizationId,
      event_type: "subscription.activated",
      actor_type: "webhook",
      actor_id: "stripe",
      resource_type: "subscription",
      resource_id: stripeSubscriptionId(object) || String(object.id || ""),
      payload: {
        email,
        plan,
        stripe_customer_id: stripeCustomerId(object),
        stripe_subscription_id: stripeSubscriptionId(object),
      },
    }).catch(() => null);

    await callSkill(
      {
        env: context.env,
        organization_id: organizationId,
        actor_type: "webhook",
        actor_id: "stripe",
      },
      "workspace-activation",
      {
        email,
        plan,
        stripe_customer_id: stripeCustomerId(object),
        stripe_subscription_id: stripeSubscriptionId(object),
        organization_id: organizationId,
      },
    ).catch(() => null);
  }

  return json({ ok: true, event_id: event.id });
}

function isCheckoutActivation(type: string, object: StripeObject, status: string): boolean {
  if (type === "checkout.session.completed") {
    return String(object.payment_status || "").toLowerCase() === "paid";
  }
  if (type === "invoice.paid" || type === "invoice.payment_succeeded") return true;
  if (type === "customer.subscription.created" && status === "active") return true;
  return false;
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
  parent?: {
    subscription_details?: {
      subscription?: unknown;
      metadata?: Record<string, string | undefined>;
    };
  };
  status?: string;
  payment_status?: string;
  current_period_end?: number;
  lines?: {
    data?: Array<{
      period?: { end?: number };
      parent?: {
        subscription_item_details?: {
          subscription?: unknown;
        };
      };
    }>;
  };
  metadata?: Record<string, string | undefined>;
}

async function findOrganizationIdForStripeObject(db: D1Database | undefined, object: StripeObject) {
  if (!db) return null;
  const customerId = stripeCustomerId(object);
  const subscriptionId = stripeSubscriptionId(object);
  if (!customerId && !subscriptionId) return null;

  const row = await db
    .prepare(
      `SELECT organization_id
       FROM subscriptions
       WHERE provider = 'stripe'
         AND (
           (? IS NOT NULL AND provider_subscription_id = ?)
           OR (? IS NOT NULL AND provider_customer_id = ?)
         )
       ORDER BY updated_at DESC
       LIMIT 1`,
    )
    .bind(subscriptionId, subscriptionId, customerId, customerId)
    .first<{ organization_id: string | null }>()
    .catch(() => null);
  return row?.organization_id || null;
}

async function findPlanForStripeObject(db: D1Database | undefined, object: StripeObject) {
  if (!db) return null;
  const customerId = stripeCustomerId(object);
  const subscriptionId = stripeSubscriptionId(object);
  if (!customerId && !subscriptionId) return null;

  const row = await db
    .prepare(
      `SELECT plan
       FROM subscriptions
       WHERE provider = 'stripe'
         AND (
           (? IS NOT NULL AND provider_subscription_id = ?)
           OR (? IS NOT NULL AND provider_customer_id = ?)
         )
       ORDER BY updated_at DESC
       LIMIT 1`,
    )
    .bind(subscriptionId, subscriptionId, customerId, customerId)
    .first<{ plan: string | null }>()
    .catch(() => null);
  return row?.plan || null;
}

function extractEmail(object: StripeObject) {
  return (
    object.customer_email ||
    object.customer_details?.email ||
    object.metadata?.email ||
    object.parent?.subscription_details?.metadata?.email ||
    ""
  ).toLowerCase();
}

function subscriptionStatus(type: string, object: StripeObject) {
  const raw = String(object.status || object.payment_status || type).toLowerCase();
  if (type === "invoice.payment_failed") return "past_due";
  if (type === "invoice.marked_uncollectible") return "unpaid";
  if (type === "invoice.payment_succeeded" || type === "invoice.paid") return "active";
  if (type === "customer.subscription.paused") return "paused";
  if (type === "customer.subscription.deleted") return "canceled";
  if (raw.includes("incomplete_expired")) return "incomplete_expired";
  if (raw.includes("incomplete")) return "incomplete";
  if (raw.includes("unpaid")) return "unpaid";
  if (raw.includes("cancel")) return "canceled";
  if (raw.includes("past_due") || raw.includes("failed")) return "past_due";
  if (raw.includes("trial")) return "trialing";
  if (raw.includes("active") || raw.includes("complete") || raw.includes("paid")) return "active";
  return "unknown";
}

function subscriptionRowId(object: StripeObject) {
  const id = stripeSubscriptionId(object) || stripeCustomerId(object);
  return id ? `stripe_${id}` : newId("sub");
}

function periodEnd(object: StripeObject) {
  const linePeriodEnd = object.lines?.data?.find((line) => line.period?.end)?.period?.end;
  const timestamp = object.current_period_end || linePeriodEnd;
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

function stringValue(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

function stripeCustomerId(object: StripeObject) {
  return stringValue(object.customer);
}

function stripeSubscriptionId(object: StripeObject) {
  return (
    stringValue(object.subscription) ||
    stringValue(object.parent?.subscription_details?.subscription) ||
    stringValue(object.lines?.data?.find((line) => line.parent?.subscription_item_details?.subscription)?.parent?.subscription_item_details?.subscription) ||
    (String(object.id || "").startsWith("sub_") ? stringValue(object.id) : null)
  );
}

function shouldReconcileSubscription(type: string) {
  return (
    type.startsWith("checkout.session.") ||
    type.startsWith("customer.subscription.") ||
    type === "invoice.payment_failed" ||
    type === "invoice.payment_succeeded" ||
    type === "invoice.paid" ||
    type === "invoice.marked_uncollectible"
  );
}

function normalizedString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
