CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  title TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  location TEXT,
  meeting_url TEXT,
  status TEXT NOT NULL DEFAULT 'tentative',
  event_type TEXT NOT NULL DEFAULT 'meeting',
  deal_id TEXT,
  contact_id TEXT,
  attendees_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_org_time ON calendar_events (organization_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_deal ON calendar_events (deal_id);

CREATE TABLE IF NOT EXISTS agent_approvals (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  job_id TEXT,
  agent TEXT NOT NULL,
  title TEXT NOT NULL,
  proposed_action TEXT NOT NULL,
  risk TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  resource_type TEXT,
  resource_id TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  decided_by TEXT,
  decided_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES agent_jobs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_approvals_status ON agent_approvals (organization_id, status);

INSERT OR IGNORE INTO calendar_events
  (id, organization_id, title, starts_at, ends_at, timezone, location, meeting_url, status, event_type, deal_id, contact_id, attendees_json, notes, created_by, created_at, updated_at)
VALUES
  (
    'cal_001',
    'org_adga_primary',
    'Sutter Maritime pre-signing alignment',
    '2026-05-20T14:00:00.000Z',
    '2026-05-20T14:45:00.000Z',
    'America/New_York',
    'Zoom',
    'https://meet.adga.ai/sutter-pre-signing',
    'confirmed',
    'meeting',
    NULL,
    NULL,
    '[{"name":"Maren Voss","email":"maren.voss@concorde.co","role":"owner"},{"name":"Aurore Chastain","email":"aurore.c@sutter.co","role":"counterparty"}]',
    'Final review of working capital peg, holdback mechanic, and signature timeline.',
    'hellonolen@gmail.com',
    datetime('now'),
    datetime('now')
  ),
  (
    'cal_002',
    'org_adga_primary',
    'Quorum Energy follow-up',
    '2026-05-21T16:30:00.000Z',
    '2026-05-21T17:00:00.000Z',
    'America/New_York',
    'Google Meet',
    'https://meet.adga.ai/quorum-follow-up',
    'tentative',
    'call',
    NULL,
    NULL,
    '[{"name":"Magnus Bell","email":"mbell@quorum.energy","role":"counterparty"}]',
    'Re-open dialogue on JV term sheet.',
    'hellonolen@gmail.com',
    datetime('now'),
    datetime('now')
  ),
  (
    'cal_003',
    'org_adga_primary',
    'Tessellate signature SLA',
    '2026-05-23T20:00:00.000Z',
    '2026-05-23T20:15:00.000Z',
    'America/New_York',
    NULL,
    NULL,
    'confirmed',
    'deadline',
    NULL,
    NULL,
    '[]',
    'Signature request expires without response.',
    'system',
    datetime('now'),
    datetime('now')
  );
