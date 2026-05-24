-- ADGA Suite Cloudflare D1 baseline schema.
-- This is the new production data model for the Cloudflare-native build.
-- It is a clean Cloudflare-native schema.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'suite',
  subscription_status TEXT NOT NULL DEFAULT 'trialing',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'whop',
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'trialing',
  plan TEXT NOT NULL DEFAULT 'suite',
  current_period_end TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions (organization_id);

CREATE TABLE IF NOT EXISTS organization_settings (
  organization_id TEXT NOT NULL,
  panel TEXT NOT NULL,
  values_json TEXT NOT NULL DEFAULT '{}',
  updated_by TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (organization_id, panel),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_organization_settings_updated ON organization_settings(organization_id, updated_at);

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

CREATE TABLE IF NOT EXISTS partner_referral_leads (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  partner_slug TEXT NOT NULL,
  partner_name TEXT NOT NULL,
  referral_number TEXT,
  lead_data_r2_key TEXT,
  storage_object_id TEXT,
  affiliate_code TEXT,
  affiliate_url TEXT,
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_referral_leads_referral_number ON partner_referral_leads (organization_id, referral_number);
CREATE INDEX IF NOT EXISTS idx_partner_referral_leads_storage_object ON partner_referral_leads (organization_id, storage_object_id);
CREATE INDEX IF NOT EXISTS idx_partner_referral_email_deliveries_lead ON partner_referral_email_deliveries (referral_lead_id, created_at);
CREATE INDEX IF NOT EXISTS idx_partner_referral_email_deliveries_partner ON partner_referral_email_deliveries (organization_id, partner_slug, created_at);

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

CREATE TABLE IF NOT EXISTS email_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  provider TEXT NOT NULL DEFAULT 'postmark',
  message_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  provider_message_id TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS organization_members (
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TEXT NOT NULL,
  PRIMARY KEY (organization_id, user_id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  organization_id TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL,
  job_title TEXT,
  phone TEXT,
  website TEXT,
  preferred_contact_method TEXT,
  best_time_to_contact TEXT,
  social_profiles_json TEXT,
  linkedin_url TEXT,
  business_phone TEXT,
  business_email TEXT,
  industry TEXT,
  business_type TEXT,
  company_size TEXT,
  revenue_range TEXT,
  location TEXT,
  city TEXT,
  state_region TEXT,
  country TEXT,
  timezone TEXT,
  business_state TEXT,
  need_summary TEXT,
  source TEXT,
  qr_source TEXT,
  referral_source TEXT,
  status TEXT NOT NULL DEFAULT 'Warm',
  score INTEGER NOT NULL DEFAULT 50,
  urgency TEXT NOT NULL DEFAULT 'Normal',
  urgency_reason TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  estimated_value_cents INTEGER NOT NULL DEFAULT 0,
  deal_type TEXT,
  stage TEXT NOT NULL DEFAULT 'New',
  owner_user_id TEXT,
  next_action TEXT,
  follow_up_due_at TEXT,
  follow_up_sequence TEXT,
  follow_up_status TEXT NOT NULL DEFAULT 'not_started',
  last_follow_up_at TEXT,
  next_scheduled_follow_up_at TEXT,
  notes TEXT,
  document_links_json TEXT,
  tags_json TEXT,
  agent_summary TEXT,
  agent_next_move TEXT,
  activity_history_json TEXT,
  received_at TEXT,
  last_contacted_at TEXT,
  assigned_at TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_org_status ON leads (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_org_email ON leads (organization_id, email);
CREATE INDEX IF NOT EXISTS idx_leads_org_received ON leads (organization_id, received_at);
CREATE INDEX IF NOT EXISTS idx_leads_org_followup ON leads (organization_id, follow_up_due_at);
CREATE INDEX IF NOT EXISTS idx_leads_org_urgency ON leads (organization_id, urgency);
CREATE INDEX IF NOT EXISTS idx_leads_org_source ON leads (organization_id, source);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  title TEXT,
  website TEXT,
  preferred_contact_method TEXT,
  best_time_to_contact TEXT,
  role_authority TEXT,
  social_profiles_json TEXT,
  linkedin_url TEXT,
  x_url TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  other_profile_url TEXT,
  business_phone TEXT,
  business_email TEXT,
  industry TEXT,
  business_type TEXT,
  company_size TEXT,
  revenue_range TEXT,
  location TEXT,
  city TEXT,
  state_region TEXT,
  country TEXT,
  timezone TEXT,
  business_state TEXT,
  need_summary TEXT,
  urgency TEXT,
  priority TEXT,
  source TEXT,
  qr_source TEXT,
  referral_source TEXT,
  owner_user_id TEXT,
  stage TEXT,
  received_at TEXT,
  last_contacted_at TEXT,
  follow_up_due_at TEXT,
  next_scheduled_follow_up_at TEXT,
  follow_up_sequence TEXT,
  follow_up_status TEXT,
  document_links_json TEXT,
  agent_summary TEXT,
  agent_next_move TEXT,
  activity_history_json TEXT,
  archived_at TEXT,
  status TEXT NOT NULL DEFAULT 'lead',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_contacts_org_email ON contacts (organization_id, email);

CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  contact_id TEXT,
  name TEXT NOT NULL,
  company TEXT,
  value_cents INTEGER NOT NULL DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'Prospect',
  probability INTEGER NOT NULL DEFAULT 0,
  expected_close_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_deals_org_stage ON deals (organization_id, stage);

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

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  contact_id TEXT,
  deal_id TEXT,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'task',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  due_at TEXT,
  assigned_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS knowledge_workspaces (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_private INTEGER NOT NULL DEFAULT 0,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS knowledge_pages (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content_json TEXT NOT NULL DEFAULT '[]',
  is_published INTEGER NOT NULL DEFAULT 0,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES knowledge_workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  recipient_name TEXT,
  recipient_company TEXT,
  recipient_email TEXT,
  total_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'draft',
  r2_key TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS storage_objects (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  bucket TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  sha256 TEXT,
  category TEXT NOT NULL DEFAULT 'upload',
  resource_type TEXT,
  resource_id TEXT,
  visibility TEXT NOT NULL DEFAULT 'workspace',
  created_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_storage_objects_org_created ON storage_objects (organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_storage_objects_resource ON storage_objects (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_storage_objects_category ON storage_objects (organization_id, category);

CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  storage_object_id TEXT NOT NULL,
  version_label TEXT NOT NULL DEFAULT 'v1',
  created_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (storage_object_id) REFERENCES storage_objects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_document_versions_document ON document_versions (document_id, created_at);

CREATE TABLE IF NOT EXISTS intelligence_companies (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,
  size TEXT,
  revenue TEXT,
  location TEXT,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS intelligence_battlecards (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  competitor_name TEXT NOT NULL,
  overview TEXT NOT NULL,
  strengths_json TEXT NOT NULL DEFAULT '[]',
  weaknesses_json TEXT NOT NULL DEFAULT '[]',
  differentiators_json TEXT NOT NULL DEFAULT '[]',
  pricing_info TEXT,
  objection_handlers_json TEXT NOT NULL DEFAULT '[]',
  winning_tactics_json TEXT NOT NULL DEFAULT '[]',
  created_by_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  resource_type TEXT,
  resource_id TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_events_org_type ON events (organization_id, event_type);
CREATE INDEX IF NOT EXISTS idx_events_resource ON events (resource_type, resource_id);

CREATE TABLE IF NOT EXISTS workflow_states (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  workflow_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  resource_type TEXT,
  resource_id TEXT,
  state_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workflow_states_org_status ON workflow_states (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_states_resource ON workflow_states (resource_type, resource_id);

CREATE TABLE IF NOT EXISTS agent_jobs (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  agent TEXT NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  input_json TEXT NOT NULL DEFAULT '{}',
  output_json TEXT,
  error TEXT,
  run_after TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_jobs_status ON agent_jobs (status, run_after);

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

CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  agent TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  output_json TEXT,
  error TEXT,
  FOREIGN KEY (job_id) REFERENCES agent_jobs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT OR IGNORE INTO organizations (id, name, slug, plan, subscription_status, created_at, updated_at)
VALUES ('org_adga_primary', 'ADGA', 'adga', 'suite', 'trialing', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at)
VALUES
  ('usr_owner_hellonolen', 'hellonolen@gmail.com', 'Nolen', 'owner', datetime('now'), datetime('now')),
  ('usr_admin_kamarokyle5', 'kamarokyle5@gmail.com', 'Kamarokyle', 'admin', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO organization_members (organization_id, user_id, role, created_at)
VALUES
  ('org_adga_primary', 'usr_owner_hellonolen', 'owner', datetime('now')),
  ('org_adga_primary', 'usr_admin_kamarokyle5', 'admin', datetime('now'));
