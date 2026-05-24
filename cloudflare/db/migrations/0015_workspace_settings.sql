CREATE TABLE IF NOT EXISTS organization_settings (
  organization_id TEXT NOT NULL,
  panel TEXT NOT NULL,
  values_json TEXT NOT NULL DEFAULT '{}',
  updated_by TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (organization_id, panel),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_organization_settings_updated ON organization_settings(organization_id, updated_at);
