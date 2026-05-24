import { json } from "@/lib/server/http";
import { getRuntimeContext, requireAdmin } from "@/lib/server/runtime";

const EVENT_PREFIX = "lead_magnet.five_secrets.";

type CountRow = { event_type: string; count: number };
type DepthRow = { depth: number | null; count: number };

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  requireAdmin(context);

  const db = context.env.DB;
  if (!db) {
    return json({
      ok: true,
      counts: {},
      scroll_depths: [],
      recent: [],
      storage: "D1 event metadata",
    });
  }

  const countsResult = await db
    .prepare(
      `SELECT event_type, COUNT(*) AS count
       FROM events
       WHERE event_type LIKE ?
       GROUP BY event_type
       ORDER BY event_type ASC`,
    )
    .bind(`${EVENT_PREFIX}%`)
    .all<CountRow>();

  const depthResult = await db
    .prepare(
      `SELECT json_extract(payload_json, '$.depth') AS depth, COUNT(*) AS count
       FROM events
       WHERE event_type = 'lead_magnet.five_secrets.scroll_depth'
       GROUP BY depth
       ORDER BY depth ASC`,
    )
    .all<DepthRow>()
    .catch(() => ({ results: [] as DepthRow[] }));

  const recentResult = await db
    .prepare(
      `SELECT id, event_type, resource_id, payload_json, created_at
       FROM events
       WHERE event_type LIKE ?
       ORDER BY created_at DESC
       LIMIT 50`,
    )
    .bind(`${EVENT_PREFIX}%`)
    .all<Record<string, unknown>>();

  const counts = Object.fromEntries(
    (countsResult.results || []).map((row) => [row.event_type.replace(EVENT_PREFIX, ""), Number(row.count || 0)]),
  );

  const recent = (recentResult.results || []).map((row) => ({
    id: row.id,
    event_type: String(row.event_type || ""),
    session_id: row.resource_id || null,
    created_at: row.created_at,
    payload: parsePayload(row.payload_json),
  }));

  return json({
    ok: true,
    counts,
    scroll_depths: (depthResult.results || []).map((row) => ({
      depth: Number(row.depth || 0),
      count: Number(row.count || 0),
    })),
    recent,
    storage: "D1 event metadata",
  });
}

function parsePayload(value: unknown) {
  if (typeof value !== "string") return {};
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}
