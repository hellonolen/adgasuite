CREATE TABLE IF NOT EXISTS voice_notes (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  owner_user_id TEXT,
  title TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  r2_key TEXT,
  file_name TEXT,
  mime_type TEXT,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  transcription_status TEXT NOT NULL DEFAULT 'pending',
  transcript_text TEXT,
  transcript_vtt TEXT,
  word_count INTEGER,
  stt_model TEXT NOT NULL DEFAULT '@cf/openai/whisper',
  agent_summary TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sms_messages (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'open_source_gateway',
  direction TEXT NOT NULL DEFAULT 'outbound',
  to_number TEXT NOT NULL,
  from_number TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  provider_message_id TEXT,
  provider_response TEXT,
  resource_type TEXT,
  resource_id TEXT,
  created_by TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_voice_notes_org_created ON voice_notes (organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_voice_notes_resource ON voice_notes (resource_type, resource_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sms_messages_org_created ON sms_messages (organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sms_messages_resource ON sms_messages (resource_type, resource_id, created_at);
