import { errorJson, json, readJson } from "@/lib/server/http";
import { createEvent } from "@/lib/server/repository";
import { getRuntimeContext, requireAdmin } from "@/lib/server/runtime";

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  requireAdmin(context);
  const body = await readJson<{
    event_type?: string;
    actor_type?: "user" | "agent" | "system" | "webhook" | "cron";
    actor_id?: string;
    resource_type?: string;
    resource_id?: string;
    payload?: Record<string, unknown>;
  }>(request);

  if (!body.event_type) return errorJson("event_type is required.");

  const event = await createEvent(context.env.DB, {
    organization_id: "org_adga_primary",
    event_type: body.event_type,
    actor_type: body.actor_type || "user",
    actor_id: body.actor_id || context.user.email,
    resource_type: body.resource_type || null,
    resource_id: body.resource_id || null,
    payload: body.payload || {},
  });

  return json({ ok: true, event });
}
