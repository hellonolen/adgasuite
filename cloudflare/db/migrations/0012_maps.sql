CREATE TABLE IF NOT EXISTS maps (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  deal_id TEXT,
  template TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_maps_org ON maps(organization_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_maps_deal ON maps(deal_id);

CREATE TABLE IF NOT EXISTS map_nodes (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  sublabel TEXT,
  status TEXT,
  position_x REAL NOT NULL,
  position_y REAL NOT NULL,
  data_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_map_nodes_map ON map_nodes(map_id);

CREATE TABLE IF NOT EXISTS map_edges (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  label TEXT,
  style TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_map_edges_map ON map_edges(map_id);
