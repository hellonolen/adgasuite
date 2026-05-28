-- 0024_seed_primary_dealflows.sql
-- Idempotent seed for the org_adga_primary workspace so the production demo
-- dealflows survive D1 wipes / restores. Mirrors LOCAL_DEMO_DEALFLOWS in
-- app/suite/dealflow/[id]/page.tsx and uses positions matching the
-- buildInitial() ring layout in components/suite/DealFlow.tsx
-- (CENTER 480,320 · inner radius 280 offset 30° · outer radius 460 offset 0°).
--
-- Only runs when the primary workspace exists; never pollutes other orgs.

INSERT OR IGNORE INTO maps (id, organization_id, name, template, deal_id, created_at, updated_at) VALUES
('DEAL-621810', 'org_adga_primary', 'Meridian Cold Chain Acquisition',           'Closing',     'DEAL-621810', datetime('now'), datetime('now')),
('DEAL-847214', 'org_adga_primary', 'Heliograph Series C Extension',              'Negotiation', 'DEAL-847214', datetime('now'), datetime('now')),
('DEAL-935672', 'org_adga_primary', 'Tessellate Series B Participation',          'At Risk',     'DEAL-935672', datetime('now'), datetime('now')),
('DEAL-471906', 'org_adga_primary', 'Quorum Energy Joint Venture',                'Proposal',    'DEAL-471906', datetime('now'), datetime('now')),
('DEAL-783540', 'org_adga_primary', 'Kestrel Defense Procurement',                'Contract',    'DEAL-783540', datetime('now'), datetime('now')),
('DEAL-659128', 'org_adga_primary', 'Larkfield Capital Strategic Partnership',    'New',         'DEAL-659128', datetime('now'), datetime('now'));

-- DEAL-621810 Meridian Cold Chain Acquisition (9 entities)
INSERT OR IGNORE INTO map_nodes (id, map_id, kind, label, sublabel, status, position_x, position_y, data_json, created_at, updated_at) VALUES
('DEAL-621810__company_meridian',  'DEAL-621810', 'company',  'Meridian Cold Chain',             'Seller · logistics platform',     'active',  622.5, 430.0, NULL, datetime('now'), datetime('now')),
('DEAL-621810__contact_ari',       'DEAL-621810', 'contact',  'Ari Boone',                       'Primary contact',                 'active',  321.8, 563.9, NULL, datetime('now'), datetime('now')),
('DEAL-621810__bank_lender',       'DEAL-621810', 'bank',     'Senior lender group',             'Debt package',                    'warning', 101.5, 319.3, NULL, datetime('now'), datetime('now')),
('DEAL-621810__group_people',      'DEAL-621810', 'group',    'People',                          '14 associated records',           'neutral', 266.1,  34.2, '{"childKind":"contact","childrenCount":14}', datetime('now'), datetime('now')),
('DEAL-621810__group_diligence',   'DEAL-621810', 'group',    'Files & diligence',               'Contracts, CIM, models',          'active',  588.1, 102.6, '{"childKind":"document","childrenCount":9}',  datetime('now'), datetime('now')),
('DEAL-621810__doc_counsel',       'DEAL-621810', 'document', 'Seller counsel markups',          'Needs response',                  'overdue', 840.0, 290.0, NULL, datetime('now'), datetime('now')),
('DEAL-621810__call_closing',      'DEAL-621810', 'call',     'Closing call',                    'Nine-step call prep',             'active',  380.0, 750.0, NULL, datetime('now'), datetime('now')),
('DEAL-621810__task_markups',      'DEAL-621810', 'task',     'Confirm markups',                 'Owner: legal',                    'warning', -80.0, 290.0, NULL, datetime('now'), datetime('now')),
('DEAL-621810__invoice_success',   'DEAL-621810', 'invoice',  'Success fee path',                'Ready after signature',           'neutral', 380.0,-170.0, NULL, datetime('now'), datetime('now'));

-- DEAL-847214 Heliograph (5 entities)
INSERT OR IGNORE INTO map_nodes (id, map_id, kind, label, sublabel, status, position_x, position_y, data_json, created_at, updated_at) VALUES
('DEAL-847214__company_heliograph','DEAL-847214', 'company',  'Heliograph',                 'Capital raise',         'active',  622.5, 430.0, NULL, datetime('now'), datetime('now')),
('DEAL-847214__contact_mira',      'DEAL-847214', 'contact',  'Mira Sen',                   'Investor relations',    'active',   86.0, 446.7, NULL, datetime('now'), datetime('now')),
('DEAL-847214__group_investors',   'DEAL-847214', 'group',    'Investor group',             '11 associated records', 'neutral', 251.5, 193.3, '{"childKind":"contact","childrenCount":11}', datetime('now'), datetime('now')),
('DEAL-847214__doc_allocation',    'DEAL-847214', 'document', 'Revised allocation memo',    'Draft',                 'warning', 840.0, 290.0, NULL, datetime('now'), datetime('now')),
('DEAL-847214__task_send',         'DEAL-847214', 'task',     'Send revised allocation',     NULL,                   'active',  -80.0, 290.0, NULL, datetime('now'), datetime('now'));

-- DEAL-935672 Tessellate (5 entities)
INSERT OR IGNORE INTO map_nodes (id, map_id, kind, label, sublabel, status, position_x, position_y, data_json, created_at, updated_at) VALUES
('DEAL-935672__company_tessellate','DEAL-935672', 'company', 'Tessellate',                  'Series B',                'warning', 622.5, 430.0, NULL, datetime('now'), datetime('now')),
('DEAL-935672__contact_noah',      'DEAL-935672', 'contact', 'Noah Rhee',                   'Sponsor',                 'overdue',  86.0, 446.7, NULL, datetime('now'), datetime('now')),
('DEAL-935672__group_diligence',   'DEAL-935672', 'group',   'Diligence',                   '9 associated records',    'warning', 251.5, 193.3, '{"childKind":"document","childrenCount":9}', datetime('now'), datetime('now')),
('DEAL-935672__email_sponsor',     'DEAL-935672', 'email',   'Sponsor response thread',     'No response',             'overdue', 840.0, 290.0, NULL, datetime('now'), datetime('now')),
('DEAL-935672__task_recover',      'DEAL-935672', 'task',    'Recover sponsor response',     NULL,                     'overdue', -80.0, 290.0, NULL, datetime('now'), datetime('now'));

-- DEAL-471906 Quorum (4 entities)
INSERT OR IGNORE INTO map_nodes (id, map_id, kind, label, sublabel, status, position_x, position_y, data_json, created_at, updated_at) VALUES
('DEAL-471906__company_quorum',    'DEAL-471906', 'company', 'Quorum Energy',          'JV counterparty',  'active',  622.5, 430.0, NULL, datetime('now'), datetime('now')),
('DEAL-471906__contact_magnus',    'DEAL-471906', 'contact', 'Magnus Bell',            'Commercial lead',  'active',  140.0, 530.0, NULL, datetime('now'), datetime('now')),
('DEAL-471906__doc_jv',            'DEAL-471906', 'document','JV timeline proposal',    NULL,              'warning', 840.0, 290.0, NULL, datetime('now'), datetime('now')),
('DEAL-471906__meeting_jv',        'DEAL-471906', 'meeting', 'Timeline alignment call', NULL,              'active',  380.0, 750.0, NULL, datetime('now'), datetime('now'));

-- DEAL-783540 Kestrel (4 entities)
INSERT OR IGNORE INTO map_nodes (id, map_id, kind, label, sublabel, status, position_x, position_y, data_json, created_at, updated_at) VALUES
('DEAL-783540__company_kestrel',   'DEAL-783540', 'company', 'Kestrel Defense',  'Procurement',     'active',  622.5, 430.0, NULL, datetime('now'), datetime('now')),
('DEAL-783540__contact_inez',      'DEAL-783540', 'contact', 'Inez Park',        'Security review', 'active',  140.0, 530.0, NULL, datetime('now'), datetime('now')),
('DEAL-783540__doc_security',      'DEAL-783540', 'document','Security exhibit', 'Routing',         'warning', 840.0, 290.0, NULL, datetime('now'), datetime('now')),
('DEAL-783540__task_route',        'DEAL-783540', 'task',    'Route security exhibit', NULL,        'active',  380.0, 750.0, NULL, datetime('now'), datetime('now'));

-- DEAL-659128 Larkfield (4 entities)
INSERT OR IGNORE INTO map_nodes (id, map_id, kind, label, sublabel, status, position_x, position_y, data_json, created_at, updated_at) VALUES
('DEAL-659128__company_larkfield', 'DEAL-659128', 'company', 'Larkfield Capital',    'Strategic partnership', 'neutral', 622.5, 430.0, NULL, datetime('now'), datetime('now')),
('DEAL-659128__contact_jon',       'DEAL-659128', 'contact', 'Jon Ives',             'Partner',               'neutral', 140.0, 530.0, NULL, datetime('now'), datetime('now')),
('DEAL-659128__task_next',         'DEAL-659128', 'task',    'Define next action',    NULL,                   'warning', 840.0, 290.0, NULL, datetime('now'), datetime('now')),
('DEAL-659128__group_workstream',  'DEAL-659128', 'group',   'Workstreams',          '6 associated records',  'neutral', 380.0, 750.0, '{"childKind":"task","childrenCount":6}', datetime('now'), datetime('now'));

-- Edges: every entity connects to the deal node (id = mapRecord.id).
INSERT OR IGNORE INTO map_edges (id, map_id, source_node_id, target_node_id, style, created_at) VALUES
('e_621810_1','DEAL-621810','DEAL-621810__company_meridian','DEAL-621810','solid',  datetime('now')),
('e_621810_2','DEAL-621810','DEAL-621810__contact_ari',     'DEAL-621810','solid',  datetime('now')),
('e_621810_3','DEAL-621810','DEAL-621810__bank_lender',     'DEAL-621810','dashed', datetime('now')),
('e_621810_4','DEAL-621810','DEAL-621810','DEAL-621810__doc_counsel',     'solid',  datetime('now')),
('e_621810_5','DEAL-621810','DEAL-621810','DEAL-621810__call_closing',    'solid',  datetime('now')),
('e_621810_6','DEAL-621810','DEAL-621810','DEAL-621810__task_markups',    'solid',  datetime('now')),
('e_621810_7','DEAL-621810','DEAL-621810','DEAL-621810__invoice_success', 'dashed', datetime('now')),
('e_621810_8','DEAL-621810','DEAL-621810','DEAL-621810__group_people',    'solid',  datetime('now')),
('e_621810_9','DEAL-621810','DEAL-621810','DEAL-621810__group_diligence', 'solid',  datetime('now')),
('e_847214_1','DEAL-847214','DEAL-847214__company_heliograph','DEAL-847214','solid', datetime('now')),
('e_847214_2','DEAL-847214','DEAL-847214__contact_mira',      'DEAL-847214','solid', datetime('now')),
('e_847214_3','DEAL-847214','DEAL-847214','DEAL-847214__doc_allocation',   'solid', datetime('now')),
('e_847214_4','DEAL-847214','DEAL-847214','DEAL-847214__task_send',        'solid', datetime('now')),
('e_847214_5','DEAL-847214','DEAL-847214','DEAL-847214__group_investors',  'solid', datetime('now')),
('e_935672_1','DEAL-935672','DEAL-935672__company_tessellate','DEAL-935672','solid', datetime('now')),
('e_935672_2','DEAL-935672','DEAL-935672__contact_noah',      'DEAL-935672','solid', datetime('now')),
('e_935672_3','DEAL-935672','DEAL-935672','DEAL-935672__email_sponsor',    'dashed', datetime('now')),
('e_935672_4','DEAL-935672','DEAL-935672','DEAL-935672__task_recover',     'solid', datetime('now')),
('e_935672_5','DEAL-935672','DEAL-935672','DEAL-935672__group_diligence',  'solid', datetime('now')),
('e_471906_1','DEAL-471906','DEAL-471906__company_quorum',    'DEAL-471906','solid', datetime('now')),
('e_471906_2','DEAL-471906','DEAL-471906__contact_magnus',    'DEAL-471906','solid', datetime('now')),
('e_471906_3','DEAL-471906','DEAL-471906','DEAL-471906__doc_jv',           'solid', datetime('now')),
('e_471906_4','DEAL-471906','DEAL-471906','DEAL-471906__meeting_jv',       'solid', datetime('now')),
('e_783540_1','DEAL-783540','DEAL-783540__company_kestrel',   'DEAL-783540','solid', datetime('now')),
('e_783540_2','DEAL-783540','DEAL-783540__contact_inez',      'DEAL-783540','solid', datetime('now')),
('e_783540_3','DEAL-783540','DEAL-783540','DEAL-783540__doc_security',     'solid', datetime('now')),
('e_783540_4','DEAL-783540','DEAL-783540','DEAL-783540__task_route',       'solid', datetime('now')),
('e_659128_1','DEAL-659128','DEAL-659128__company_larkfield', 'DEAL-659128','solid', datetime('now')),
('e_659128_2','DEAL-659128','DEAL-659128__contact_jon',       'DEAL-659128','solid', datetime('now')),
('e_659128_3','DEAL-659128','DEAL-659128','DEAL-659128__task_next',        'solid', datetime('now')),
('e_659128_4','DEAL-659128','DEAL-659128','DEAL-659128__group_workstream', 'solid', datetime('now'));
