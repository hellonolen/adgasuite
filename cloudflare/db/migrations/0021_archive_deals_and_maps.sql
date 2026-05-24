ALTER TABLE deals ADD COLUMN archived_at TEXT;
ALTER TABLE maps ADD COLUMN archived_at TEXT;

CREATE INDEX IF NOT EXISTS idx_deals_org_archive ON deals (organization_id, archived_at, updated_at);
CREATE INDEX IF NOT EXISTS idx_maps_org_archive ON maps (organization_id, archived_at, updated_at);
