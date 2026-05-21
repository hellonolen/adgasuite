CREATE TABLE IF NOT EXISTS partner_referral_leads (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  partner_slug TEXT NOT NULL,
  partner_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  job_title TEXT,
  company_size TEXT,
  state TEXT,
  payroll_timing TEXT,
  current_payroll_provider TEXT,
  needs_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  consent_to_contact INTEGER NOT NULL DEFAULT 0,
  source_path TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  email_sent_count INTEGER NOT NULL DEFAULT 0,
  last_email_sent_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS partner_referral_email_deliveries (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  referral_lead_id TEXT NOT NULL,
  partner_slug TEXT NOT NULL,
  to_email TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'postmark',
  status TEXT NOT NULL DEFAULT 'pending',
  provider_status INTEGER,
  provider_response TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (referral_lead_id) REFERENCES partner_referral_leads(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_partner_referral_leads_partner_created ON partner_referral_leads (organization_id, partner_slug, created_at);
CREATE INDEX IF NOT EXISTS idx_partner_referral_leads_email ON partner_referral_leads (organization_id, email, created_at);
CREATE INDEX IF NOT EXISTS idx_partner_referral_email_deliveries_lead ON partner_referral_email_deliveries (referral_lead_id, created_at);
CREATE INDEX IF NOT EXISTS idx_partner_referral_email_deliveries_partner ON partner_referral_email_deliveries (organization_id, partner_slug, created_at);
