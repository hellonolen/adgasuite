-- 0029 — Custom objects: user-defined record types beyond the built-in
-- contacts / leads / deals / organizations.
--
-- Materializes cloudflare/state/custom-object.schema.json. Each row in
-- `custom_objects` is the metadata for a workspace-defined record type
-- (e.g. "Property" for a real-estate workspace, "Investor" for a capital-
-- raise workspace).
--
-- v1 trade-off — generic records table instead of per-slug DDL:
--   The contract documents `custom_obj_<slug>` as the materialized table
--   per object. D1 does not allow safe runtime DDL from a multi-tenant
--   Worker (CREATE TABLE permissions, schema drift, no rollback). v1
--   stores records in a single `custom_object_records` table with a
--   `data_json` blob keyed by `custom_object_id`. Query path filters on
--   custom_object_id + organization_id; field-level indexing waits for
--   v2 with a generated-columns or sidecar index strategy.

CREATE TABLE IF NOT EXISTS custom_objects (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  name_singular TEXT NOT NULL,
  name_plural TEXT NOT NULL,
  icon TEXT,
  fields_json TEXT NOT NULL DEFAULT '[]',
  visibility TEXT NOT NULL DEFAULT 'private',
  archived_at TEXT,
  record_count_cache INTEGER,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Slug uniqueness per organization. Two different workspaces can both
-- define "property" — same slug, different org.
CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_objects_org_slug
  ON custom_objects (organization_id, slug);

-- Sidebar / list queries filter to non-archived first.
CREATE INDEX IF NOT EXISTS idx_custom_objects_org_archived
  ON custom_objects (organization_id, archived_at);

-- Generic record store (v1). One row per record across all custom objects.
CREATE TABLE IF NOT EXISTS custom_object_records (
  id TEXT PRIMARY KEY,
  custom_object_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  data_json TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (custom_object_id) REFERENCES custom_objects(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_custom_object_records_org_object
  ON custom_object_records (organization_id, custom_object_id);

CREATE INDEX IF NOT EXISTS idx_custom_object_records_object_created
  ON custom_object_records (custom_object_id, created_at DESC);
