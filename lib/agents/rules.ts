export const businessEvents = [
  "lead.created",
  "lead.status_changed",
  "lead.scored",
  "contact.created",
  "deal.stage_changed",
  "task.completed",
  "calendar_event.created",
  "calendar_event.updated",
  "meeting.scheduled",
  "proposal.sent",
  "invoice.paid",
  "contract.signed",
  "knowledge_page.published",
  "company_intelligence.generated",
  "subscription.changed",
  "user.invited",
  "agent_job.completed",
  "agent_recommendation.accepted",
  "agent_recommendation.rejected",
] as const;

export type BusinessEvent = (typeof businessEvents)[number];

export const agentModules = [
  { id: "conductor", name: "Conductor", role: "Routes events and coordinates work." },
  { id: "sales", name: "Sales", role: "Scores leads, recommends follow-up, monitors pipeline risk." },
  { id: "intelligence", name: "Intelligence", role: "Builds company profiles, battlecards, and market signals." },
  { id: "documents", name: "Documents", role: "Drafts proposals, summarizes files, prepares contract metadata." },
  { id: "operations", name: "Operations", role: "Handles onboarding, reminders, workflow hygiene, and setup gaps." },
] as const;
