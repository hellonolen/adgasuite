import { json, readJson } from "@/lib/server/http";
import { createEvent } from "@/lib/server/repository";
import { getRuntimeContext } from "@/lib/server/runtime";

type AdpFunnelEventBody = {
  event_type?: string;
  lead_id?: string | null;
  session_id?: string | null;
  affiliate_code?: string;
  affiliate_url?: string;
  source_path?: string;
  payload?: Record<string, unknown>;
};

const ADP_AFFILIATE_CODE = "PW56143";
const ADP_REFERRAL_LINK = "https://info.adp.com/referral-hub?loid=&adp_pc=PW56143";

const allowedEvents = new Set([
  "partner_referral.form_landed",
  "partner_referral.form_engaged",
  "partner_referral.form_abandoned",
  "partner_referral.submit_clicked",
  "partner_referral.submit_succeeded",
  "partner_referral.submit_failed",
]);

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  const body = await readJson<AdpFunnelEventBody>(request);
  const eventType = body.event_type && allowedEvents.has(body.event_type)
    ? body.event_type
    : "partner_referral.form_engaged";

  const event = await createEvent(context.env.DB, {
    organization_id: "org_adga_primary",
    event_type: eventType,
    actor_type: "system",
    actor_id: "adp-page",
    resource_type: body.lead_id ? "partner_referral_lead" : "partner_referral_funnel",
    resource_id: body.lead_id || body.session_id || null,
    payload: {
      partner_slug: "adp",
      affiliate_code: body.affiliate_code || ADP_AFFILIATE_CODE,
      affiliate_url: body.affiliate_url || ADP_REFERRAL_LINK,
      session_id: body.session_id || null,
      source_path: body.source_path || "/adp",
      referrer: request.headers.get("referer"),
      user_agent: request.headers.get("user-agent"),
      ...(body.payload || {}),
    },
  });

  return json({ ok: true, event });
}
