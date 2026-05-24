import { createEvent } from "@/lib/server/repository";
import { getRuntimeContext } from "@/lib/server/runtime";

const ADP_AFFILIATE_CODE = "PW56143";
const ADP_REFERRAL_LINK = "https://info.adp.com/referral-hub?loid=&adp_pc=PW56143";
const TRANSPARENT_GIF = Uint8Array.from([
  71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 255, 255, 255, 0, 0, 0, 33,
  249, 4, 1, 0, 0, 0, 0, 44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 68, 1, 0, 59,
]);

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  const url = new URL(request.url);
  const leadId = url.searchParams.get("lead");

  await createEvent(context.env.DB, {
    organization_id: "org_adga_primary",
    event_type: "partner_referral.email_opened",
    actor_type: "system",
    actor_id: "adp-email",
    resource_type: leadId ? "partner_referral_lead" : "partner_referral_email",
    resource_id: leadId || null,
    payload: {
      partner_slug: "adp",
      affiliate_code: url.searchParams.get("partner") || ADP_AFFILIATE_CODE,
      affiliate_url: ADP_REFERRAL_LINK,
      referrer: request.headers.get("referer"),
      user_agent: request.headers.get("user-agent"),
    },
  });

  return new Response(TRANSPARENT_GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
