export type LeadStatus = "Hot" | "Warm" | "Cold";
export type DealStage = "Prospect" | "Qualified" | "Proposal" | "Negotiation" | "Won" | "Lost";
export type TaskStatus = "pending" | "in_progress" | "completed";

export interface Lead {
  id: string;
  fullName: string;
  email: string;
  company: string;
  jobTitle: string;
  source: string;
  status: LeadStatus;
  score: number;
  ownerName: string;
  lastContact: string;
  nextAction: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  status: "lead" | "active" | "customer" | "inactive";
}

export interface Deal {
  id: string;
  name: string;
  contactName: string;
  company: string;
  value: number;
  stage: DealStage;
  probability: number;
}

export interface Task {
  id: string;
  title: string;
  contactName: string;
  priority: "low" | "medium" | "high";
  status: TaskStatus;
  due: string;
}

export interface KnowledgeWorkspace {
  id: string;
  name: string;
  description: string;
  pages: Array<{ id: string; title: string; updated: string; summary: string }>;
}

export interface SuiteDocument {
  id: string;
  type: "Proposal" | "Invoice" | "Contract";
  title: string;
  recipient: string;
  company: string;
  amount: number;
  status: string;
  updated: string;
}

export interface CompanyIntel {
  id: string;
  name: string;
  domain: string;
  industry: string;
  signal: string;
  status: string;
}

export const leads: Lead[] = [
  {
    id: "lead_001",
    fullName: "Marcus Webb",
    email: "marcus.webb@axiomgroup.com",
    company: "Axiom Group",
    jobTitle: "VP Operations",
    source: "Suite inquiry",
    status: "Hot",
    score: 91,
    ownerName: "ADGA Sales",
    lastContact: "Today",
    nextAction: "Send implementation plan",
  },
  {
    id: "lead_002",
    fullName: "Diana Fong",
    email: "diana@peakco.com",
    company: "Peak Co",
    jobTitle: "Founder",
    source: "Pricing page",
    status: "Warm",
    score: 74,
    ownerName: "ADGA Sales",
    lastContact: "Yesterday",
    nextAction: "Schedule fit call",
  },
  {
    id: "lead_003",
    fullName: "Jordan Ellis",
    email: "jordan@northbridge.io",
    company: "NorthBridge",
    jobTitle: "Revenue Director",
    source: "Referral",
    status: "Warm",
    score: 68,
    ownerName: "ADGA Sales",
    lastContact: "3 days ago",
    nextAction: "Send CRM workflow sample",
  },
];

export const contacts: Contact[] = [
  { id: "contact_001", firstName: "Priya", lastName: "Nair", email: "priya@vertexsys.com", phone: "(646) 555-0311", company: "Vertex Systems", title: "CTO", status: "customer" },
  { id: "contact_002", firstName: "Caleb", lastName: "Oduya", email: "caleb@luminary.co", phone: "(212) 555-0140", company: "Luminary Co", title: "Managing Partner", status: "active" },
  { id: "contact_003", firstName: "Elena", lastName: "Ruiz", email: "elena@cobaltline.com", phone: "(305) 555-0188", company: "Cobalt Line", title: "Head of Growth", status: "lead" },
];

export const deals: Deal[] = [
  { id: "deal_001", name: "Axiom Suite Rollout", contactName: "Marcus Webb", company: "Axiom Group", value: 48000, stage: "Negotiation", probability: 75 },
  { id: "deal_002", name: "Peak Co Growth Team", contactName: "Diana Fong", company: "Peak Co", value: 12500, stage: "Proposal", probability: 55 },
  { id: "deal_003", name: "Vertex Operations Platform", contactName: "Priya Nair", company: "Vertex Systems", value: 72000, stage: "Won", probability: 100 },
];

export const tasks: Task[] = [
  { id: "task_001", title: "Review Axiom implementation objections", contactName: "Marcus Webb", priority: "high", status: "pending", due: "Today" },
  { id: "task_002", title: "Draft Peak Co onboarding proposal", contactName: "Diana Fong", priority: "medium", status: "in_progress", due: "Tomorrow" },
  { id: "task_003", title: "Update Vertex renewal notes", contactName: "Priya Nair", priority: "low", status: "completed", due: "Yesterday" },
];

export const workspaces: KnowledgeWorkspace[] = [
  {
    id: "ws_001",
    name: "Sales Playbooks",
    description: "Talk tracks, qualification rules, and objection handling.",
    pages: [
      { id: "page_001", title: "Suite Qualification Framework", updated: "Today", summary: "How to qualify platform-fit teams." },
      { id: "page_002", title: "Implementation Objections", updated: "Yesterday", summary: "Common objections and practical responses." },
    ],
  },
  {
    id: "ws_002",
    name: "Operations",
    description: "Workspace setup, onboarding, and account health.",
    pages: [
      { id: "page_003", title: "New Workspace Checklist", updated: "2 days ago", summary: "Steps for provisioning new ADGA workspaces." },
    ],
  },
];

export const documents: SuiteDocument[] = [
  { id: "doc_001", type: "Proposal", title: "Axiom Suite Implementation", recipient: "Marcus Webb", company: "Axiom Group", amount: 48000, status: "Sent", updated: "Today" },
  { id: "doc_002", type: "Invoice", title: "Vertex Suite Renewal", recipient: "Priya Nair", company: "Vertex Systems", amount: 36000, status: "Paid", updated: "Yesterday" },
  { id: "doc_003", type: "Contract", title: "Peak Co Platform Terms", recipient: "Diana Fong", company: "Peak Co", amount: 12500, status: "Draft", updated: "3 days ago" },
];

export const intelligence: CompanyIntel[] = [
  { id: "intel_001", name: "Axiom Group", domain: "axiomgroup.com", industry: "Operations consulting", signal: "High implementation urgency", status: "Active" },
  { id: "intel_002", name: "Peak Co", domain: "peakco.com", industry: "Growth services", signal: "Needs workspace workflow clarity", status: "Researching" },
  { id: "intel_003", name: "NorthBridge", domain: "northbridge.io", industry: "B2B services", signal: "CRM replacement timing", status: "Watch" },
];
