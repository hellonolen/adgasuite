export interface WhopSubscriptionState {
  provider: "whop";
  status: "trialing" | "active" | "past_due" | "canceled" | "unknown";
  plan: "individual" | "teams" | "enterprise";
}

export function getDefaultWhopState(): WhopSubscriptionState {
  return {
    provider: "whop",
    status: "trialing",
    plan: "teams",
  };
}

export function hasWhopRuntime() {
  return Boolean(process.env.WHOP_API_KEY && process.env.WHOP_WEBHOOK_SECRET);
}

export interface WhopCheckoutInput {
  apiKey?: string;
  companyId?: string;
  redirectUrl?: string;
  email: string;
  plan: string;
}

export async function createWhopCheckout(input: WhopCheckoutInput) {
  if (!input.apiKey) {
    return {
      configured: false,
      provider: "whop",
      reason: "WHOP_API_KEY is not configured.",
    };
  }
  if (!input.companyId) {
    return {
      configured: false,
      provider: "whop",
      reason: "WHOP_COMPANY_ID is not configured.",
    };
  }

  const response = await fetch("https://api.whop.com/api/v1/checkout_configurations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan: {
        company_id: input.companyId,
        currency: "usd",
      },
      redirect_url: input.redirectUrl || "https://adga.ai/suite",
      metadata: {
        product: "ADGA Suite",
        plan: input.plan,
        email: input.email,
      },
    }),
  });

  const body = await response.text();
  return {
    configured: true,
    provider: "whop",
    ok: response.ok,
    status: response.status,
    body,
  };
}

export async function verifyWhopWebhook(input: {
  secret?: string;
  signature: string;
  rawBody: string;
}) {
  if (!input.secret) return { ok: false, reason: "WHOP_WEBHOOK_SECRET is not configured." };
  if (!input.signature) return { ok: false, reason: "Missing Whop webhook signature." };

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(input.secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input.rawBody));
  const expected = Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("");

  return {
    ok: timingSafeEqual(input.signature.replace(/^sha256=/, ""), expected),
    reason: "Invalid Whop webhook signature.",
  };
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}
