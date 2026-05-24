CREATE TABLE IF NOT EXISTS voice_calls (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'inbound',
  status TEXT NOT NULL DEFAULT 'scheduled',
  started_at TEXT,
  ended_at TEXT,
  duration_seconds INTEGER,
  participants_json TEXT NOT NULL DEFAULT '[]',
  consent_json TEXT NOT NULL DEFAULT '{}',
  recording_json TEXT NOT NULL DEFAULT '{}',
  transcript_json TEXT NOT NULL DEFAULT '{}',
  transcript_text TEXT,
  summary TEXT,
  related_records_json TEXT NOT NULL DEFAULT '{}',
  agentic_outputs_json TEXT NOT NULL DEFAULT '{}',
  provider TEXT,
  provider_call_id TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_voice_calls_org_created ON voice_calls (organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_voice_calls_status ON voice_calls (organization_id, status, started_at);
CREATE INDEX IF NOT EXISTS idx_voice_calls_provider ON voice_calls (provider, provider_call_id);
