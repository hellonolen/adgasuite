-- Migration 0030 — record_comments: threaded comments + @mentions on any record.
--
-- Materializes cloudflare/state/record-comment.schema.json. Drives the
-- record-comment skill (lib/agents/handlers/record-comment.ts). Soft-delete
-- only; body and reactions are stored as JSON columns. Tenant-scoped via
-- organization_id (every read/write filters on it).
--
-- Threading:
--   parent_comment_id is a self-FK. Top-level comments have NULL parent.
--   Replies set parent_comment_id to a top-level comment id (one level of
--   nesting in v1 — UI flattens deeper threads).
--
-- Mentions + reactions live as JSON columns rather than join tables so the
-- entire comment fetches in one row (read-heavy surface).

CREATE TABLE IF NOT EXISTS record_comments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,                 -- contact | lead | deal | organization | custom_object
  resource_id TEXT NOT NULL,
  custom_object_slug TEXT,                     -- only set when resource_type = custom_object
  parent_comment_id TEXT,                      -- self-FK; NULL for top-level
  body TEXT NOT NULL,                          -- markdown, ≤4000 chars (validated in handler)
  mentions_json TEXT NOT NULL DEFAULT '[]',    -- JSON array of { user_id, email }
  reactions_json TEXT NOT NULL DEFAULT '[]',   -- JSON array of { emoji, user_id }
  created_by TEXT NOT NULL,                    -- user_id; agent-authored prefixed `agent:`
  created_at TEXT NOT NULL,
  edited_at TEXT,                              -- ISO; set when body is updated after the 15min window OR within it
  deleted_at TEXT,                             -- ISO; soft-delete marker
  deleted_by TEXT,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_comment_id) REFERENCES record_comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_record_comments_resource
  ON record_comments (organization_id, resource_type, resource_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_record_comments_parent
  ON record_comments (parent_comment_id);
