ALTER TABLE voice_calls ADD COLUMN payload_r2_key TEXT;
ALTER TABLE voice_calls ADD COLUMN storage_object_id TEXT;
CREATE INDEX IF NOT EXISTS idx_voice_calls_payload_storage ON voice_calls (organization_id, storage_object_id);
ALTER TABLE map_shares ADD COLUMN archived_at TEXT;

CREATE INDEX IF NOT EXISTS idx_map_shares_archive ON map_shares (map_id, archived_at, revoked_at);
