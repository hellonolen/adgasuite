ALTER TABLE partner_referral_leads ADD COLUMN referral_number TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_referral_leads_referral_number ON partner_referral_leads (organization_id, referral_number);
