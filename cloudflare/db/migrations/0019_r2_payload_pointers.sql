ALTER TABLE leads ADD COLUMN payload_r2_key TEXT;
ALTER TABLE leads ADD COLUMN storage_object_id TEXT;
CREATE INDEX IF NOT EXISTS idx_leads_payload_storage ON leads (organization_id, storage_object_id);

ALTER TABLE contacts ADD COLUMN payload_r2_key TEXT;
ALTER TABLE contacts ADD COLUMN storage_object_id TEXT;
CREATE INDEX IF NOT EXISTS idx_contacts_payload_storage ON contacts (organization_id, storage_object_id);

ALTER TABLE deals ADD COLUMN payload_r2_key TEXT;
ALTER TABLE deals ADD COLUMN storage_object_id TEXT;
CREATE INDEX IF NOT EXISTS idx_deals_payload_storage ON deals (organization_id, storage_object_id);

ALTER TABLE tasks ADD COLUMN payload_r2_key TEXT;
ALTER TABLE tasks ADD COLUMN storage_object_id TEXT;
CREATE INDEX IF NOT EXISTS idx_tasks_payload_storage ON tasks (organization_id, storage_object_id);

ALTER TABLE maps ADD COLUMN payload_r2_key TEXT;
ALTER TABLE maps ADD COLUMN storage_object_id TEXT;
CREATE INDEX IF NOT EXISTS idx_maps_payload_storage ON maps (organization_id, storage_object_id);

ALTER TABLE map_nodes ADD COLUMN payload_r2_key TEXT;
ALTER TABLE map_nodes ADD COLUMN storage_object_id TEXT;
CREATE INDEX IF NOT EXISTS idx_map_nodes_payload_storage ON map_nodes (map_id, storage_object_id);

ALTER TABLE map_edges ADD COLUMN payload_r2_key TEXT;
ALTER TABLE map_edges ADD COLUMN storage_object_id TEXT;
CREATE INDEX IF NOT EXISTS idx_map_edges_payload_storage ON map_edges (map_id, storage_object_id);

ALTER TABLE voice_notes ADD COLUMN payload_r2_key TEXT;
ALTER TABLE voice_notes ADD COLUMN storage_object_id TEXT;
CREATE INDEX IF NOT EXISTS idx_voice_notes_payload_storage ON voice_notes (organization_id, storage_object_id);

ALTER TABLE sms_messages ADD COLUMN payload_r2_key TEXT;
ALTER TABLE sms_messages ADD COLUMN storage_object_id TEXT;
CREATE INDEX IF NOT EXISTS idx_sms_messages_payload_storage ON sms_messages (organization_id, storage_object_id);

ALTER TABLE communication_messages ADD COLUMN payload_r2_key TEXT;
ALTER TABLE communication_messages ADD COLUMN storage_object_id TEXT;
CREATE INDEX IF NOT EXISTS idx_communication_messages_payload_storage ON communication_messages (organization_id, storage_object_id);

ALTER TABLE client_invoices ADD COLUMN payload_r2_key TEXT;
ALTER TABLE client_invoices ADD COLUMN storage_object_id TEXT;
CREATE INDEX IF NOT EXISTS idx_client_invoices_payload_storage ON client_invoices (organization_id, storage_object_id);

ALTER TABLE deal_representations ADD COLUMN payload_r2_key TEXT;
ALTER TABLE deal_representations ADD COLUMN storage_object_id TEXT;
CREATE INDEX IF NOT EXISTS idx_deal_representations_payload_storage ON deal_representations (organization_id, storage_object_id);
