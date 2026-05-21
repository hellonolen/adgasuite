CREATE TABLE IF NOT EXISTS tenant_payment_connectors (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  owner_user_id TEXT,
  tenant_type TEXT NOT NULL DEFAULT 'company',
  connector_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_connected',
  capabilities_json TEXT NOT NULL DEFAULT '[]',
  connection_url TEXT,
  external_account_ref TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  last_checked_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS invoice_payment_routes (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  invoice_id TEXT NOT NULL,
  connector_id TEXT,
  connector_type TEXT NOT NULL,
  gross_cents INTEGER NOT NULL DEFAULT 0,
  platform_fee_bps INTEGER NOT NULL DEFAULT 500,
  platform_fee_cents INTEGER NOT NULL DEFAULT 0,
  net_to_user_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  provider_payment_ref TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (invoice_id) REFERENCES client_invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (connector_id) REFERENCES tenant_payment_connectors(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tenant_payment_connectors_owner ON tenant_payment_connectors (organization_id, owner_user_id, connector_type);
CREATE INDEX IF NOT EXISTS idx_tenant_payment_connectors_status ON tenant_payment_connectors (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_invoice_payment_routes_invoice ON invoice_payment_routes (organization_id, invoice_id, status);
