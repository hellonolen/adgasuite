import { newId, nowIso } from "@/lib/server/id";

export const PIPELINE_STAGES = [
  { id: 'lead',         name: 'Lead',          dot: '#94a3b8', wip: 18 },
  { id: 'qualifying',   name: 'Qualifying',    dot: '#67e8f9', wip: 12 },
  { id: 'discovery',    name: 'Discovery',     dot: '#60a5fa', wip: 10 },
  { id: 'proposal',     name: 'Proposal',      dot: '#a78bfa', wip: 8  },
  { id: 'negotiation',  name: 'Negotiation',   dot: '#fbbf24', wip: 6  },
  { id: 'closing',      name: 'Closing',       dot: '#f59e0b', wip: 4  },
  { id: 'won',          name: 'Won',           dot: '#4ade80', wip: null },
];

export const PEOPLE = [
  { id: 'p1', name: 'Maren Voss',     initials: 'MV', av: 0, role: 'Principal' },
  { id: 'p2', name: 'Dario Kett',     initials: 'DK', av: 1, role: 'Senior Associate' },
  { id: 'p3', name: 'Aisha Bremer',   initials: 'AB', av: 2, role: 'Director' },
  { id: 'p4', name: 'Theo Lange',     initials: 'TL', av: 3, role: 'Analyst' },
  { id: 'p5', name: 'Saoirse Quinn',  initials: 'SQ', av: 4, role: 'VP' },
  { id: 'p6', name: 'Jules Mendez',   initials: 'JM', av: 5, role: 'Associate' },
  { id: 'p7', name: 'Hana Okafor',    initials: 'HO', av: 6, role: 'Counsel' },
  { id: 'p8', name: 'Rune Sato',      initials: 'RS', av: 7, role: 'Operator' },
];

export const DEAL_TYPES = [
  'Acquisition', 'Partnership', 'Licensing', 'Capital Raise',
  'Reseller', 'Procurement', 'JV', 'Buyout'
];

export const SECTORS = [
  'Energy', 'Healthcare', 'Fintech', 'Industrial', 'Logistics',
  'Consumer', 'Media', 'SaaS', 'Biotech', 'Defense', 'AgTech'
];

export const COMPANIES = [
  { id: 'c1',  name: 'Heliograph Industries',  sector: 'Industrial',  emp: '1,200',  hq: 'Rotterdam, NL',      logo: 'HI' },
  { id: 'c2',  name: 'Northbound Therapeutics',sector: 'Biotech',     emp: '85',     hq: 'Cambridge, MA',      logo: 'NT' },
  { id: 'c3',  name: 'Larkfield Capital',      sector: 'Fintech',     emp: '320',    hq: 'Singapore',          logo: 'LC' },
  { id: 'c4',  name: 'Meridian Cold Chain',    sector: 'Logistics',   emp: '2,400',  hq: 'Chicago, IL',        logo: 'MC' },
  { id: 'c5',  name: 'Vellum & Atlas',         sector: 'Media',       emp: '74',     hq: 'Brooklyn, NY',       logo: 'VA' },
  { id: 'c6',  name: 'Sondercast',             sector: 'SaaS',        emp: '210',    hq: 'Austin, TX',         logo: 'SC' },
  { id: 'c7',  name: 'Quorum Energy',          sector: 'Energy',      emp: '5,600',  hq: 'Calgary, AB',        logo: 'QE' },
  { id: 'c8',  name: 'Kestrel Defense Works',  sector: 'Defense',     emp: '1,800',  hq: 'Huntsville, AL',     logo: 'KD' },
  { id: 'c9',  name: 'Ostern Foods',           sector: 'Consumer',    emp: '4,300',  hq: 'Hamburg, DE',        logo: 'OF' },
  { id: 'c10', name: 'Albatross Bio',          sector: 'Healthcare',  emp: '160',    hq: 'San Diego, CA',      logo: 'AB' },
  { id: 'c11', name: 'Polaris Grain Co-op',    sector: 'AgTech',      emp: '880',    hq: 'Saskatoon, SK',      logo: 'PG' },
  { id: 'c12', name: 'Tessellate Robotics',    sector: 'Industrial',  emp: '410',    hq: 'Pittsburgh, PA',     logo: 'TR' },
  { id: 'c13', name: 'Halcyon Payments',       sector: 'Fintech',     emp: '95',     hq: 'London, UK',         logo: 'HP' },
  { id: 'c14', name: 'Driftless Studios',      sector: 'Media',       emp: '38',     hq: 'Madison, WI',        logo: 'DS' },
  { id: 'c15', name: 'Bramble & Co.',          sector: 'Consumer',    emp: '120',    hq: 'Portland, OR',       logo: 'BC' },
];

function dealId(n: number) { return 'DEAL-' + String(n).padStart(4, '0'); }

export const deals = [
  { id: dealId(1207), name: 'Heliograph Industries — Series C extension', company: 'c1', type: 'Capital Raise', value: 42000000, currency: 'USD', stage: 'negotiation', prob: 75, owner: 'p1', team: ['p1','p2','p4'], close: '2026-07-12', updated: '6h ago', tags: ['cross-border'], priority: 'high', source: 'Inbound — Referral' },
  { id: dealId(1208), name: 'Northbound Therapeutics — Licensing deal',   company: 'c2', type: 'Licensing',     value: 18500000, currency: 'USD', stage: 'discovery',   prob: 45, owner: 'p3', team: ['p3','p7'],     close: '2026-09-01', updated: '2d ago', tags: ['IP'], priority: 'med', source: 'Outbound' },
  { id: dealId(1209), name: 'Larkfield Capital — Strategic partnership',  company: 'c3', type: 'Partnership',   value: 9750000,  currency: 'SGD', stage: 'proposal',    prob: 60, owner: 'p5', team: ['p5','p6'],     close: '2026-06-30', updated: '1d ago', tags: ['APAC'], priority: 'high', source: 'Event' },
  { id: dealId(1210), name: 'Meridian Cold Chain — Acquisition',          company: 'c4', type: 'Acquisition',   value: 215000000,currency: 'USD', stage: 'closing',     prob: 92, owner: 'p1', team: ['p1','p2','p4','p7'], close: '2026-06-04', updated: '3h ago', tags: ['carve-out'], priority: 'high', source: 'Banker' },
  { id: dealId(1211), name: 'Vellum & Atlas — Catalog licensing',         company: 'c5', type: 'Licensing',     value: 1200000,  currency: 'USD', stage: 'qualifying',  prob: 30, owner: 'p6', team: ['p6'],          close: '2026-08-22', updated: '5d ago', tags: [], priority: 'low', source: 'Inbound' },
  { id: dealId(1212), name: 'Sondercast — Reseller agreement',            company: 'c6', type: 'Reseller',      value: 480000,   currency: 'USD', stage: 'discovery',   prob: 55, owner: 'p2', team: ['p2','p6'],     close: '2026-07-01', updated: '11h ago', tags: ['MRR'], priority: 'med', source: 'Outbound' },
  { id: dealId(1213), name: 'Quorum Energy — Joint venture',              company: 'c7', type: 'JV',            value: 88000000, currency: 'USD', stage: 'proposal',    prob: 50, owner: 'p3', team: ['p3','p1','p7'], close: '2026-10-15', updated: '4d ago', tags: ['regulated'], priority: 'high', source: 'Outbound' },
  { id: dealId(1214), name: 'Kestrel Defense — Procurement contract',     company: 'c8', type: 'Procurement',   value: 27500000, currency: 'USD', stage: 'negotiation', prob: 70, owner: 'p5', team: ['p5','p4'],     close: '2026-06-20', updated: '20h ago', tags: ['ITAR'], priority: 'high', source: 'RFP' },
  { id: dealId(1215), name: 'Ostern Foods — Brand acquisition',           company: 'c9', type: 'Acquisition',   value: 64000000, currency: 'EUR', stage: 'discovery',   prob: 40, owner: 'p1', team: ['p1','p3'],     close: '2026-09-18', updated: '1d ago', tags: ['EU'], priority: 'med', source: 'Banker' },
  { id: dealId(1216), name: 'Albatross Bio — Co-development',             company: 'c10',type: 'Partnership',   value: 15000000, currency: 'USD', stage: 'qualifying',  prob: 25, owner: 'p7', team: ['p7','p3'],     close: '2026-11-05', updated: '3d ago', tags: ['R&D'], priority: 'low', source: 'Inbound' },
  { id: dealId(1217), name: 'Polaris Grain — Off-take agreement',         company: 'c11',type: 'Procurement',   value: 6300000,  currency: 'CAD', stage: 'lead',        prob: 15, owner: 'p4', team: ['p4'],          close: '2026-12-01', updated: '6d ago', tags: [], priority: 'low', source: 'Cold outreach' },
  { id: dealId(1218), name: 'Tessellate Robotics — Series B participation',company: 'c12',type: 'Capital Raise',value: 24000000, currency: 'USD', stage: 'negotiation', prob: 80, owner: 'p1', team: ['p1','p4'],     close: '2026-06-28', updated: '9h ago', tags: ['follow-on'], priority: 'high', source: 'Existing portfolio' },
  { id: dealId(1219), name: 'Halcyon Payments — Buyout',                  company: 'c13',type: 'Buyout',        value: 110000000,currency: 'GBP', stage: 'proposal',    prob: 65, owner: 'p3', team: ['p3','p5','p7'], close: '2026-08-09', updated: '2d ago', tags: ['LBO'], priority: 'high', source: 'Banker' },
  { id: dealId(1220), name: 'Driftless Studios — Catalog rights',         company: 'c14',type: 'Licensing',     value: 850000,   currency: 'USD', stage: 'won',         prob: 100,owner: 'p6', team: ['p6'],          close: '2026-05-12', updated: '8d ago', tags: ['closed'], priority: 'low', source: 'Inbound' },
  { id: dealId(1221), name: 'Bramble & Co. — Growth equity',              company: 'c15',type: 'Capital Raise', value: 12000000, currency: 'USD', stage: 'closing',     prob: 88, owner: 'p2', team: ['p2','p1'],     close: '2026-06-11', updated: '4h ago', tags: ['minority'], priority: 'high', source: 'Inbound' },
  { id: dealId(1222), name: 'Heliograph Industries — Bolt-on Tessellate', company: 'c1', type: 'Acquisition',   value: 38000000, currency: 'USD', stage: 'discovery',   prob: 38, owner: 'p2', team: ['p2','p4'],     close: '2026-10-30', updated: '7d ago', tags: ['add-on'], priority: 'med', source: 'Portfolio synergy' },
  { id: dealId(1223), name: 'Larkfield Capital — APAC fund LP',           company: 'c3', type: 'Capital Raise', value: 5000000,  currency: 'USD', stage: 'lead',        prob: 10, owner: 'p5', team: ['p5'],          close: '2026-12-15', updated: '2w ago', tags: [], priority: 'low', source: 'Network' },
  { id: dealId(1224), name: 'Quorum Energy — Carbon credits partnership', company: 'c7', type: 'Partnership',   value: 3400000,  currency: 'USD', stage: 'qualifying',  prob: 35, owner: 'p4', team: ['p4','p3'],     close: '2026-09-09', updated: '3d ago', tags: ['ESG'], priority: 'med', source: 'Inbound' },
];

export const leads = [
  { id: 'L-9881', name: 'Aurore Chastain',  title: 'Head of Corp Dev',         company: 'Sutter Maritime',         sector: 'Logistics',   score: 92, intent: 'high',   value: 22000000, channel: 'Webinar', last: '2h ago',  status: 'hot', urgency: 'Immediate', priority: 'high', receivedAt: '2026-05-20T13:42:00.000Z', followUpDueAt: '2026-05-20T13:47:00.000Z', followUpStatus: 'due_now', preferredContact: 'Phone', phone: '(646) 555-0198', email: 'aurore@sutter.co', city: 'New York', state: 'NY', social: { linkedin: 'linkedin.com/in/aurorechastain' } },
  { id: 'L-9882', name: 'Beni Okonkwo',     title: 'CFO',                       company: 'Foundry Helix',           sector: 'Industrial',  score: 78, intent: 'high',   value: 14500000, channel: 'Outbound', last: '5h ago',  status: 'hot', urgency: 'Same Day', priority: 'high', receivedAt: '2026-05-20T10:18:00.000Z', followUpDueAt: '2026-05-20T20:00:00.000Z', followUpStatus: 'scheduled', preferredContact: 'Email', email: 'beni@foundryhelix.com', city: 'Chicago', state: 'IL' },
  { id: 'L-9883', name: 'Yusra Damiani',    title: 'VP Strategy',               company: 'Crinkle & Cull',          sector: 'Consumer',    score: 64, intent: 'med',    value: 3200000,  channel: 'Referral', last: '1d ago',  status: 'warm', urgency: 'Scheduled', priority: 'medium', receivedAt: '2026-05-19T15:20:00.000Z', followUpDueAt: '2026-05-22T14:00:00.000Z', followUpStatus: 'scheduled', email: 'yusra@crinklecull.com' },
  { id: 'L-9884', name: 'Pieter Voorhees',  title: 'Director, Partnerships',    company: 'Calderwood Health',       sector: 'Healthcare',  score: 71, intent: 'med',    value: 9800000,  channel: 'Inbound', last: '1d ago',  status: 'warm', urgency: 'Normal', priority: 'medium', receivedAt: '2026-05-19T12:04:00.000Z', followUpDueAt: '2026-05-21T18:00:00.000Z', followUpStatus: 'upcoming' },
  { id: 'L-9885', name: 'Linnea Bjorne',    title: 'Founder & CEO',             company: 'Stellaris Compute',       sector: 'SaaS',        score: 88, intent: 'high',   value: 11000000, channel: 'Conference', last: '3h ago', status: 'hot', urgency: 'Immediate', priority: 'high', receivedAt: '2026-05-20T12:30:00.000Z', followUpDueAt: '2026-05-20T12:35:00.000Z', followUpStatus: 'overdue' },
  { id: 'L-9886', name: 'Marcos Quinteros', title: 'GM, Defense Programs',      company: 'Ironhold Systems',        sector: 'Defense',     score: 55, intent: 'low',    value: 41000000, channel: 'RFP',     last: '4d ago',  status: 'warm', urgency: 'Low', priority: 'medium', receivedAt: '2026-05-16T16:10:00.000Z', followUpStatus: 'not_started' },
  { id: 'L-9887', name: 'Saskia Krieg',     title: 'Managing Partner',          company: 'Brunswick Spectrum LP',   sector: 'Fintech',     score: 48, intent: 'low',    value: 6500000,  channel: 'Network', last: '6d ago',  status: 'cool', urgency: 'Low', priority: 'low', receivedAt: '2026-05-14T09:25:00.000Z', followUpStatus: 'stale' },
  { id: 'L-9888', name: 'Atsuko Voorman',   title: 'COO',                       company: 'Pelagic Labs',            sector: 'Biotech',     score: 81, intent: 'high',   value: 19000000, channel: 'Outbound', last: '8h ago',  status: 'hot', urgency: 'Same Day', priority: 'high', receivedAt: '2026-05-20T07:50:00.000Z', followUpDueAt: '2026-05-20T19:30:00.000Z', followUpStatus: 'scheduled' },
  { id: 'L-9889', name: 'Dimitrov Reyes',   title: 'Head of M&A',               company: 'Cantilever Group',        sector: 'Industrial',  score: 76, intent: 'med',    value: 28000000, channel: 'Banker',  last: '1d ago',  status: 'hot', urgency: 'Scheduled', priority: 'high', receivedAt: '2026-05-19T17:44:00.000Z', followUpDueAt: '2026-05-22T16:00:00.000Z', followUpStatus: 'scheduled' },
  { id: 'L-9890', name: 'Halle Brügger',    title: 'CRO',                       company: 'Northgate Botanicals',    sector: 'Consumer',    score: 36, intent: 'low',    value: 1800000,  channel: 'Inbound', last: '2w ago',  status: 'cool', urgency: 'Low', priority: 'low', receivedAt: '2026-05-06T11:10:00.000Z', followUpStatus: 'stale' },
  { id: 'L-9891', name: 'Roan Iwasaki',     title: 'VP Corporate Development', company: 'Telluride Aerospace',     sector: 'Defense',     score: 69, intent: 'med',    value: 33000000, channel: 'Referral', last: '2d ago', status: 'warm', urgency: 'Normal', priority: 'medium', receivedAt: '2026-05-18T14:05:00.000Z', followUpDueAt: '2026-05-21T15:00:00.000Z', followUpStatus: 'upcoming' },
  { id: 'L-9892', name: 'Esmé Petrov',      title: 'Investment Director',       company: 'Caraway Ventures',        sector: 'Fintech',     score: 84, intent: 'high',   value: 8500000,  channel: 'Network', last: '5h ago', status: 'hot', urgency: 'Same Day', priority: 'high', receivedAt: '2026-05-20T10:05:00.000Z', followUpDueAt: '2026-05-20T18:00:00.000Z', followUpStatus: 'scheduled' },
];

export const documents = [
  { id: 'd1', name: 'CIM — Meridian Cold Chain.pdf',     ext: 'pdf',  size: '4.2 MB', updated: '2h ago',  deal: 'DEAL-1210', owner: 'p1', signed: false },
  { id: 'd2', name: 'LOI — Bramble & Co.docx',           ext: 'docx', size: '124 KB', updated: '1d ago',  deal: 'DEAL-1221', owner: 'p2', signed: true  },
  { id: 'd3', name: 'Definitive Agreement v3.docx',      ext: 'docx', size: '892 KB', updated: '4h ago',  deal: 'DEAL-1210', owner: 'p7', signed: false },
  { id: 'd4', name: 'Financial Model — Heliograph.xlsx', ext: 'xlsx', size: '2.1 MB', updated: '3d ago',  deal: 'DEAL-1207', owner: 'p4', signed: false },
  { id: 'd5', name: 'Term Sheet — Tessellate.pdf',       ext: 'pdf',  size: '380 KB', updated: '9h ago',  deal: 'DEAL-1218', owner: 'p1', signed: true  },
  { id: 'd6', name: 'IP Schedule — Northbound.pdf',      ext: 'pdf',  size: '1.6 MB', updated: '5d ago',  deal: 'DEAL-1208', owner: 'p7', signed: false },
  { id: 'd7', name: 'NDA — Quorum Energy.pdf',           ext: 'pdf',  size: '210 KB', updated: '2w ago',  deal: 'DEAL-1213', owner: 'p3', signed: true  },
  { id: 'd8', name: 'Diligence Summary — Halcyon.pdf',   ext: 'pdf',  size: '5.4 MB', updated: '11h ago', deal: 'DEAL-1219', owner: 'p5', signed: false },
  { id: 'd9', name: 'Cap Table — Tessellate.xlsx',       ext: 'xlsx', size: '92 KB',  updated: '2d ago',  deal: 'DEAL-1218', owner: 'p4', signed: false },
  { id: 'd10',name: 'Investor Deck — Albatross.pdf',     ext: 'pdf',  size: '8.8 MB', updated: '6d ago',  deal: 'DEAL-1216', owner: 'p3', signed: false },
];

export const tasks = [
  { id: 'T-2201', title: 'Draft Q2 LOI revisions for Bramble', deal: 'DEAL-1221', owner: 'p2', due: 'today',     status: 'doing',    priority: 'high' },
  { id: 'T-2202', title: 'Schedule mgmt presentation — Meridian', deal: 'DEAL-1210', owner: 'p1', due: 'today',     status: 'todo',    priority: 'high' },
  { id: 'T-2203', title: 'Send NDA countersign — Polaris',     deal: 'DEAL-1217', owner: 'p4', due: 'tomorrow',  status: 'todo',    priority: 'med' },
  { id: 'T-2204', title: 'Update cap table — Tessellate',     deal: 'DEAL-1218', owner: 'p4', due: 'May 22',    status: 'doing',   priority: 'med' },
  { id: 'T-2205', title: 'Counsel review — IP schedule',      deal: 'DEAL-1208', owner: 'p7', due: 'May 24',    status: 'todo',    priority: 'high' },
  { id: 'T-2206', title: 'Banker call — Halcyon',             deal: 'DEAL-1219', owner: 'p3', due: 'May 23',    status: 'todo',    priority: 'high' },
  { id: 'T-2207', title: 'Finalize working capital memo',     deal: 'DEAL-1210', owner: 'p1', due: 'May 28',    status: 'todo',    priority: 'high' },
  { id: 'T-2208', title: 'Customer reference calls (x5)',     deal: 'DEAL-1219', owner: 'p5', due: 'May 30',    status: 'todo',    priority: 'med' },
];

export const intelligence = [
  { tag: 'Playbook',   title: 'Running a tight LOI negotiation',          desc: 'The 12-point checklist our team uses before going to LOI. Includes red-flag language and walk-away thresholds.', readers: 14, updated: 'Apr 28' },
  { tag: 'Template',   title: 'Diligence request list — mid-market M&A',  desc: 'Battle-tested DD list covering 6 workstreams. Auto-populates the VDR request tracker.', readers: 88, updated: 'May 11' },
  { tag: 'Playbook',   title: 'Stage-gating capital raises',              desc: 'How to use pipeline stages to enforce deal hygiene without slowing momentum.', readers: 22, updated: 'May 02' },
  { tag: 'Reference',  title: 'Currency & FX policy',                     desc: 'How we report multi-currency deal values, hedging notes, and rate sources.', readers: 9,  updated: 'Mar 14' },
  { tag: 'Playbook',   title: 'Buyer diligence for licensing deals',      desc: 'IP-heavy diligence patterns: chain of title, encumbrances, and field-of-use analysis.', readers: 31, updated: 'May 06' },
  { tag: 'SOP',        title: 'Onboarding a counterparty to the VDR',     desc: 'Permissioning, watermarking, and audit log defaults for new external collaborators.', readers: 47, updated: 'May 17' },
  { tag: 'Template',   title: 'Term sheet — growth equity',               desc: 'Modular term sheet with anti-dilution, ROFR, and board observer language.', readers: 56, updated: 'Apr 22' },
  { tag: 'Compliance', title: 'ITAR & export-controlled deals',           desc: 'When ITAR applies and how to gate documents to cleared parties only.', readers: 12, updated: 'May 08' },
  { tag: 'Reference',  title: 'Currency-weighted pipeline value',         desc: 'How forecast roll-ups handle FX as deals progress through stages.', readers: 6,  updated: 'Apr 03' },
];

export const workspaces = [
  { id: 'all', name: 'All teams', color: 'var(--text-3)', members: PEOPLE },
  { id: 'corp-dev', name: 'Corporate Development', color: '#4f46e5', members: [PEOPLE[0], PEOPLE[1], PEOPLE[3]] },
  { id: 'legal', name: 'Legal Counsel', color: '#a21caf', members: [PEOPLE[6], PEOPLE[7]] },
  { id: 'finance', name: 'Finance & Strategy', color: '#0891b2', members: [PEOPLE[2], PEOPLE[4], PEOPLE[5]] },
];
