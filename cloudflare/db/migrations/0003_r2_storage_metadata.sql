CREATE TABLE IF NOT EXISTS storage_objects (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  bucket TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  sha256 TEXT,
  category TEXT NOT NULL DEFAULT 'upload',
  resource_type TEXT,
  resource_id TEXT,
  visibility TEXT NOT NULL DEFAULT 'workspace',
  created_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_storage_objects_org_created ON storage_objects (organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_storage_objects_resource ON storage_objects (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_storage_objects_category ON storage_objects (organization_id, category);

CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  storage_object_id TEXT NOT NULL,
  version_label TEXT NOT NULL DEFAULT 'v1',
  created_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (storage_object_id) REFERENCES storage_objects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_document_versions_document ON document_versions (document_id, created_at);
