import { json } from "@/lib/server/http";
import { createEvent } from "@/lib/server/repository";
import { getRuntimeContext } from "@/lib/server/runtime";
import { verifyWhopWebhook } from "@/lib/integrations/whop";

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  const rawBody = await request.text();
  const signature = request.headers.get("x-whop-signature") || "";
  const verified = await verifyWhopWebhook({
    secret: context.env.WHOP_WEBHOOK_SECRET,
    signature,
    rawBody,
  });

  if (!verified.ok) return json({ ok: false, error: verified.reason }, { status: 401 });

  const payload = JSON.parse(rawBody || "{}") as Record<string, unknown>;
  const event = await createEvent(context.env.DB, {
    organization_id: "org_adga_primary",
    event_type: `whop.${String(payload.type || "event")}`,
    actor_type: "webhook",
    actor_id: "whop",
    resource_type: "subscription",
    resource_id: String(payload.id || ""),
    payload,
  });

  return json({ ok: true, event_id: event.id });
}
