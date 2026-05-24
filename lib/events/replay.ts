/**
 * Event replay + dead-letter operations.
 *
 * The events table is the immutable audit log; this module reads from it. Replay is the
 * recovery surface — if a handler subscriber missed an event (deploy gap, crash, network
 * partition), the operator (or the Conductor agent) can replay a range to bring the system
 * back to a consistent state.
 *
 * Delivery tracking columns added in migration 0014:
 *   - delivery_attempts: incremented every time a handler is dispatched
 *   - last_error:        last exception message a handler raised
 *   - last_attempted_at: ISO timestamp of last dispatch attempt
 *
 * Events whose attempts exceed REPLAY_RETRY_BUDGET are parked in event_dead_letter.
 */

import type { DomainEvent } from "./types";

export const REPLAY_RETRY_BUDGET = 5;
export const REPLAY_PAGE_SIZE = 200;

export interface ReplayCursor {
  /** Replay events created AFTER this ISO timestamp. */
  from?: string;
  /** Replay events created AT-OR-BEFORE this ISO timestamp. */
  to?: string;
  /** Optional event_type filter (e.g. only replay "deal.stage_changed"). */
  eventType?: string;
  /** Optional organization filter. Defaults to all. */
  organizationId?: string;
  /** Max events returned. Caps at REPLAY_PAGE_SIZE. */
  limit?: number;
}

export interface ReplayedEvent {
  id: string;
  organization_id: string;
  event_type: string;
  actor_type: string;
  actor_id: string | null;
  resource_type: string | null;
  resource_id: string | null;
  created_at: string;
  payload: Record<string, unknown>;
  delivery_attempts: number;
  last_error: string | null;
  last_attempted_at: string | null;
}

interface RawEventRow {
  id: string;
  organization_id: string;
  event_type: string;
  actor_type: string;
  actor_id: string | null;
  resource_type: string | null;
  resource_id: string | null;
  payload_json: string;
  created_at: string;
  delivery_attempts: number | null;
  last_error: string | null;
  last_attempted_at: string | null;
}

function mapRow(row: RawEventRow): ReplayedEvent {
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(row.payload_json) as Record<string, unknown>;
  } catch {
    payload = {};
  }
  return {
    id: row.id,
    organization_id: row.organization_id,
    event_type: row.event_type,
    actor_type: row.actor_type,
    actor_id: row.actor_id,
    resource_type: row.resource_type,
    resource_id: row.resource_id,
    created_at: row.created_at,
    payload,
    delivery_attempts: row.delivery_attempts ?? 0,
    last_error: row.last_error,
    last_attempted_at: row.last_attempted_at,
  };
}

/** Fetch a window of events for replay. Newest-first by default. */
export async function fetchEventsForReplay(
  db: D1Database | undefined,
  cursor: ReplayCursor = {},
): Promise<ReplayedEvent[]> {
  if (!db) return [];

  const limit = Math.min(cursor.limit ?? REPLAY_PAGE_SIZE, REPLAY_PAGE_SIZE);
  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (cursor.organizationId) {
    conditions.push("organization_id = ?");
    bindings.push(cursor.organizationId);
  }
  if (cursor.from) {
    conditions.push("created_at > ?");
    bindings.push(cursor.from);
  }
  if (cursor.to) {
    conditions.push("created_at <= ?");
    bindings.push(cursor.to);
  }
  if (cursor.eventType) {
    conditions.push("event_type = ?");
    bindings.push(cursor.eventType);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT id, organization_id, event_type, actor_type, actor_id, resource_type, resource_id, payload_json, created_at, delivery_attempts, last_error, last_attempted_at
               FROM events ${where}
               ORDER BY created_at ASC, id ASC
               LIMIT ?`;

  const stmt = db.prepare(sql).bind(...bindings, limit);
  const result = await stmt.all<RawEventRow>().catch(() => ({ results: [] as RawEventRow[] }));
  return (result.results || []).map(mapRow);
}

export async function fetchEventForReplayById(
  db: D1Database | undefined,
  eventId: string,
  organizationId?: string,
): Promise<ReplayedEvent | null> {
  if (!db) return null;
  const sql = organizationId
    ? `SELECT id, organization_id, event_type, actor_type, actor_id, resource_type, resource_id, payload_json, created_at, delivery_attempts, last_error, last_attempted_at
       FROM events
       WHERE id = ? AND organization_id = ?
       LIMIT 1`
    : `SELECT id, organization_id, event_type, actor_type, actor_id, resource_type, resource_id, payload_json, created_at, delivery_attempts, last_error, last_attempted_at
       FROM events
       WHERE id = ?
       LIMIT 1`;
  const stmt = organizationId ? db.prepare(sql).bind(eventId, organizationId) : db.prepare(sql).bind(eventId);
  const row = await stmt.first<RawEventRow>().catch(() => null);
  return row ? mapRow(row) : null;
}

/** Record a delivery attempt outcome (success increments without setting error). */
export async function recordDeliveryAttempt(
  db: D1Database | undefined,
  eventId: string,
  error: string | null = null,
): Promise<void> {
  if (!db) return;
  await db
    .prepare(
      `UPDATE events
       SET delivery_attempts = COALESCE(delivery_attempts, 0) + 1,
           last_error = ?,
           last_attempted_at = datetime('now')
       WHERE id = ?`,
    )
    .bind(error, eventId)
    .run()
    .catch(() => undefined);
}

/** Park an event in the dead-letter table after it exhausts the retry budget. */
export async function parkDeadLetter(
  db: D1Database | undefined,
  event: ReplayedEvent,
): Promise<void> {
  if (!db) return;
  await db
    .prepare(
      `INSERT INTO event_dead_letter (event_id, organization_id, event_type, attempts, last_error)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(event_id) DO UPDATE SET attempts = excluded.attempts, last_error = excluded.last_error`,
    )
    .bind(event.id, event.organization_id, event.event_type, event.delivery_attempts, event.last_error)
    .run()
    .catch(() => undefined);
}

/** List parked dead-letter events for operator review. */
export async function listDeadLetters(db: D1Database | undefined, organizationId?: string) {
  if (!db) return [];
  const sql = organizationId
    ? "SELECT * FROM event_dead_letter WHERE organization_id = ? AND resolved_at IS NULL ORDER BY parked_at DESC LIMIT 100"
    : "SELECT * FROM event_dead_letter WHERE resolved_at IS NULL ORDER BY parked_at DESC LIMIT 100";
  const stmt = organizationId ? db.prepare(sql).bind(organizationId) : db.prepare(sql);
  const result = await stmt.all().catch(() => ({ results: [] }));
  return result.results || [];
}

/** Resolve a parked event (operator manually replayed / decided it's not actionable). */
export async function resolveDeadLetter(db: D1Database | undefined, eventId: string): Promise<void> {
  if (!db) return;
  await db
    .prepare("UPDATE event_dead_letter SET resolved_at = datetime('now') WHERE event_id = ?")
    .bind(eventId)
    .run()
    .catch(() => undefined);
}
