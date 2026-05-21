CREATE TABLE IF NOT EXISTS magic_tokens (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  plan TEXT,
  redirect_path TEXT NOT NULL DEFAULT '/suite',
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_magic_tokens_email ON magic_tokens(email);
CREATE INDEX IF NOT EXISTS idx_magic_tokens_expires ON magic_tokens(expires_at);
