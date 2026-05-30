-- Migration 0028 — inbox sync (Gmail v1).
--
-- Three tables land in this migration:
--   1. email_sync_cursors   — per-mailbox sync state per cloudflare/state/email-sync-cursor.schema.json
--   2. oauth_credentials    — encrypted access + refresh tokens (NEVER plaintext)
--   3. email_messages       — synced messages, linked to the contact (or other resource)
--
-- All three are tenant-scoped by organization_id. Secrets columns are
-- "*_encrypted" suffixed so the lint can flag any accidental plaintext column
-- being added next to them.

CREATE TABLE IF NOT EXISTS email_sync_cursors (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,                          -- "gmail" | "outlook"
  account_email TEXT NOT NULL,
  credential_id TEXT,                              -- → oauth_credentials.id
  status TEXT NOT NULL,                            -- connecting | active | paused | revoked | errored
  cursor TEXT,                                     -- provider opaque (Gmail historyId / OAuth URL during `connecting`)
  sync_started_at TEXT,
  last_success_at TEXT,
  last_error_at TEXT,
  last_error_reason TEXT,
  messages_total INTEGER NOT NULL DEFAULT 0,
  contacts_created INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_sync_cursors_org ON email_sync_cursors (organization_id);
CREATE INDEX IF NOT EXISTS idx_email_sync_cursors_status ON email_sync_cursors (status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_sync_cursors_account
  ON email_sync_cursors (organization_id, provider, account_email);

CREATE TABLE IF NOT EXISTS oauth_credentials (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,                          -- "gmail" | "outlook" | future
  account_email TEXT,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  expires_at TEXT,
  scope TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_oauth_credentials_org ON oauth_credentials (organization_id);
CREATE INDEX IF NOT EXISTS idx_oauth_credentials_provider ON oauth_credentials (provider);

CREATE TABLE IF NOT EXISTS email_messages (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  message_id TEXT NOT NULL,                        -- provider message id (Gmail id)
  thread_id TEXT,
  account_email TEXT NOT NULL,
  from_email TEXT,
  from_name TEXT,
  subject TEXT,
  snippet TEXT,
  body_encrypted TEXT,                             -- AES-GCM, key = ADGA_ENCRYPTION_KEY
  internal_date TEXT,                              -- ISO-8601 derived from provider epoch
  linked_resource_type TEXT,                       -- "contact" | "deal" | "lead" | "organization" | null
  linked_resource_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_messages_org ON email_messages (organization_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_thread ON email_messages (thread_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_link ON email_messages (linked_resource_type, linked_resource_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_messages_unique
  ON email_messages (organization_id, account_email, message_id);
