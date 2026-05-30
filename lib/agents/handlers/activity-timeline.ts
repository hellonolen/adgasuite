// Intelligence handler: skills/activity-timeline.skill.md
//
// Read-only adapter over the `events` table — turns the raw append-only event
// log into a paginated, human-readable timeline for any record surface
// (contact / lead / deal / organization / workspace).
//
// Pagination uses an opaque base64 cursor that encodes the (occurred_at, id)
// of the last item on the previous page. This keeps deep paging O(log n) by
// leveraging the (organization_id, created_at, id) index.
//
// On each successful read this handler publishes a `timeline.viewed` event so
// the bus has the audit trail of who looked at what.

import { publish } from "@/lib/events/bus";
import type { SkillContext } from "@/lib/agents/skill-registry";

export type TimelineResourceType = "contact" | "lead" | "deal" | "organization" | "workspace";

export interface TimelineFilters {
  since: string | null;
  until: string | null;
  event_types: string[] | null;
  actor_type: "user" | "agent" | null;
  limit: number;
  cursor: string | null;
}

export interface ActivityTimelineInput {
  resource_type: TimelineResourceType;
  resource_id: string;
  filters?: TimelineFilters;
}

export interface TimelineItem {
  id: string;
  event_type: string;
  actor_type: string;
  actor_id: string;
  occurred_at: string;
  summary: string;
  payload: Record<string, unknown>;
}

export interface ActivityTimelineOutput {
  items: TimelineItem[];
  next_cursor: string | null;
}

interface EventRow {
  id: string;
  event_type: string;
  actor_type: string;
  actor_id: string | null;
  occurred_at: string;
  payload_json: string;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const VALID_RESOURCE_TYPES: ReadonlySet<TimelineResourceType> = new Set([
  "contact",
  "lead",
  "deal",
  "organization",
  "workspace",
]);

// ─── Cursor helpers ────────────────────────────────────────────────────────────
// Cursor format: base64(`${occurred_at}|${id}`). Opaque to callers.

function encodeCursor(occurredAt: string, id: string): string {
  return btoa(`${occurredAt}|${id}`);
}

interface DecodedCursor {
  occurred_at: string;
  id: string;
}

function decodeCursor(cursor: string | null | undefined): DecodedCursor | null {
  if (!cursor) return null;
  try {
    const decoded = atob(cursor);
    const sep = decoded.lastIndexOf("|");
    if (sep <= 0 || sep === decoded.length - 1) return null;
    return { occurred_at: decoded.slice(0, sep), id: decoded.slice(sep + 1) };
  } catch {
    return null;
  }
}

// ─── Summary formatters ────────────────────────────────────────────────────────
// One row per event_type per the table in skills/activity-timeline.skill.md.
// Unmapped event_types fall back to `"${actor_type} · ${event_type}"`.

type SummaryFormatter = (payload: Record<string, unknown>, row: EventRow) => string;

function payloadString(payload: Record<string, unknown>, key: string, fallback = ""): string {
  const value = payload[key];
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function payloadNumber(payload: Record<string, unknown>, key: string, fallback = 0): number {
  const value = payload[key];
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function formatCents(cents: number): string {
  if (!Number.isFinite(cents) || cents <= 0) return "$0";
  const dollars = cents / 100;
  return `$${dollars.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

const FORMATTERS: Record<string, SummaryFormatter> = {
  "deal.created": () => "Deal created",
  "deal.stage_changed": (payload) => {
    const from = payloadString(payload, "from", "?");
    const to = payloadString(payload, "to", "?");
    return `Stage moved ${from} → ${to}`;
  },
  "deal.won": (payload) => {
    const amount = payloadNumber(payload, "value_cents", 0);
    return `Deal won — ${formatCents(amount)}`;
  },
  "deal.lost": (payload) => {
    const reason = payloadString(payload, "reason", "no reason given");
    return `Deal lost — ${reason}`;
  },
  "agent_approval.requested": (payload) => {
    const agent = payloadString(payload, "agent", "Agent");
    const title = payloadString(payload, "title", "approval");
    return `${agent} requested approval: ${title}`;
  },
  "agent_approval.approved": (payload, row) => {
    const actor = row.actor_id || payloadString(payload, "agent", "Someone");
    const title = payloadString(payload, "title", "approval");
    return `${actor} approved: ${title}`;
  },
  "agent_approval.rejected": (payload, row) => {
    const actor = row.actor_id || payloadString(payload, "agent", "Someone");
    const title = payloadString(payload, "title", "approval");
    return `${actor} rejected: ${title}`;
  },
  "lead.captured": (payload) => {
    const source = payloadString(payload, "source", "unknown");
    return `Lead captured from ${source}`;
  },
  "lead.qualified": (payload) => {
    const score = payloadNumber(payload, "score", 0);
    return `Lead qualified — score ${score}`;
  },
  "team.invite.accepted": (payload) => {
    const email = payloadString(payload, "invitee_email", "Someone");
    return `${email} joined the workspace`;
  },
  "import.completed": (payload) => {
    const succeeded = payloadNumber(payload, "rows_succeeded", 0);
    const total = payloadNumber(payload, "rows_total", 0);
    const target = payloadString(payload, "target_type", "records");
    return `Imported ${succeeded} of ${total} ${target}`;
  },
  "voice_note.created": (payload) => {
    const wordCount = payloadNumber(payload, "word_count", 0);
    return `Voice note added — ${wordCount} words`;
  },
};

function summaryFor(row: EventRow, payload: Record<string, unknown>): string {
  const formatter = FORMATTERS[row.event_type];
  if (formatter) return formatter(payload, row);
  return `${row.actor_type} · ${row.event_type}`;
}

function parsePayload(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

// ─── Handler ───────────────────────────────────────────────────────────────────

export async function activityTimelineHandler(
  context: SkillContext,
  input: ActivityTimelineInput,
): Promise<ActivityTimelineOutput> {
  const db = context.env.DB;
  if (!db) {
    return { items: [], next_cursor: null };
  }

  if (!VALID_RESOURCE_TYPES.has(input.resource_type)) {
    throw new Error(`Invalid resource_type: ${input.resource_type}`);
  }
  const resourceId = (input.resource_id || "").trim();
  if (!resourceId) throw new Error("resource_id is required.");

  const filters: TimelineFilters = {
    since: input.filters?.since ?? null,
    until: input.filters?.until ?? null,
    event_types: input.filters?.event_types ?? null,
    actor_type: input.filters?.actor_type ?? null,
    limit: input.filters?.limit ?? DEFAULT_LIMIT,
    cursor: input.filters?.cursor ?? null,
  };

  // Clamp limit and fetch one extra to detect a next page.
  const safeLimit = Math.max(1, Math.min(MAX_LIMIT, Math.floor(filters.limit) || DEFAULT_LIMIT));
  const fetchLimit = safeLimit + 1;

  // Determine the upper bound on occurred_at. Cursor wins over `until` so the
  // page boundary is stable even if the caller also supplies `until`.
  const decodedCursor = decodeCursor(filters.cursor);
  const upperBound = decodedCursor?.occurred_at || filters.until || new Date().toISOString();

  // Build WHERE clauses. We always anchor by (organization_id, resource_type, resource_id).
  const where: string[] = [
    "organization_id = ?",
    "resource_type = ?",
    "resource_id = ?",
    "created_at <= ?",
  ];
  const binds: Array<string | number> = [
    context.organization_id,
    input.resource_type,
    resourceId,
    upperBound,
  ];

  // Tie-breaker: when paging with a cursor, exclude the row at the exact
  // (occurred_at, id) boundary so we don't return duplicates.
  if (decodedCursor) {
    where.push("(created_at < ? OR (created_at = ? AND id < ?))");
    binds.push(decodedCursor.occurred_at, decodedCursor.occurred_at, decodedCursor.id);
  }

  if (filters.since) {
    where.push("created_at >= ?");
    binds.push(filters.since);
  }
  if (filters.actor_type) {
    where.push("actor_type = ?");
    binds.push(filters.actor_type);
  }
  if (filters.event_types && filters.event_types.length > 0) {
    const placeholders = filters.event_types.map(() => "?").join(", ");
    where.push(`event_type IN (${placeholders})`);
    for (const type of filters.event_types) binds.push(type);
  }

  const sql = `SELECT id,
                      event_type,
                      actor_type,
                      actor_id,
                      created_at AS occurred_at,
                      payload_json
                 FROM events
                WHERE ${where.join(" AND ")}
                ORDER BY created_at DESC, id DESC
                LIMIT ?`;
  binds.push(fetchLimit);

  const result = await db
    .prepare(sql)
    .bind(...binds)
    .all<EventRow>()
    .catch(() => ({ results: [] as EventRow[] }));
  const rows = result.results || [];

  const hasMore = rows.length > safeLimit;
  const pageRows = hasMore ? rows.slice(0, safeLimit) : rows;

  const items: TimelineItem[] = pageRows.map((row) => {
    const payload = parsePayload(row.payload_json);
    return {
      id: row.id,
      event_type: row.event_type,
      actor_type: row.actor_type,
      actor_id: row.actor_id || "",
      occurred_at: row.occurred_at,
      summary: summaryFor(row, payload),
      payload,
    };
  });

  const nextCursor = hasMore && pageRows.length > 0
    ? encodeCursor(pageRows[pageRows.length - 1].occurred_at, pageRows[pageRows.length - 1].id)
    : null;

  await publish(db, {
    organization_id: context.organization_id,
    event_type: "timeline.viewed",
    actor_type: context.actor_type,
    actor_id: context.actor_id,
    resource_type: input.resource_type,
    resource_id: resourceId,
    payload: {
      resource_type: input.resource_type,
      resource_id: resourceId,
      items_returned: items.length,
    },
  }).catch(() => null);

  return { items, next_cursor: nextCursor };
}
