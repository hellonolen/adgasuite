// Seed knowledge articles shown in /suite/templates for unauthenticated previews and brand-new
// workspaces. A real workspace populates this from its own D1 records on first sign-in.

export interface KnowledgeArticle {
  tag: string;
  title: string;
  desc: string;
  readers: number;
  updated: string;
}

export const KNOWLEDGE: KnowledgeArticle[] = [
  { tag: "Playbook",   title: "Running a tight LOI negotiation",          desc: "The 12-point checklist our team uses before going to LOI. Includes red-flag language and walk-away thresholds.", readers: 14, updated: "Apr 28" },
  { tag: "Template",   title: "Diligence request list — mid-market M&A",  desc: "Battle-tested DD list covering 6 workstreams. Auto-populates the VDR request tracker.",                            readers: 88, updated: "May 11" },
  { tag: "Playbook",   title: "Stage-gating capital raises",              desc: "How to use pipeline stages to enforce deal hygiene without slowing momentum.",                                  readers: 22, updated: "May 02" },
  { tag: "Reference",  title: "Currency & FX policy",                     desc: "How we report multi-currency deal values, hedging notes, and rate sources.",                                    readers: 9,  updated: "Mar 14" },
  { tag: "Playbook",   title: "Buyer diligence for licensing deals",      desc: "IP-heavy diligence patterns: chain of title, encumbrances, and field-of-use analysis.",                         readers: 31, updated: "May 06" },
  { tag: "SOP",        title: "Onboarding a counterparty to the VDR",     desc: "Permissioning, watermarking, and audit log defaults for new external collaborators.",                           readers: 47, updated: "May 17" },
  { tag: "Template",   title: "Term sheet — growth equity",               desc: "Modular term sheet with anti-dilution, ROFR, and board observer language.",                                     readers: 56, updated: "Apr 22" },
  { tag: "Compliance", title: "ITAR & export-controlled deals",           desc: "When ITAR applies and how to gate documents to cleared parties only.",                                         readers: 12, updated: "May 08" },
  { tag: "Reference",  title: "Currency-weighted pipeline value",         desc: "How forecast roll-ups handle FX as deals progress through stages.",                                             readers: 6,  updated: "Apr 03" },
];
