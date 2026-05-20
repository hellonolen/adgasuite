CREATE TABLE IF NOT EXISTS calendar_invite_deliveries (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  calendar_event_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  channel TEXT NOT NULL DEFAULT 'email',
  provider TEXT NOT NULL DEFAULT 'postmark',
  status TEXT NOT NULL DEFAULT 'pending',
  provider_status INTEGER,
  provider_response TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (calendar_event_id) REFERENCES calendar_events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_calendar_invites_event ON calendar_invite_deliveries (calendar_event_id, created_at);
CREATE INDEX IF NOT EXISTS idx_calendar_invites_recipient ON calendar_invite_deliveries (organization_id, recipient_email, created_at);
