-- Migration 0014 — event bus delivery tracking
--
-- Adds per-event metadata so the bus can:
--   - retry failed handler dispatches with backoff (delivery_attempts)
--   - surface dead-lettered events to the operator (last_error)
--   - replay events across the timeline by cursor (id is monotonic in insert order)
--
-- The events table stays append-only. These columns describe DELIVERY state, not the event
-- payload itself. Updates here do not violate audit immutability — the original event_type,
-- actor, resource, and payload are never mutated.

ALTER TABLE events ADD COLUMN delivery_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN last_error TEXT;
ALTER TABLE events ADD COLUMN last_attempted_at TEXT;

-- Index for replay-by-cursor scans (events.created_at is the natural cursor; index by
-- (organization_id, created_at, id) so the replay endpoint can stream efficiently).
CREATE INDEX IF NOT EXISTS idx_events_replay ON events(organization_id, created_at, id);

-- Dead-letter queue. Events whose handlers exceed the retry budget land here for manual
-- review. The original event row stays intact in `events` — this is a lightweight pointer
-- table so the operator surface can list them without scanning the full event log.
CREATE TABLE IF NOT EXISTS event_dead_letter (
  event_id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  last_error TEXT,
  parked_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE INDEX IF NOT EXISTS idx_event_dead_letter_org ON event_dead_letter(organization_id, parked_at);
