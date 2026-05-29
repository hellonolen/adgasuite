// /api/events/stream — server→client event streaming.
// Closes GAP #6: workspaces can react to agent activity in real time by
// polling this endpoint with a "since" cursor (ISO timestamp). Returns
// events the org owns, in order, with the new cursor to use on the next poll.
//
// SSE was considered. Cloudflare Workers + OpenNext support streaming, but
// long-held connections cost more than short polls at our current volume.
// useSuiteEvent on the client will poll this every 10s when the tab is focused.

import { json, errorJson } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { organizationIdForSession } from "@/lib/server/tenant";

export const dynamic = "force-dynamic";

interface EventRow {
  id: string;
  event_type: string;
  actor_type: string;
  actor_id: string | null;
  resource_type: string | null;
  resource_id: string | null;
  payload_json: string;
  created_at: string;
}

const MAX_BATCH = 100;

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));
  if (!sessionUser && !context.user.isLocalAdminBypass) {
    return errorJson("Authentication required.", 401);
  }
  if (!context.env.DB) {
    return json({ ok: true, events: [], cursor: new Date().toISOString() });
  }

  const organizationId = organizationIdForSession(sessionUser);
  const url = new URL(request.url);
  const sinceRaw = url.searchParams.get("since");
  const eventType = url.searchParams.get("event_type");
  const limit = Math.min(MAX_BATCH, Math.max(1, Number(url.searchParams.get("limit") || "50")));

  // Default to "10 seconds ago" so first-call clients still see recent activity
  // without flooding them with the entire event history.
  const since = sinceRaw && !Number.isNaN(Date.parse(sinceRaw))
    ? new Date(sinceRaw).toISOString()
    : new Date(Date.now() - 10_000).toISOString();

  const query = eventType
    ? `SELECT id, event_type, actor_type, actor_id, resource_type, resource_id, payload_json, created_at
         FROM events
        WHERE organization_id = ?
          AND created_at > ?
          AND event_type = ?
        ORDER BY created_at ASC
        LIMIT ?`
    : `SELECT id, event_type, actor_type, actor_id, resource_type, resource_id, payload_json, created_at
         FROM events
        WHERE organization_id = ?
          AND created_at > ?
        ORDER BY created_at ASC
        LIMIT ?`;

  const params = eventType
    ? [organizationId, since, eventType, limit]
    : [organizationId, since, limit];

  const result = await context.env.DB
    .prepare(query)
    .bind(...params)
    .all<EventRow>()
    .catch(() => ({ results: [] as EventRow[] }));

  const rows = result.results || [];
  const events = rows.map((row) => {
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(row.payload_json || "{}");
    } catch {
      payload = {};
    }
    return {
      id: row.id,
      event_type: row.event_type,
      actor_type: row.actor_type,
      actor_id: row.actor_id,
      resource_type: row.resource_type,
      resource_id: row.resource_id,
      payload,
      created_at: row.created_at,
    };
  });

  const cursor = events.length > 0
    ? events[events.length - 1].created_at
    : since;

  return json({
    ok: true,
    events,
    cursor,
    has_more: events.length === limit,
  });
}
