import { errorJson, json } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { resolveTenantSession } from "@/lib/server/tenant";

const STRIPE_API_VERSION = "2026-02-25.clover";

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  const session = await resolveTenantSession(context, request);
  if (!session) return errorJson("Authentication required.", 401);
  if (!context.env.STRIPE_SECRET_KEY) {
    return errorJson("Stripe billing portal is not configured.", 503);
  }

  const customerId = await findStripeCustomerId(context.env.DB, session.organizationId);
  if (!customerId) {
    return errorJson("No Stripe customer is attached to this workspace yet.", 404);
  }

  const origin = new URL(request.url).origin;
  const params = new URLSearchParams();
  params.set("customer", customerId);
  params.set("return_url", `${origin}/suite/settings/billing`);

  const response = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${context.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": STRIPE_API_VERSION,
    },
    body: params,
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const url = typeof body.url === "string" ? body.url : null;
  if (!response.ok || !url) {
    return errorJson("Could not open Stripe billing portal.", 502, { status: response.status, error: body });
  }

  return json({ ok: true, url });
}

async function findStripeCustomerId(db: D1Database | undefined, organizationId: string) {
  if (!db) return null;
  const row = await db
    .prepare(
      `SELECT provider_customer_id
       FROM subscriptions
       WHERE organization_id = ? AND provider = 'stripe' AND provider_customer_id IS NOT NULL
       ORDER BY updated_at DESC
       LIMIT 1`,
    )
    .bind(organizationId)
    .first<{ provider_customer_id: string | null }>();
  return row?.provider_customer_id || null;
}
