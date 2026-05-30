// Admin diagnostic: read + repair Stripe webhook registration.
//   GET  → list current Stripe webhook endpoints visible to the secret key.
//   POST → register https://adga.ai/api/webhooks/stripe if it isn't already.
// Auth: session cookie → owner/admin only.

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

async function stripeFetch(env: CloudflareEnv, path: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; body: unknown }> {
  if (!env.STRIPE_SECRET_KEY) return { ok: false, status: 503, body: { error: "STRIPE_SECRET_KEY unset" } };
  const response = await fetch(`https://api.stripe.com${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Stripe-Version": "2026-02-25.clover",
    },
  });
  const body = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, body };
}

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  await hydrateUserFromSession(context, request);
  requireAdmin(context);

  const endpoints = await stripeFetch(context.env, "/v1/webhook_endpoints?limit=20");
  if (!endpoints.ok) return errorJson("Stripe webhook_endpoints fetch failed", endpoints.status, endpoints.body);

  const list = (endpoints.body as { data?: Array<Record<string, unknown>> }).data || [];
  const adga = list.find((e) => String(e.url) === WEBHOOK_URL) || null;

  return json({
    ok: true,
    webhook_url: WEBHOOK_URL,
    registered: Boolean(adga),
    adga_endpoint: adga
      ? {
          id: adga.id,
          status: adga.status,
          enabled_events: adga.enabled_events,
          created: adga.created,
          livemode: adga.livemode,
        }
      : null,
    all_endpoints: list.map((e) => ({ id: e.id, url: e.url, status: e.status, livemode: e.livemode })),
  });
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  await hydrateUserFromSession(context, request);
  requireAdmin(context);

  // Check if already registered.
  const existing = await stripeFetch(context.env, "/v1/webhook_endpoints?limit=20");
  if (!existing.ok) return errorJson("Stripe webhook_endpoints fetch failed", existing.status, existing.body);
  const list = (existing.body as { data?: Array<Record<string, unknown>> }).data || [];
  const adga = list.find((e) => String(e.url) === WEBHOOK_URL);
  if (adga) {
    return json({ ok: true, already_registered: true, id: adga.id, status: adga.status, enabled_events: adga.enabled_events });
  }

  // Register it. URL-encoded form body per Stripe API.
  const params = new URLSearchParams();
  params.set("url", WEBHOOK_URL);
  for (const ev of ENABLED_EVENTS) params.append("enabled_events[]", ev);
  params.set("description", "ADGA production checkout + subscription lifecycle");

  const created = await stripeFetch(context.env, "/v1/webhook_endpoints", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!created.ok) return errorJson("Failed to create webhook endpoint", created.status, created.body);

  const body = created.body as Record<string, unknown>;
  return json({
    ok: true,
    created: true,
    id: body.id,
    secret: body.secret, // shown ONCE — must be stored as STRIPE_WEBHOOK_SECRET
    status: body.status,
    enabled_events: body.enabled_events,
    next_step: "If `secret` is present, rotate STRIPE_WEBHOOK_SECRET to this value via `wrangler secret put STRIPE_WEBHOOK_SECRET`.",
  });
}
