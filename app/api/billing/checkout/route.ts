import { z } from "zod";
import { errorJson, json, readJson } from "@/lib/server/http";
import { createEvent } from "@/lib/server/repository";
import { createWhopCheckout } from "@/lib/integrations/whop";
import { getRuntimeContext } from "@/lib/server/runtime";
import { normalizePlan } from "@/lib/plans";

const PLAN_VALUES = ["pro", "team", "enterprise", "individual", "teams", "solo", "essential", "professional", "suite"] as const;

const checkoutSchema = z.object({
  email: z.string().email("Enter a valid work email."),
  plan: z.enum(PLAN_VALUES).optional(),
  seats: z.union([z.number().int().positive(), z.string()]).optional(),
  cadence: z.enum(["month", "year"]).optional(),
  name: z.string().max(120).optional(),
});

function parseSeats(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.floor(value);
  if (typeof value === "string") {
    const cleaned = value.trim();
    if (!cleaned) return undefined;
    const parsed = Number.parseInt(cleaned, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return undefined;
}

const ALLOWED_CHECKOUT_HOSTS = new Set([
  "whop.com",
  "www.whop.com",
  "pay.whop.com",
  "checkout.stripe.com",
  "buy.stripe.com",
]);

function isAllowedCheckoutHost(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const hostname = url.hostname.toLowerCase();
    return ALLOWED_CHECKOUT_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

function extractCheckoutUrl(checkout: { configured: boolean; body?: string } & Record<string, unknown>) {
  if (!checkout.configured || typeof checkout.body !== "string") return null;
  try {
    const parsed = JSON.parse(checkout.body) as Record<string, unknown>;
    const candidates = [
      parsed.purchase_url,
      parsed.checkout_url,
      parsed.url,
      (parsed.data as Record<string, unknown> | undefined)?.purchase_url,
      (parsed.data as Record<string, unknown> | undefined)?.checkout_url,
      (parsed.data as Record<string, unknown> | undefined)?.url,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && isAllowedCheckoutHost(candidate)) return candidate;
    }
  } catch {
    return null;
  }
  return null;
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  const body = await readJson<Record<string, unknown>>(request);

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson(parsed.error.issues[0]?.message || "Invalid checkout request.", 400);
  }

  const plan = normalizePlan(parsed.data.plan);
  const seats = parseSeats(parsed.data.seats);
  const cadence = parsed.data.cadence || "month";
  const email = parsed.data.email.toLowerCase().trim();

  const checkout = await createWhopCheckout({
    apiKey: context.env.WHOP_API_KEY,
    companyId: context.env.WHOP_COMPANY_ID,
    redirectUrl: context.env.WHOP_REDIRECT_URL,
    email,
    plan,
  });

  await createEvent(context.env.DB, {
    organization_id: "org_adga_primary",
    event_type: "billing.checkout.requested",
    actor_type: "user",
    actor_id: email,
    resource_type: "subscription",
    resource_id: null,
    payload: {
      provider: "whop",
      configured: checkout.configured,
      plan,
      seats: seats ?? null,
      cadence,
      name: parsed.data.name || null,
    },
  });

  if (!checkout.configured) {
    return json({
      ok: true,
      configured: false,
      fallback: "/api/auth/magic/request",
      message: "Checkout provider is not configured. The team will follow up by email.",
      plan,
      seats: seats ?? null,
      cadence,
    });
  }

  const url = extractCheckoutUrl(checkout);
  return json({
    ok: true,
    configured: true,
    url,
    plan,
    seats: seats ?? null,
    cadence,
  });
}
