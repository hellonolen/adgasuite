-- Migration 0026 — import_enrichments table.
--
-- Tracks each post-import enrichment run for an ImportBatch. One row per
-- (batch_id, content_hash) pair so re-running enrichment on a batch whose
-- imported rows haven't changed is a no-op (idempotency contract from
-- skills/import-enrichment.skill.md).
--
-- import_batches itself may not exist yet (csv-import handler still stub);
-- this table intentionally does NOT declare a foreign key to it so the
-- migration applies cleanly regardless of order.

CREATE TABLE IF NOT EXISTS import_enrichments (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  operations_json TEXT NOT NULL,
  operations_applied_json TEXT NOT NULL,
  skipped_operations_json TEXT NOT NULL DEFAULT '[]',
  duration_ms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  error TEXT,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_import_enrichments_batch_hash
  ON import_enrichments (batch_id, content_hash);

CREATE INDEX IF NOT EXISTS idx_import_enrichments_org_created
  ON import_enrichments (organization_id, created_at);
