import { errorJson, json, readJson } from "@/lib/server/http";
import { createEvent } from "@/lib/server/repository";
import { createWhopCheckout } from "@/lib/integrations/whop";
import { getRuntimeContext, requireAdmin } from "@/lib/server/runtime";
import { normalizePlan } from "@/lib/plans";

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  requireAdmin(context);
  const body = await readJson<{ email?: string; plan?: string }>(request);
  const plan = normalizePlan(body.plan);

  const checkout = await createWhopCheckout({
    apiKey: context.env.WHOP_API_KEY,
    companyId: context.env.WHOP_COMPANY_ID,
    redirectUrl: context.env.WHOP_REDIRECT_URL,
    email: body.email || context.user.email,
    plan,
  });

  await createEvent(context.env.DB, {
    organization_id: "org_adga_primary",
    event_type: "billing.checkout.requested",
    actor_type: "user",
    actor_id: context.user.email,
    resource_type: "subscription",
    resource_id: null,
    payload: { provider: "whop", configured: checkout.configured, plan },
  });

  if (!checkout.configured) return errorJson("Whop API key is not configured.", 503, checkout);
  return json({ ok: true, checkout });
}
