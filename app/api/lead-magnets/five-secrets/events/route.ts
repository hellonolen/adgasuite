import { json, readJson } from "@/lib/server/http";
import { createEvent } from "@/lib/server/repository";
import { getRuntimeContext } from "@/lib/server/runtime";

type FiveSecretsEventBody = {
  event_type?: string;
  session_id?: string | null;
  source_path?: string;
  payload?: Record<string, unknown>;
};

const allowedEvents = new Set([
  "lead_magnet.five_secrets.landed",
  "lead_magnet.five_secrets.optin_clicked",
  "lead_magnet.five_secrets.optin_succeeded",
  "lead_magnet.five_secrets.optin_failed",
  "lead_magnet.five_secrets.access_viewed",
  "lead_magnet.five_secrets.secret_viewed",
  "lead_magnet.five_secrets.scroll_depth",
]);

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  const body = await readJson<FiveSecretsEventBody>(request);
  const eventType = body.event_type && allowedEvents.has(body.event_type)
    ? body.event_type
    : "lead_magnet.five_secrets.landed";

  const event = await createEvent(context.env.DB, {
    organization_id: "org_adga_primary",
    event_type: eventType,
    actor_type: "system",
    actor_id: "five-secrets-funnel",
    resource_type: "lead_magnet",
    resource_id: body.session_id || "five-secrets",
    payload: {
      lead_magnet: "five-secrets",
      session_id: body.session_id || null,
      source_path: body.source_path || "/5-secrets",
      referrer: request.headers.get("referer"),
      user_agent: request.headers.get("user-agent"),
      ...(body.payload || {}),
    },
  });

  return json({ ok: true, event });
}
