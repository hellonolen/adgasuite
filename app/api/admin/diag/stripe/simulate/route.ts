// Simulate a Stripe webhook event end-to-end. Signs a synthetic event with
// STRIPE_WEBHOOK_SECRET (exactly as Stripe would), POSTs it to our own
// /api/webhooks/stripe handler, and reports both the handler response and
// the resulting DB state.
//
// This verifies the webhook → subscription provisioning chain works WITHOUT
// involving a real payment or Stripe's network.

import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext, hydrateUserFromSession, requireAdmin } from "@/lib/server/runtime";

export const dynamic = "force-dynamic";

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  const bytes = new Uint8Array(sig);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  await hydrateUserFromSession(context, request);
  requireAdmin(context);

  if (!context.env.STRIPE_WEBHOOK_SECRET) return errorJson("STRIPE_WEBHOOK_SECRET unset.", 503);

  const body = await readJson<{ email?: string; plan?: string; type?: string }>(request);
  const email = (body.email || "diag-stripe@adga.ai").toLowerCase();
  const plan = body.plan || "team";
  const type = body.type || "checkout.session.completed";
  const ts = Math.floor(Date.now() / 1000);
  const customerId = `cus_diag_${Date.now()}`;
  const subscriptionId = `sub_diag_${Date.now()}`;
  const sessionId = `cs_diag_${Date.now()}`;

  const event = {
    id: `evt_diag_${Date.now()}`,
    object: "event",
    api_version: "2026-02-25.clover",
    created: ts,
    livemode: false,
    type,
    data: {
      object: {
        id: sessionId,
        object: "checkout.session",
        mode: "subscription",
        status: "complete",
        payment_status: "paid",
        customer: customerId,
        customer_email: email,
        customer_details: { email, name: "Diag User" },
        subscription: subscriptionId,
        metadata: { plan, organization_id: "", email },
      },
    },
  };

  const rawBody = JSON.stringify(event);
  const signedPayload = `${ts}.${rawBody}`;
  const sig = await hmacSha256Hex(context.env.STRIPE_WEBHOOK_SECRET, signedPayload);
  const stripeSignature = `t=${ts},v1=${sig}`;

  // Verify the signature ourselves first (proves the rest of the handler will accept it),
  // then invoke the webhook handler's POST directly — workers can't reliably HTTP-call
  // themselves due to Cloudflare's loop prevention.
  const { verifyStripeWebhook } = await import("@/lib/integrations/stripe");
  const verified = await verifyStripeWebhook({
    secret: context.env.STRIPE_WEBHOOK_SECRET,
    signature: stripeSignature,
    rawBody,
  });
  if (!verified.ok) return errorJson("Self-test: signature failed verification", 500, { reason: verified.reason });

  const { POST: webhookPost } = await import("@/app/api/webhooks/stripe/route");
  const fakeRequest = new Request("https://internal.local/api/webhooks/stripe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": stripeSignature,
    },
    body: rawBody,
  });
  const response = await webhookPost(fakeRequest);
  const handlerBody = await response.json().catch(() => ({}));

  // Snapshot the DB row that should have been created/upserted.
  let subscriptionRow: Record<string, unknown> | null = null;
  let eventCount = 0;
  if (context.env.DB) {
    subscriptionRow = await context.env.DB
      .prepare("SELECT * FROM subscriptions WHERE provider_subscription_id = ?")
      .bind(subscriptionId)
      .first<Record<string, unknown>>()
      .catch(() => null);
    const eventRow = await context.env.DB
      .prepare("SELECT COUNT(*) as c FROM events WHERE event_type = ?")
      .bind(`stripe.${type}`)
      .first<{ c: number }>()
      .catch(() => null);
    eventCount = eventRow?.c || 0;
  }

  return json({
    ok: response.ok,
    handler_status: response.status,
    handler_response: handlerBody,
    simulated_event: { id: event.id, type, customerId, subscriptionId, sessionId, email, plan },
    subscription_row_created: Boolean(subscriptionRow),
    subscription_row: subscriptionRow,
    matching_event_rows_in_d1: eventCount,
  });
}
