import { z } from "zod";

import { createStripeCheckout, type StripePriceKey } from "@/lib/integrations/stripe";
import { errorJson, json, readJson } from "@/lib/server/http";
import { createEvent } from "@/lib/server/repository";
import { getRuntimeContext } from "@/lib/server/runtime";
import { orgIdForEmail } from "@/lib/server/tenant";
import { normalizePlan } from "@/lib/plans";

const PLAN_VALUES = ["pro", "team", "enterprise", "individual", "teams", "solo", "essential", "professional", "suite"] as const;

const checkoutSchema = z.object({
  email: z.string().email("Enter a valid work email."),
  plan: z.enum(PLAN_VALUES).optional(),
  seats: z.union([z.number().int().positive(), z.string()]).optional(),
  cadence: z.enum(["month", "year"]).optional(),
  name: z.string().max(120).optional(),
  first_name: z.string().max(120).optional(),
});

function parseSeats(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.floor(value);
  if (typeof value === "string") {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return undefined;
}

function stripePrices(env: CloudflareEnv) {
  const keys: StripePriceKey[] = [
    "STRIPE_PRICE_PRO_MONTHLY",
    "STRIPE_PRICE_PRO_ANNUAL",
    "STRIPE_PRICE_TEAM_BASE_MONTHLY",
    "STRIPE_PRICE_TEAM_BASE_ANNUAL",
    "STRIPE_PRICE_TEAM_SEAT_MONTHLY",
    "STRIPE_PRICE_TEAM_SEAT_ANNUAL",
    "STRIPE_PRICE_ENTERPRISE_BASE_MONTHLY",
    "STRIPE_PRICE_ENTERPRISE_BASE_ANNUAL",
    "STRIPE_PRICE_ENTERPRISE_SEAT_MONTHLY",
    "STRIPE_PRICE_ENTERPRISE_SEAT_ANNUAL",
  ];
  return Object.fromEntries(keys.map((key) => [key, env[key]])) as Partial<Record<StripePriceKey, string | undefined>>;
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  const body = await readJson<Record<string, unknown>>(request);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson(parsed.error.issues[0]?.message || "Invalid checkout request.", 400);
  }

  const email = parsed.data.email.toLowerCase().trim();
  const plan = normalizePlan(parsed.data.plan);
  const seats = parseSeats(parsed.data.seats);
  const cadence = parsed.data.cadence || "month";
  const name = parsed.data.name || parsed.data.first_name || "";
  const origin = new URL(request.url).origin;
  const organizationId = orgIdForEmail(email);

  let checkout: Awaited<ReturnType<typeof createStripeCheckout>>;
  try {
    checkout = await createStripeCheckout({
      secretKey: context.env.STRIPE_SECRET_KEY,
      origin,
      email,
      name,
      plan,
      seats,
      cadence,
      organizationId,
      prices: stripePrices(context.env),
    });
  } catch (error) {
    return errorJson(error instanceof Error ? error.message.replace(/Stripe/g, "Checkout") : "Checkout could not be configured.", 503);
  }

  await createEvent(context.env.DB, {
    organization_id: organizationId,
    event_type: "billing.checkout.requested",
    actor_type: "user",
    actor_id: email,
    resource_type: "subscription",
    resource_id: null,
    payload: {
      provider: "stripe",
      configured: checkout.configured,
      ok: "ok" in checkout ? checkout.ok : false,
      status: "status" in checkout ? checkout.status : null,
      plan,
      seats: checkout.configured ? checkout.seats : seats ?? null,
      cadence,
      name,
    },
  });

  if (!checkout.configured) {
    return json({
      ok: true,
      configured: false,
      provider: "stripe",
      fallback: "/api/auth/magic/request",
      message: "Checkout is not configured yet. The team will follow up by email.",
      plan,
      seats: seats ?? null,
      cadence,
    });
  }

  if (!checkout.ok || !checkout.url) {
    return errorJson("Checkout did not return a usable checkout URL.", 502, {
      provider: "stripe",
      status: checkout.status,
      error: checkout.body,
    });
  }

  return json({
    ok: true,
    configured: true,
    provider: "stripe",
    url: checkout.url,
    plan: checkout.plan,
    seats: checkout.seats,
    cadence: checkout.cadence,
  });
}
