CREATE TABLE IF NOT EXISTS deal_representations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  deal_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_company TEXT,
  client_email TEXT,
  client_phone TEXT,
  relationship_type TEXT NOT NULL DEFAULT 'represented_client',
  portal_status TEXT NOT NULL DEFAULT 'prepared',
  access_level TEXT NOT NULL DEFAULT 'deal_status_documents_meetings_updates',
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS communication_threads (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'internal',
  channel TEXT NOT NULL DEFAULT 'note',
  title TEXT,
  latest_status TEXT NOT NULL DEFAULT 'open',
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS communication_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'internal',
  channel TEXT NOT NULL DEFAULT 'note',
  body TEXT NOT NULL,
  voice_note_id TEXT,
  sms_message_id TEXT,
  email_event_id TEXT,
  visibility TEXT NOT NULL DEFAULT 'internal',
  created_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (thread_id) REFERENCES communication_threads(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_deal_representations_deal ON deal_representations (organization_id, deal_id);
CREATE INDEX IF NOT EXISTS idx_communication_threads_resource ON communication_threads (organization_id, resource_type, resource_id, created_at);
CREATE INDEX IF NOT EXISTS idx_communication_messages_resource ON communication_messages (organization_id, resource_type, resource_id, created_at);
CREATE INDEX IF NOT EXISTS idx_communication_messages_audience ON communication_messages (organization_id, audience, created_at);
