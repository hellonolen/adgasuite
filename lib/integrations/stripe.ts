import { normalizePlan, type AdgaPlanId } from "@/lib/plans";

export type BillingCadence = "month" | "year";

export interface StripeCheckoutInput {
  secretKey?: string;
  origin: string;
  email: string;
  name?: string;
  plan: string;
  seats?: number;
  cadence?: BillingCadence;
  organizationId?: string;
  prices: Partial<Record<StripePriceKey, string | undefined>>;
}

export type StripePriceKey =
  | "STRIPE_PRICE_PRO_MONTHLY"
  | "STRIPE_PRICE_PRO_ANNUAL"
  | "STRIPE_PRICE_TEAM_BASE_MONTHLY"
  | "STRIPE_PRICE_TEAM_BASE_ANNUAL"
  | "STRIPE_PRICE_TEAM_SEAT_MONTHLY"
  | "STRIPE_PRICE_TEAM_SEAT_ANNUAL"
  | "STRIPE_PRICE_ENTERPRISE_BASE_MONTHLY"
  | "STRIPE_PRICE_ENTERPRISE_BASE_ANNUAL"
  | "STRIPE_PRICE_ENTERPRISE_SEAT_MONTHLY"
  | "STRIPE_PRICE_ENTERPRISE_SEAT_ANNUAL";

const TEAM_INCLUDED_SEATS = 5;
const TEAM_MAX_SEATS = 12;
const ENTERPRISE_INCLUDED_SEATS = 12;
const STRIPE_API_VERSION = "2026-02-25.clover";
const WEBHOOK_TOLERANCE_SECONDS = 300;

export function seatCountForPlan(plan: AdgaPlanId, requested?: number) {
  if (plan === "pro") return 1;
  if (plan === "team") return Math.max(TEAM_INCLUDED_SEATS, Math.min(TEAM_MAX_SEATS, requested || TEAM_INCLUDED_SEATS));
  return Math.max(ENTERPRISE_INCLUDED_SEATS, requested || ENTERPRISE_INCLUDED_SEATS);
}

export function stripeLineItems(input: {
  plan: AdgaPlanId;
  seats: number;
  cadence: BillingCadence;
  prices: StripeCheckoutInput["prices"];
}) {
  const annual = input.cadence === "year";
  const lineItems: Array<{ price: string; quantity: number }> = [];

  if (input.plan === "pro") {
    const price = input.prices[annual ? "STRIPE_PRICE_PRO_ANNUAL" : "STRIPE_PRICE_PRO_MONTHLY"];
    if (!price) throw new Error(`Missing Stripe price for Pro ${input.cadence}.`);
    lineItems.push({ price, quantity: 1 });
    return lineItems;
  }

  if (input.plan === "team") {
    const base = input.prices[annual ? "STRIPE_PRICE_TEAM_BASE_ANNUAL" : "STRIPE_PRICE_TEAM_BASE_MONTHLY"];
    const seat = input.prices[annual ? "STRIPE_PRICE_TEAM_SEAT_ANNUAL" : "STRIPE_PRICE_TEAM_SEAT_MONTHLY"];
    if (!base) throw new Error(`Missing Stripe base price for Team ${input.cadence}.`);
    lineItems.push({ price: base, quantity: 1 });
    const extraSeats = Math.max(0, input.seats - TEAM_INCLUDED_SEATS);
    if (extraSeats > 0) {
      if (!seat) throw new Error(`Missing Stripe seat price for Team ${input.cadence}.`);
      lineItems.push({ price: seat, quantity: extraSeats });
    }
    return lineItems;
  }

  const base = input.prices[annual ? "STRIPE_PRICE_ENTERPRISE_BASE_ANNUAL" : "STRIPE_PRICE_ENTERPRISE_BASE_MONTHLY"];
  const seat = input.prices[annual ? "STRIPE_PRICE_ENTERPRISE_SEAT_ANNUAL" : "STRIPE_PRICE_ENTERPRISE_SEAT_MONTHLY"];
  if (!base) throw new Error(`Missing Stripe base price for Enterprise ${input.cadence}.`);
  lineItems.push({ price: base, quantity: 1 });
  const extraSeats = Math.max(0, input.seats - ENTERPRISE_INCLUDED_SEATS);
  if (extraSeats > 0) {
    if (!seat) throw new Error(`Missing Stripe seat price for Enterprise ${input.cadence}.`);
    lineItems.push({ price: seat, quantity: extraSeats });
  }
  return lineItems;
}

export async function createStripeCheckout(input: StripeCheckoutInput) {
  if (!input.secretKey) {
    return { configured: false, provider: "stripe" as const, reason: "STRIPE_SECRET_KEY is not configured." };
  }

  const plan = normalizePlan(input.plan);
  const cadence = input.cadence === "year" ? "year" : "month";
  const seats = seatCountForPlan(plan, input.seats);
  const lineItems = stripeLineItems({ plan, cadence, seats, prices: input.prices });
  const params = new URLSearchParams();

  params.set("mode", "subscription");
  params.set("customer_email", input.email);
  params.set("client_reference_id", input.organizationId || input.email);
  params.set("success_url", `${input.origin}/onboarding?checkout=stripe&session_id={CHECKOUT_SESSION_ID}&plan=${plan}&cadence=${cadence}&seats=${seats}`);
  params.set("cancel_url", `${input.origin}/checkout?plan=${plan}&cadence=${cadence}&seats=${seats}`);
  params.set("metadata[email]", input.email);
  params.set("metadata[name]", input.name || "");
  params.set("metadata[plan]", plan);
  params.set("metadata[seats]", String(seats));
  params.set("metadata[cadence]", cadence);
  if (input.organizationId) params.set("metadata[organization_id]", input.organizationId);
  params.set("subscription_data[metadata][email]", input.email);
  params.set("subscription_data[metadata][name]", input.name || "");
  params.set("subscription_data[metadata][plan]", plan);
  params.set("subscription_data[metadata][seats]", String(seats));
  params.set("subscription_data[metadata][cadence]", cadence);
  if (input.organizationId) params.set("subscription_data[metadata][organization_id]", input.organizationId);
  lineItems.forEach((item, index) => {
    params.set(`line_items[${index}][price]`, item.price);
    params.set(`line_items[${index}][quantity]`, String(item.quantity));
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": STRIPE_API_VERSION,
    },
    body: params,
  });

  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  const url = typeof body.url === "string" ? body.url : null;
  return {
    configured: true,
    provider: "stripe" as const,
    ok: response.ok,
    status: response.status,
    url,
    body,
    plan,
    seats,
    cadence,
  };
}

export interface StripeCheckoutSession {
  id?: string;
  object?: string;
  mode?: string;
  status?: string;
  payment_status?: string;
  customer?: unknown;
  customer_email?: string | null;
  customer_details?: {
    email?: string | null;
    name?: string | null;
  } | null;
  subscription?: unknown;
  metadata?: Record<string, string | undefined>;
}

export async function retrieveStripeCheckoutSession(input: {
  secretKey?: string;
  sessionId: string;
}) {
  if (!input.secretKey) {
    return { configured: false, provider: "stripe" as const, reason: "STRIPE_SECRET_KEY is not configured." };
  }

  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(input.sessionId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${input.secretKey}`,
      "Stripe-Version": STRIPE_API_VERSION,
    },
  });

  const body = await response.json().catch(() => ({})) as StripeCheckoutSession & Record<string, unknown>;
  return {
    configured: true,
    provider: "stripe" as const,
    ok: response.ok,
    status: response.status,
    session: body,
  };
}

export async function verifyStripeWebhook(input: {
  secret?: string;
  signature: string;
  rawBody: string;
}) {
  if (!input.secret) return { ok: false, reason: "STRIPE_WEBHOOK_SECRET is not configured." };
  if (!input.signature) return { ok: false, reason: "Missing Stripe signature." };

  const parts = input.signature.split(",").reduce<{ timestamp?: string; signatures: string[] }>((acc, part) => {
    const separator = part.indexOf("=");
    if (separator === -1) return acc;
    const key = part.slice(0, separator);
    const value = part.slice(separator + 1);
    if (key === "t") acc.timestamp = value;
    if (key === "v1") acc.signatures.push(value);
    return acc;
  }, { signatures: [] });
  const timestamp = parts.timestamp;
  if (!timestamp || parts.signatures.length === 0) return { ok: false, reason: "Malformed Stripe signature." };

  const timestampSeconds = Number.parseInt(timestamp, 10);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(timestampSeconds) || Math.abs(nowSeconds - timestampSeconds) > WEBHOOK_TOLERANCE_SECONDS) {
    return { ok: false, reason: "Expired Stripe signature." };
  }

  const signedPayload = `${timestamp}.${input.rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(input.secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expected = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");

  return {
    ok: parts.signatures.some((signature) => timingSafeEqual(signature, expected)),
    reason: "Invalid Stripe signature.",
  };
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return mismatch === 0;
}
