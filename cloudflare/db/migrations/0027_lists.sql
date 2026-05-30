-- 0027 — List segments: saved filtered views over any record type.
-- Materializes cloudflare/state/list.schema.json. Resolved live at query time —
-- the lists table stores the (target_type, filter-tree, sort, visibility) record;
-- no materialized cache, no invalidation. Drives the /suite/lists workspace and
-- the Intelligence agent's cohort tracker.

CREATE TABLE IF NOT EXISTS lists (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_type TEXT NOT NULL,
  filters_json TEXT NOT NULL DEFAULT '[]',
  sort_json TEXT,
  visibility TEXT NOT NULL DEFAULT 'private',
  pinned INTEGER NOT NULL DEFAULT 0,
  cohort_tracking_json TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lists_org_target ON lists (organization_id, target_type);
CREATE INDEX IF NOT EXISTS idx_lists_org_created ON lists (organization_id, created_at DESC);
