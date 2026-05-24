ALTER TABLE partner_referral_leads ADD COLUMN lead_data_r2_key TEXT;
ALTER TABLE partner_referral_leads ADD COLUMN storage_object_id TEXT;
CREATE INDEX IF NOT EXISTS idx_partner_referral_leads_storage_object ON partner_referral_leads (organization_id, storage_object_id);
