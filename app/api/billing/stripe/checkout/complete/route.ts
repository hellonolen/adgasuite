import { NextResponse } from "next/server";
import { z } from "zod";

import { retrieveStripeCheckoutSession, type StripeCheckoutSession } from "@/lib/integrations/stripe";
import { provisionUserSession } from "@/lib/server/auth-provision";
import { errorJson, readJson } from "@/lib/server/http";
import { newId, nowIso } from "@/lib/server/id";
import { AUTH_COOKIE_NAME, authCookieOptions, normalizeEmail } from "@/lib/server/magic-auth";
import { createEvent } from "@/lib/server/repository";
import { getRuntimeContext } from "@/lib/server/runtime";
import { orgIdForEmail } from "@/lib/server/tenant";
import { normalizePlan } from "@/lib/plans";

const completeSchema = z.object({
  session_id: z.string().trim().min(8),
});

type CompletedSession = StripeCheckoutSession & Record<string, unknown>;

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  const parsed = completeSchema.safeParse(await readJson<Record<string, unknown>>(request));
  if (!parsed.success) return errorJson("Missing checkout session.", 400);
  if (!context.env.DB) return errorJson("Authentication storage is not configured.", 503);

  const checkout = await retrieveStripeCheckoutSession({
    secretKey: context.env.STRIPE_SECRET_KEY,
    sessionId: parsed.data.session_id,
  });

  if (!checkout.configured) {
    return errorJson("Checkout verification is not configured.", 503, { provider: "stripe" });
  }
  if (!checkout.ok) {
    return errorJson("Could not verify this checkout session.", 502, {
      provider: "stripe",
      status: checkout.status,
    });
  }

  const session = checkout.session as CompletedSession;
  if (session.object && session.object !== "checkout.session") {
    return errorJson("Stripe returned an unexpected checkout object.", 502);
  }
  if (session.mode !== "subscription") {
    return errorJson("Checkout session is not for a subscription.", 409, {
      mode: session.mode || null,
    });
  }
  if (!isCompletedPaidSession(session)) {
    return errorJson("Checkout is not complete yet.", 409, {
      status: session.status || null,
      payment_status: session.payment_status || null,
    });
  }

  const email = sessionEmail(session);
  if (!email) return errorJson("Checkout did not include a customer email.", 409);

  const plan = normalizePlan(session.metadata?.plan);
  const organizationId = orgIdForEmail(email);
  const now = nowIso();
  const subscriptionId = stringValue(session.subscription);
  const customerId = stringValue(session.customer);
  const name = session.customer_details?.name || session.metadata?.name || null;

  const provisioned = await provisionUserSession(context.env.DB, {
    email,
    name,
    plan,
    subscriptionStatus: "active",
  });

  await context.env.DB
    .prepare(
      `INSERT INTO subscriptions
        (id, organization_id, provider, provider_customer_id, provider_subscription_id, status, plan, current_period_end, created_at, updated_at)
       VALUES (?, ?, 'stripe', ?, ?, 'active', ?, NULL, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         organization_id = excluded.organization_id,
         provider_customer_id = COALESCE(excluded.provider_customer_id, provider_customer_id),
         provider_subscription_id = COALESCE(excluded.provider_subscription_id, provider_subscription_id),
         status = 'active',
         plan = excluded.plan,
         updated_at = excluded.updated_at`,
    )
    .bind(
      subscriptionId ? `stripe_${subscriptionId}` : `stripe_checkout_${session.id || newId("checkout")}`,
      organizationId,
      customerId,
      subscriptionId || session.id || null,
      plan,
      now,
      now,
    )
    .run();

  await createEvent(context.env.DB, {
    organization_id: organizationId,
    event_type: "billing.checkout.completed",
    actor_type: "user",
    actor_id: email,
    resource_type: "subscription",
    resource_id: subscriptionId || session.id || null,
    payload: {
      provider: "stripe",
      checkout_session_id: session.id || parsed.data.session_id,
      customer_id: customerId,
      subscription_id: subscriptionId,
      plan,
      status: session.status || null,
      payment_status: session.payment_status || null,
      metadata_organization_id: session.metadata?.organization_id || null,
    },
  });

  const response = NextResponse.json({
    ok: true,
    provider: "stripe",
    email,
    plan,
    organization_id: provisioned.organizationId,
    redirect: "/suite/onboarding",
  });
  response.cookies.set(AUTH_COOKIE_NAME, provisioned.sessionToken, authCookieOptions(request.url));
  return response;
}

function isCompletedPaidSession(session: CompletedSession) {
  const status = String(session.status || "").toLowerCase();
  const paymentStatus = String(session.payment_status || "").toLowerCase();
  return status === "complete" && (paymentStatus === "paid" || paymentStatus === "no_payment_required");
}

function sessionEmail(session: CompletedSession) {
  return normalizeEmail(
    session.customer_details?.email ||
      session.customer_email ||
      session.metadata?.email ||
      "",
  );
}

function stringValue(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}
