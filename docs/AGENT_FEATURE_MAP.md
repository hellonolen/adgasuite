# ADGA Suite Agent Feature Map

This is the control document for avoiding rogue feature work. Every platform feature should be listed here and routed to at least one agent Markdown file plus any required JSON state file.

## Agent Count

ADGA Suite currently has 8 agent Markdown files:

| Agent | Markdown file | Primary ownership |
| --- | --- | --- |
| Conductor | `agents/conductor/SKILL.md` | Routing, sequencing, escalation, agent job records |
| Sales | `agents/sales/SKILL.md` | Leads, follow-up, pipeline risk, next action recommendations |
| Operations | `agents/operations/SKILL.md` | Onboarding, reminders, workspace hygiene, admin-safe operations |
| Documents | `agents/documents/SKILL.md` | Proposals, invoices, contracts, summaries, R2 document workflow |
| Intelligence | `agents/intelligence/SKILL.md` | Company profiles, battlecards, surveys, market notes |
| Communication | `agents/communication/SKILL.md` | SMS, email, calls, voice notes, meeting invites, record traceability |
| Payments | `agents/payments/SKILL.md` | Bank accounts, invoice connectors, payout setup, fee tracking |
| VoiceAgent | `agents/voice/SKILL.md` | Inbound calls, outbound calls, scheduling, recording, transcription, call summaries, post-call execution |

Each listed agent has 1 Markdown file assigned to it.

## Feature Routing

| Feature area | Source requirements | Agent Markdown | JSON state |
| --- | --- | --- | --- |
| Visual system and UI standardization | `docs/DESIGN_SYSTEM.md`, `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/operations/SKILL.md`, `agents/conductor/SKILL.md` | `cloudflare/state/agent-event.schema.json` |
| Agentic operating spine | `docs/ADGA_AGENTIC_OPERATING_SPINE.md`, `docs/ADGA_AGENTIC_TASKS.json` | `agents/conductor/SKILL.md`, `agents/operations/SKILL.md` | `cloudflare/state/agent-event.schema.json`, `cloudflare/state/agent-job.schema.json` |
| Platform-wide search and retrieval | `docs/ADGA_AGENTIC_OPERATING_SPINE.md`, `docs/ADGA_AGENTIC_TASKS.json` | `agents/intelligence/SKILL.md`, `agents/conductor/SKILL.md` | `cloudflare/state/workspace-search.schema.json`, `cloudflare/state/record-graph.schema.json` |
| Persistent deal memory | `docs/ADGA_AGENTIC_OPERATING_SPINE.md`, `docs/ADGA_AGENTIC_TASKS.json` | `agents/sales/SKILL.md`, `agents/conductor/SKILL.md` | `cloudflare/state/deal-memory.schema.json`, `cloudflare/state/agent-event.schema.json` |
| Event engine and autonomous monitoring | `docs/ADGA_AGENTIC_OPERATING_SPINE.md`, `docs/ADGA_AGENTIC_TASKS.json` | `agents/conductor/SKILL.md`, `agents/sales/SKILL.md`, `agents/operations/SKILL.md` | `cloudflare/state/agent-event.schema.json`, `cloudflare/state/agent-job.schema.json` |
| Prepared actions and approval lanes | `docs/ADGA_AGENTIC_OPERATING_SPINE.md`, `docs/ADGA_AGENTIC_TASKS.json` | `agents/conductor/SKILL.md`, `agents/operations/SKILL.md` | `cloudflare/state/prepared-action.schema.json`, `cloudflare/state/agent-event.schema.json` |
| Lead intake, urgency, follow-up | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/sales/SKILL.md`, `agents/conductor/SKILL.md`, `agents/communication/SKILL.md` | `cloudflare/state/agent-job.schema.json`, `cloudflare/state/agent-event.schema.json` |
| Deal pipeline and represented client access | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/conductor/SKILL.md`, `agents/communication/SKILL.md`, `agents/sales/SKILL.md` | `cloudflare/state/client-portal.state.json`, `cloudflare/state/deal-communication.state.json` |
| Internal team communication | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/communication/SKILL.md`, `agents/conductor/SKILL.md` | `cloudflare/state/deal-communication.state.json` |
| Client communication | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/communication/SKILL.md`, `agents/sales/SKILL.md`, `agents/conductor/SKILL.md` | `cloudflare/state/deal-communication.state.json`, `cloudflare/state/client-portal.state.json` |
| Calendar and meeting invites | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/operations/SKILL.md`, `agents/communication/SKILL.md`, `agents/conductor/SKILL.md` | `cloudflare/state/agent-event.schema.json` |
| Voice notes, transcription, STT | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/communication/SKILL.md`, `agents/sales/SKILL.md`, `agents/conductor/SKILL.md` | `cloudflare/state/deal-communication.state.json` |
| VoiceAgent calls, recording, transcription, scheduling, post-call execution | `docs/ADGA_AGENTIC_OPERATING_SPINE.md`, `docs/ADGA_AGENTIC_TASKS.json` | `agents/voice/SKILL.md`, `agents/communication/SKILL.md`, `agents/sales/SKILL.md`, `agents/conductor/SKILL.md` | `cloudflare/state/voice-call.state.schema.json`, `cloudflare/state/deal-communication.state.json`, `cloudflare/state/agent-event.schema.json`, `cloudflare/state/agent-job.schema.json` |
| SMS | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/communication/SKILL.md`, `agents/conductor/SKILL.md` | `cloudflare/state/deal-communication.state.json` |
| Documents and R2 storage | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md`, `docs/PRODUCTION_RUNBOOK.md` | `agents/documents/SKILL.md`, `agents/conductor/SKILL.md` | `cloudflare/state/agent-event.schema.json` |
| Invoicing center | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/payments/SKILL.md`, `agents/documents/SKILL.md`, `agents/communication/SKILL.md` | `cloudflare/state/invoice-connectors.state.json` |
| Bank-account payout setup | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/payments/SKILL.md`, `agents/operations/SKILL.md` | `cloudflare/state/invoice-connectors.state.json` |
| Stripe, PayPal, Whop, QuickBooks connectors | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/payments/SKILL.md`, `agents/conductor/SKILL.md` | `cloudflare/state/invoice-connectors.state.json` |
| Affiliate center | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/payments/SKILL.md`, `agents/operations/SKILL.md`, `agents/conductor/SKILL.md` | `cloudflare/state/agent-event.schema.json` |
| ADP affiliate payroll lead page | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/sales/SKILL.md`, `agents/communication/SKILL.md`, `agents/conductor/SKILL.md` | `cloudflare/state/agent-event.schema.json` |
| Intelligence and battlecards | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/intelligence/SKILL.md` | `cloudflare/state/agent-job.schema.json` |

## Phase 11 additions — The Journey + The Call + Maps

| Feature area | Source requirements | Agent Markdown | JSON state |
| --- | --- | --- | --- |
| The Journey (deal stages: Lead → Qualify → Discover → Scope → Design → Close → Sign → Deliver → Expand) | `docs/ADGA_DEAL_SYSTEM.md` | `agents/conductor/SKILL.md`, `agents/sales/SKILL.md` | uses existing `cloudflare/state/agent-event.schema.json` for stage transition events |
| The Call (call template: Connect → Why → Situation → Tried → Ready → The wall → Future state → Close → Investment → Commitment → Sign) | `docs/ADGA_DEAL_SYSTEM.md` | `agents/communication/SKILL.md`, `agents/voice/SKILL.md`, `agents/sales/SKILL.md` | uses existing `cloudflare/state/voice-call.state.schema.json` |
| Deal Templates (Acquire, Series A/B, 10K, Fix & Flip, M&A, Partnership, Licensing, Procurement, Services/Agency, High-ticket sale, Custom, Capital raise) | `docs/ADGA_DEAL_SYSTEM.md`, `lib/templates.ts` | `agents/operations/SKILL.md`, `agents/conductor/SKILL.md` | `cloudflare/state/deal-template.schema.json` |
| Maps (persistence) — nodes / edges / positions | `docs/ADGA_DEAL_SYSTEM.md` | `agents/conductor/SKILL.md`, `agents/operations/SKILL.md` | new D1 tables: `maps`, `map_nodes`, `map_edges` (migration `0012_maps.sql`) |
| Maps gallery + workspace-wide map view | `docs/ADGA_DEAL_SYSTEM.md` | `agents/operations/SKILL.md` | derived from `maps` + `deals` + `contacts` + `deal_contacts` |
| Map share (public read-only) | `docs/ADGA_DEAL_SYSTEM.md` | `agents/operations/SKILL.md`, `agents/documents/SKILL.md`, `agents/conductor/SKILL.md` | `cloudflare/state/map-share.state.schema.json` + D1 `map_shares` (migration `0013_map_shares.sql`) |
| Contacts directory (workspace-wide) | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/sales/SKILL.md`, `agents/communication/SKILL.md`, `agents/operations/SKILL.md` | `cloudflare/state/contact.state.schema.json` |
| Calendar surface | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/operations/SKILL.md`, `agents/communication/SKILL.md` | uses existing `cloudflare/state/agent-event.schema.json` |
| Affiliate Center (self-service) | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/payments/SKILL.md`, `agents/operations/SKILL.md`, `agents/conductor/SKILL.md` | `cloudflare/state/affiliate-center.state.schema.json` |
| Customer Settings (profile, notifications, integrations, billing) | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/operations/SKILL.md` | stub `/api/settings` — durable schema deferred |
| Admin Section (team, roles, audit, workspace — owner only) | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/operations/SKILL.md`, `agents/conductor/SKILL.md` | uses existing `cloudflare/state/agent-event.schema.json` + new `audit_log` table |
| Agent Chat (right-rail, Kimi 2.6, context-aware) | `docs/ADGA_DEAL_SYSTEM.md`, `wrangler.toml` (AI binding) | `agents/conductor/SKILL.md` (router), routes to every downstream agent | `cloudflare/state/agent-chat.schema.json` |
| Scheduled() cron loop (autonomous backbone) | `docs/ADGA_AGENTIC_OPERATING_SPINE.md`, `wrangler.toml` (cron triggers) | `agents/conductor/SKILL.md` | uses existing `cloudflare/state/agent-job.schema.json` (cron drains queued jobs every 5 min) |
| Suite sidebar restructure (15-item grouped layout) | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/operations/SKILL.md` (workspace hygiene) | UI-only — no new durable state |

## No-Rogue-Coding Rule

- A feature is not complete unless it has a product requirement, agent owner, state model when needed, D1/R2 boundary, and UI surface.
- Agentic work must start in markdown and JSON before UI or API implementation.
- UI pages can expose a feature, but the page is not the source of truth.
- Every outbound or stored action should have a resource trace.
- D1 stores metadata and state. R2 stores files, audio, generated invoice PDFs, uploads, and storage-heavy artifacts.
