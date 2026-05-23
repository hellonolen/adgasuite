import { errorJson, json, readJson } from "@/lib/server/http";
import { createEvent } from "@/lib/server/repository";
import { getRuntimeContext, requireAdmin } from "@/lib/server/runtime";

// IMMUTABLE AUDIT LOG — this route only appends. Never add PATCH/PUT/DELETE handlers here.
// The events table is the immutable audit trail surfaced under Enterprise pricing; any future
// mutation path would break that contract. State changes belong on the resource tables (deals,
// agent_jobs, agent_approvals) which always emit a forward-only event recording the transition.

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
