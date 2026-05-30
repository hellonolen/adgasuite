-- 0025 — Import wedge: batch lifecycle + per-row dead-letter.
-- Materializes cloudflare/state/import-batch.schema.json and import-row.schema.json.

CREATE TABLE IF NOT EXISTS import_batches (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_file_url TEXT,
  source_reference TEXT,
  target_type TEXT NOT NULL,
  field_mapping_json TEXT NOT NULL DEFAULT '{}',
  dedupe_strategy TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL DEFAULT 'queued',
  rows_total INTEGER NOT NULL DEFAULT 0,
  rows_succeeded INTEGER NOT NULL DEFAULT 0,
  rows_failed INTEGER NOT NULL DEFAULT 0,
  failure_summary_json TEXT NOT NULL DEFAULT '{}',
  size_bytes INTEGER,
  duration_ms INTEGER,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  error TEXT,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_import_batches_org_started   ON import_batches (organization_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_batches_org_status    ON import_batches (organization_id, status);

CREATE TABLE IF NOT EXISTS import_batch_rows (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  row_number INTEGER NOT NULL,
  status TEXT NOT NULL,
  raw_data_json TEXT NOT NULL DEFAULT '{}',
  mapped_data_json TEXT,
  target_record_id TEXT,
  target_record_type TEXT,
  dedupe_match TEXT,
  failure_reason TEXT,
  failure_detail TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (batch_id) REFERENCES import_batches(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_import_batch_rows_batch       ON import_batch_rows (batch_id, status);
CREATE INDEX IF NOT EXISTS idx_import_batch_rows_org_failed  ON import_batch_rows (organization_id, status) WHERE status = 'failed';
