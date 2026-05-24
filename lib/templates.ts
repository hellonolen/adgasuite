/**
 * Deal Templates — pre-populated DealFlow shapes for the 13 deal archetypes.
 *
 * Each template defines the nodes and edges that get materialized into a fresh
 * DealFlow when the user selects "Use this template" from the gallery.
 *
 * The kind values mirror DealFlowEntityKind from components/suite/DealFlow.tsx.
 */

export type TemplateNodeKind =
  | "contact"
  | "company"
  | "document"
  | "task"
  | "call"
  | "meeting"
  | "action";

export type TemplateNodeStatus = "neutral" | "active" | "warning" | "overdue" | "done";

export interface TemplateNode {
  id: string;
  kind: TemplateNodeKind;
  label: string;
  sublabel?: string;
  status?: TemplateNodeStatus;
}

export interface TemplateEdge {
  source: string;
  target: string;
}

export interface DealTemplate {
  id: string;
  name: string;
  description: string;
  deal_type: string;
  category: "Capital" | "M&A" | "Real Estate" | "Commercial" | "Sales" | "Other";
  nodes: TemplateNode[];
  edges: TemplateEdge[];
}

/**
 * Helper: connect every entity node to the deal anchor (id: "deal").
 * Most templates use a hub-and-spoke shape by default.
 */
function spokeEdges(nodes: TemplateNode[]): TemplateEdge[] {
  return nodes
    .filter((n) => n.id !== "deal")
    .map((n) => ({ source: "deal", target: n.id }));
}

const acquireNodes: TemplateNode[] = [
  { id: "buyer", kind: "company", label: "Buyer", sublabel: "Acquiring entity" },
  { id: "seller", kind: "company", label: "Seller", sublabel: "Target entity" },
  { id: "counsel", kind: "contact", label: "Counsel", sublabel: "Deal counsel", status: "active" },
  { id: "banker", kind: "contact", label: "Banker", sublabel: "Sell-side advisor" },
  { id: "accountant", kind: "contact", label: "Accountant", sublabel: "Audit / QofE" },
  { id: "cim", kind: "document", label: "CIM", sublabel: "Confidential info memo", status: "done" },
  { id: "loi", kind: "document", label: "LOI", sublabel: "Letter of intent", status: "active" },
  { id: "spa", kind: "document", label: "SPA", sublabel: "Share purchase agreement" },
  { id: "diligence", kind: "task", label: "Diligence room", sublabel: "Open data room", status: "active" },
  { id: "close-call", kind: "call", label: "Close call", sublabel: "Signing call" },
  { id: "integration", kind: "task", label: "Integration plan", sublabel: "Day-1 / 100-day plan" },
];

const seriesANodes: TemplateNode[] = [
  { id: "lead", kind: "company", label: "Lead investor", sublabel: "Setting terms", status: "active" },
  { id: "co-investors", kind: "company", label: "Co-investors", sublabel: "Allocation TBD" },
  { id: "counsel", kind: "contact", label: "Counsel", sublabel: "Company counsel" },
  { id: "deck", kind: "document", label: "Pitch deck", sublabel: "Latest version", status: "done" },
  { id: "data-room", kind: "document", label: "Data room", sublabel: "Diligence materials", status: "active" },
  { id: "term-sheet", kind: "document", label: "Term sheet", sublabel: "Under negotiation", status: "active" },
  { id: "ic-date", kind: "meeting", label: "IC date", sublabel: "Investment committee", status: "warning" },
  { id: "wire-deadline", kind: "action", label: "Wire deadline", sublabel: "Funds due", status: "warning" },
];

const seriesBNodes: TemplateNode[] = [
  ...seriesANodes,
  { id: "board-seat", kind: "action", label: "Board seat", sublabel: "Lead takes seat" },
  { id: "pro-rata", kind: "contact", label: "Pro-rata holders", sublabel: "Existing investors" },
  { id: "anti-dilution", kind: "contact", label: "Anti-dilution counsel", sublabel: "Cap table review" },
];

const capitalRaiseNodes: TemplateNode[] = [
  { id: "lead", kind: "company", label: "Lead", sublabel: "Anchor investor", status: "active" },
  { id: "co-investors", kind: "company", label: "Co-investors", sublabel: "Syndicate" },
  { id: "counsel", kind: "contact", label: "Counsel", sublabel: "Deal counsel" },
  { id: "deck", kind: "document", label: "Pitch deck", status: "done" },
  { id: "data-room", kind: "document", label: "Data room", sublabel: "Diligence" },
  { id: "term-sheet", kind: "document", label: "Term sheet", status: "active" },
];

const tenKFilingNodes: TemplateNode[] = [
  { id: "underwriter", kind: "company", label: "Underwriter", sublabel: "Lead bank" },
  { id: "counsel", kind: "contact", label: "Counsel", sublabel: "Securities counsel" },
  { id: "auditor", kind: "contact", label: "Auditor", sublabel: "PCAOB firm" },
  { id: "drafting", kind: "task", label: "Drafting working group", sublabel: "Weekly calls", status: "active" },
  { id: "sec-review", kind: "task", label: "SEC review", sublabel: "Comment cycle", status: "warning" },
  { id: "roadshow", kind: "meeting", label: "Roadshow", sublabel: "Investor meetings" },
];

const fixAndFlipNodes: TemplateNode[] = [
  { id: "property", kind: "company", label: "Property", sublabel: "Subject address" },
  { id: "lender", kind: "company", label: "Lender", sublabel: "Hard money / bank", status: "active" },
  { id: "contractor", kind: "contact", label: "Contractor", sublabel: "GC for rehab" },
  { id: "inspector", kind: "contact", label: "Inspector", sublabel: "Pre-close inspection" },
  { id: "insurance", kind: "document", label: "Insurance", sublabel: "Builder's risk" },
  { id: "arv", kind: "document", label: "ARV calc", sublabel: "After-repair value", status: "done" },
  { id: "sale-agent", kind: "contact", label: "Sale agent", sublabel: "Listing broker" },
];

const mnaNodes: TemplateNode[] = [
  { id: "buyer", kind: "company", label: "Buyer", sublabel: "Acquirer" },
  { id: "target", kind: "company", label: "Target", sublabel: "Acquiree" },
  { id: "advisors", kind: "contact", label: "Advisors", sublabel: "Banker + counsel" },
  { id: "nda", kind: "document", label: "NDA", sublabel: "Mutual NDA", status: "done" },
  { id: "cim", kind: "document", label: "CIM", sublabel: "Confidential info memo", status: "done" },
  { id: "ioi", kind: "document", label: "IOI", sublabel: "Indication of interest", status: "done" },
  { id: "loi", kind: "document", label: "LOI", sublabel: "Letter of intent", status: "active" },
  { id: "diligence", kind: "task", label: "Diligence", sublabel: "Data room open", status: "active" },
  { id: "spa", kind: "document", label: "SPA", sublabel: "Share purchase agreement" },
  { id: "close", kind: "call", label: "Close", sublabel: "Signing call" },
  { id: "integration", kind: "task", label: "100-day integration", sublabel: "Post-close plan" },
];

const partnershipNodes: TemplateNode[] = [
  { id: "counterparty", kind: "company", label: "Counterparty", sublabel: "Partner entity", status: "active" },
  { id: "stakeholders", kind: "contact", label: "Stakeholders", sublabel: "Both sides" },
  { id: "term-sheet", kind: "document", label: "Term sheet", sublabel: "Headline terms", status: "active" },
  { id: "commercial", kind: "document", label: "Commercial terms", sublabel: "Pricing + scope" },
  { id: "launch", kind: "task", label: "Launch plan", sublabel: "Go-live runbook" },
];

const licensingNodes: TemplateNode[] = [
  { id: "counterparty", kind: "company", label: "Counterparty", sublabel: "Licensor / licensee" },
  { id: "rights", kind: "document", label: "Rights", sublabel: "Scope of license" },
  { id: "term-sheet", kind: "document", label: "Term sheet", status: "active" },
  { id: "review", kind: "task", label: "Review cycles", sublabel: "Redlines", status: "active" },
  { id: "renewal", kind: "action", label: "Renewal", sublabel: "Auto-renew terms" },
];

const procurementNodes: TemplateNode[] = [
  { id: "vendor", kind: "company", label: "Vendor", sublabel: "Selected supplier", status: "active" },
  { id: "quotes", kind: "document", label: "Quotes", sublabel: "Bid comparison", status: "done" },
  { id: "criteria", kind: "document", label: "Decision criteria", sublabel: "Scorecard" },
  { id: "approvals", kind: "task", label: "Approvals", sublabel: "Internal sign-off", status: "warning" },
  { id: "contract", kind: "document", label: "Contract", sublabel: "MSA + SOW" },
  { id: "delivery", kind: "task", label: "Delivery", sublabel: "Implementation" },
];

const servicesAgencyNodes: TemplateNode[] = [
  { id: "client", kind: "company", label: "Client", sublabel: "Engaged party", status: "active" },
  { id: "discovery", kind: "call", label: "Discovery call", sublabel: "Goals + constraints", status: "done" },
  { id: "tech-call", kind: "call", label: "Tech call", sublabel: "Architecture review" },
  { id: "scope", kind: "document", label: "Scope", sublabel: "Statement of work", status: "active" },
  { id: "sprints", kind: "task", label: "Sprints", sublabel: "Delivery cadence" },
  { id: "onboarding", kind: "task", label: "Onboarding", sublabel: "Kickoff + access" },
];

const highTicketSaleNodes: TemplateNode[] = [
  { id: "lead", kind: "contact", label: "Lead", sublabel: "Decision-maker", status: "active" },
  { id: "discovery", kind: "call", label: "Discovery call", sublabel: "Qualification", status: "done" },
  { id: "demo", kind: "meeting", label: "Demo", sublabel: "Product walkthrough", status: "active" },
  { id: "proposal", kind: "document", label: "Proposal", sublabel: "Custom pricing" },
  { id: "procurement", kind: "task", label: "Procurement", sublabel: "Buyer's process" },
  { id: "close", kind: "action", label: "Close", sublabel: "Signed + paid" },
];

const customNodes: TemplateNode[] = [];

export const TEMPLATES: DealTemplate[] = [
  {
    id: "acquire",
    name: "Acquisition",
    description: "End-to-end buy-side acquisition with counsel, banker, diligence and integration.",
    deal_type: "Acquisition",
    category: "M&A",
    nodes: acquireNodes,
    edges: spokeEdges(acquireNodes),
  },
  {
    id: "series-a",
    name: "Series A raise",
    description: "Priced equity round with lead investor, term sheet and wire deadline.",
    deal_type: "Series A",
    category: "Capital",
    nodes: seriesANodes,
    edges: spokeEdges(seriesANodes),
  },
  {
    id: "series-b",
    name: "Series B raise",
    description: "Growth round with board seat, pro-rata holders and anti-dilution review.",
    deal_type: "Series B",
    category: "Capital",
    nodes: seriesBNodes,
    edges: spokeEdges(seriesBNodes),
  },
  {
    id: "capital-raise",
    name: "Capital raise",
    description: "Generic raise: lead, co-investors, counsel, deck, data room and term sheet.",
    deal_type: "Capital raise",
    category: "Capital",
    nodes: capitalRaiseNodes,
    edges: spokeEdges(capitalRaiseNodes),
  },
  {
    id: "10k-filing",
    name: "10K filing",
    description: "Public filing with underwriter, counsel, auditor, SEC review and roadshow.",
    deal_type: "10K filing",
    category: "Capital",
    nodes: tenKFilingNodes,
    edges: spokeEdges(tenKFilingNodes),
  },
  {
    id: "fix-and-flip",
    name: "Fix & Flip",
    description: "Single-property flip with lender, contractor, inspector, ARV and sale agent.",
    deal_type: "Fix & Flip",
    category: "Real Estate",
    nodes: fixAndFlipNodes,
    edges: spokeEdges(fixAndFlipNodes),
  },
  {
    id: "mna",
    name: "M&A",
    description: "Full M&A workflow from NDA through SPA, close and 100-day integration.",
    deal_type: "M&A",
    category: "M&A",
    nodes: mnaNodes,
    edges: spokeEdges(mnaNodes),
  },
  {
    id: "partnership",
    name: "Partnership",
    description: "Strategic partnership with counterparty, term sheet and launch plan.",
    deal_type: "Partnership",
    category: "Commercial",
    nodes: partnershipNodes,
    edges: spokeEdges(partnershipNodes),
  },
  {
    id: "licensing",
    name: "Licensing",
    description: "Rights deal with review cycles and renewal terms.",
    deal_type: "Licensing",
    category: "Commercial",
    nodes: licensingNodes,
    edges: spokeEdges(licensingNodes),
  },
  {
    id: "procurement",
    name: "Procurement",
    description: "Vendor selection through quotes, approvals, contract and delivery.",
    deal_type: "Procurement",
    category: "Commercial",
    nodes: procurementNodes,
    edges: spokeEdges(procurementNodes),
  },
  {
    id: "services-agency",
    name: "Services / Agency",
    description: "Client engagement from discovery through scope, sprints and onboarding.",
    deal_type: "Services",
    category: "Sales",
    nodes: servicesAgencyNodes,
    edges: spokeEdges(servicesAgencyNodes),
  },
  {
    id: "high-ticket-sale",
    name: "High-ticket sale",
    description: "Enterprise sale from lead through demo, proposal and close.",
    deal_type: "High-ticket sale",
    category: "Sales",
    nodes: highTicketSaleNodes,
    edges: spokeEdges(highTicketSaleNodes),
  },
  {
    id: "custom",
    name: "Custom",
    description: "Empty map with just the deal node. Build the shape yourself.",
    deal_type: "Custom",
    category: "Other",
    nodes: customNodes,
    edges: [],
  },
];

export function getTemplate(id: string): DealTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export const TEMPLATE_CATEGORIES: DealTemplate["category"][] = [
  "Capital",
  "M&A",
  "Real Estate",
  "Commercial",
  "Sales",
  "Other",
];
