import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext, requireAdmin } from "@/lib/server/runtime";
import { createEvent } from "@/lib/server/repository";
import {
  fetchEventsForReplay,
  fetchEventForReplayById,
  listDeadLetters,
  recordDeliveryAttempt,
  resolveDeadLetter,
  REPLAY_PAGE_SIZE,
} from "@/lib/events/replay";

/**
 * Event replay surface — admin-only. Three query modes:
 *
 *   GET /api/events/replay                                  → most recent 200 events
 *   GET /api/events/replay?from=ISO&to=ISO&event_type=X     → windowed replay (typed)
 *   GET /api/events/replay?dead_letter=1                    → parked events for review
 *
 * GET is read-only by design — the audit log stays immutable.
 */
export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  try {
    requireAdmin(context);
  } catch (response) {
    if (response instanceof Response) return response;
    return errorJson("Forbidden", 403);
  }

  const url = new URL(request.url);
  const deadLetterOnly = url.searchParams.get("dead_letter") === "1";

  if (deadLetterOnly) {
    const events = await listDeadLetters(context.env.DB);
    return json({ ok: true, mode: "dead_letter", events });
  }

  const cursor = {
    from: url.searchParams.get("from") || undefined,
    to: url.searchParams.get("to") || undefined,
    eventType: url.searchParams.get("event_type") || undefined,
    organizationId: url.searchParams.get("org") || undefined,
    limit: Number(url.searchParams.get("limit") || REPLAY_PAGE_SIZE),
  };

  const events = await fetchEventsForReplay(context.env.DB, cursor);
  return json({ ok: true, mode: "replay", cursor, count: events.length, events });
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  try {
    requireAdmin(context);
  } catch (response) {
    if (response instanceof Response) return response;
    return errorJson("Forbidden", 403);
  }

  const body = await readJson<{
    event_id?: string;
    from?: string;
    to?: string;
    event_type?: string;
    org?: string;
    limit?: number;
    resolve_dead_letter?: boolean;
  }>(request);

  const events = body.event_id
    ? [await fetchEventForReplayById(context.env.DB, body.event_id, body.org)].filter((event) => event !== null)
    : await fetchEventsForReplay(context.env.DB, {
        from: body.from,
        to: body.to,
        eventType: body.event_type,
        organizationId: body.org,
        limit: body.limit || REPLAY_PAGE_SIZE,
      });

  if (body.event_id && events.length === 0) return errorJson("Event not found.", 404);

  const replayed = [];
  for (const event of events) {
    const replayEvent = await createEvent(context.env.DB, {
      organization_id: event.organization_id,
      event_type: `${event.event_type}.replayed`,
      actor_type: "system",
      actor_id: context.user.email || "event-replay",
      resource_type: event.resource_type,
      resource_id: event.resource_id,
      payload: {
        replayed_event_id: event.id,
        original_event_type: event.event_type,
        original_created_at: event.created_at,
        original_payload: event.payload,
      },
    });
    await recordDeliveryAttempt(context.env.DB, event.id, null);
    if (body.resolve_dead_letter) await resolveDeadLetter(context.env.DB, event.id);
    replayed.push(replayEvent);
  }

  return json({ ok: true, replayed_count: replayed.length, replayed });
}
