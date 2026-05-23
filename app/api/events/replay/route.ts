import { errorJson, json } from "@/lib/server/http";
import { getRuntimeContext, requireAdmin } from "@/lib/server/runtime";
import { fetchEventsForReplay, listDeadLetters, REPLAY_PAGE_SIZE } from "@/lib/events/replay";

/**
 * Event replay surface — admin-only. Three query modes:
 *
 *   GET /api/events/replay                                  → most recent 200 events
 *   GET /api/events/replay?from=ISO&to=ISO&event_type=X     → windowed replay (typed)
 *   GET /api/events/replay?dead_letter=1                    → parked events for review
 *
 * The handler does NOT re-dispatch events to subscribers. That decision belongs to the
 * Conductor agent or an explicit operator action (POST endpoint coming in follow-up).
 * Read-only by design — the audit log stays immutable.
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
