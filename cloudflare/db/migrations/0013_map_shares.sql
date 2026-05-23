-- Map share links: one active share token per deal map.
-- Tokens are stored raw (not hashed) for share-link convenience.
-- Tradeoff: a DB read leak would expose live tokens, but tokens carry no
-- write permissions and can be rotated/revoked instantly via the share API.
-- We mitigate guessing with 32-byte (256-bit) random tokens (base64url) and
-- a per-IP rate limit on the public share page.
CREATE TABLE IF NOT EXISTS map_shares (
  token TEXT PRIMARY KEY,
  map_id TEXT NOT NULL,
  permission TEXT NOT NULL DEFAULT 'view',
  created_by_user_id TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT,
  revoked_at TEXT,
  FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_map_shares_map ON map_shares(map_id);
