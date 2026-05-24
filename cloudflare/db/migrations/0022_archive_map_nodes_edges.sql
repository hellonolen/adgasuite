ALTER TABLE map_nodes ADD COLUMN archived_at TEXT;
ALTER TABLE map_edges ADD COLUMN archived_at TEXT;

CREATE INDEX IF NOT EXISTS idx_map_nodes_archive ON map_nodes (map_id, archived_at);
CREATE INDEX IF NOT EXISTS idx_map_edges_archive ON map_edges (map_id, archived_at);
