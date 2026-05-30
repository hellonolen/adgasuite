// PATCH the existing Stripe webhook endpoint to the events our handler can process.
// Idempotent — every call sets the same enabled_events list.

import { errorJson, json } from "@/lib/server/http";
import { getRuntimeContext, hydrateUserFromSession, requireAdmin } from "@/lib/server/runtime";

export const dynamic = "force-dynamic";

const WEBHOOK_URL = "https://adga.ai/api/webhooks/stripe";
const ENABLED_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "invoice.paid",
  "invoice.marked_uncollectible",
];

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  await hydrateUserFromSession(context, request);
  requireAdmin(context);
  if (!context.env.STRIPE_SECRET_KEY) return errorJson("STRIPE_SECRET_KEY unset", 503);

  // Find the endpoint by URL.
  const list = await fetch("https://api.stripe.com/v1/webhook_endpoints?limit=20", {
    headers: {
      Authorization: `Bearer ${context.env.STRIPE_SECRET_KEY}`,
      "Stripe-Version": "2026-02-25.clover",
    },
  }).then((r) => r.json() as Promise<{ data?: Array<{ id: string; url: string }> }>);
  const adga = (list.data || []).find((e) => e.url === WEBHOOK_URL);
  if (!adga) return errorJson("No webhook registered for our URL — POST /api/admin/diag/stripe first.", 404);

  const params = new URLSearchParams();
  for (const ev of ENABLED_EVENTS) params.append("enabled_events[]", ev);

  const updated = await fetch(`https://api.stripe.com/v1/webhook_endpoints/${adga.id}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${context.env.STRIPE_SECRET_KEY}`,
      "Stripe-Version": "2026-02-25.clover",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const body = (await updated.json().catch(() => ({}))) as Record<string, unknown>;
  if (!updated.ok) return errorJson("Stripe rejected the update", updated.status, body);

  return json({
    ok: true,
    id: body.id,
    enabled_events: body.enabled_events,
  });
}
