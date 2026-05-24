import { json, readJson } from "@/lib/server/http";
import { createEvent } from "@/lib/server/repository";
import { getRuntimeContext } from "@/lib/server/runtime";

type AdpThankYouBody = {
  affiliate_code?: string;
  affiliate_url?: string;
  lead_id?: string | null;
  source_path?: string;
};

const ADP_AFFILIATE_CODE = "PW56143";
const ADP_REFERRAL_LINK = "https://info.adp.com/referral-hub?loid=&adp_pc=PW56143";

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  const body = await readJson<AdpThankYouBody>(request);
  const event = await createEvent(context.env.DB, {
    organization_id: "org_adga_primary",
    event_type: "partner_referral.thank_you_viewed",
    actor_type: "system",
    actor_id: "adp-thank-you",
    resource_type: "partner_referral_lead",
    resource_id: body.lead_id || null,
    payload: {
      partner_slug: "adp",
      affiliate_code: body.affiliate_code || ADP_AFFILIATE_CODE,
      affiliate_url: body.affiliate_url || ADP_REFERRAL_LINK,
      source_path: body.source_path || "/adp/thank-you",
      referrer: request.headers.get("referer"),
      user_agent: request.headers.get("user-agent"),
    },
  });

  return json({ ok: true, event });
}
