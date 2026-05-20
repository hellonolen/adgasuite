CREATE TABLE IF NOT EXISTS affiliates (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  referral_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  commission_rate_bps INTEGER NOT NULL DEFAULT 1000,
  clicks INTEGER NOT NULL DEFAULT 0,
  leads INTEGER NOT NULL DEFAULT 0,
  signups INTEGER NOT NULL DEFAULT 0,
  paid_accounts INTEGER NOT NULL DEFAULT 0,
  revenue_cents INTEGER NOT NULL DEFAULT 0,
  commission_owed_cents INTEGER NOT NULL DEFAULT 0,
  payout_status TEXT NOT NULL DEFAULT 'not_due',
  risk_flags_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS affiliate_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  affiliate_id TEXT,
  referral_code TEXT,
  event_type TEXT NOT NULL,
  customer_email TEXT,
  source TEXT,
  campaign TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS client_invoices (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  owner_user_id TEXT,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_company TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  currency TEXT NOT NULL DEFAULT 'USD',
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  platform_fee_bps INTEGER NOT NULL DEFAULT 500,
  platform_fee_cents INTEGER NOT NULL DEFAULT 0,
  net_to_user_cents INTEGER NOT NULL DEFAULT 0,
  fee_collection_status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  payment_link TEXT,
  due_at TEXT,
  sent_at TEXT,
  paid_at TEXT,
  voided_at TEXT,
  notes TEXT,
  line_items_json TEXT NOT NULL DEFAULT '[]',
  document_links_json TEXT NOT NULL DEFAULT '[]',
  r2_key TEXT,
  activity_history_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_affiliates_org_status ON affiliates (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_affiliate_events_code ON affiliate_events (organization_id, referral_code, created_at);
CREATE INDEX IF NOT EXISTS idx_client_invoices_org_status ON client_invoices (organization_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_client_invoices_owner ON client_invoices (organization_id, owner_user_id, created_at);
