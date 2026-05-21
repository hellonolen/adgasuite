# ADGA Suite Agent Feature Map

This is the control document for avoiding rogue feature work. Every platform feature should be listed here and routed to at least one agent Markdown file plus any required JSON state file.

## Agent Count

ADGA Suite currently has 7 agent Markdown files:

| Agent | Markdown file | Primary ownership |
| --- | --- | --- |
| Conductor | `agents/conductor/SKILL.md` | Routing, sequencing, escalation, agent job records |
| Sales | `agents/sales/SKILL.md` | Leads, follow-up, pipeline risk, next action recommendations |
| Operations | `agents/operations/SKILL.md` | Onboarding, reminders, workspace hygiene, admin-safe operations |
| Documents | `agents/documents/SKILL.md` | Proposals, invoices, contracts, summaries, R2 document workflow |
| Intelligence | `agents/intelligence/SKILL.md` | Company profiles, battlecards, surveys, market notes |
| Communication | `agents/communication/SKILL.md` | SMS, email, calls, voice notes, meeting invites, record traceability |
| Payments | `agents/payments/SKILL.md` | Bank accounts, invoice connectors, payout setup, fee tracking |

Each listed agent has 1 Markdown file assigned to it.

## Feature Routing

| Feature area | Source requirements | Agent Markdown | JSON state |
| --- | --- | --- | --- |
| Lead intake, urgency, follow-up | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/sales/SKILL.md`, `agents/conductor/SKILL.md`, `agents/communication/SKILL.md` | `cloudflare/state/agent-job.schema.json`, `cloudflare/state/agent-event.schema.json` |
| Deal pipeline and represented client access | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/conductor/SKILL.md`, `agents/communication/SKILL.md`, `agents/sales/SKILL.md` | `cloudflare/state/client-portal.state.json`, `cloudflare/state/deal-communication.state.json` |
| Internal team communication | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/communication/SKILL.md`, `agents/conductor/SKILL.md` | `cloudflare/state/deal-communication.state.json` |
| Client communication | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/communication/SKILL.md`, `agents/sales/SKILL.md`, `agents/conductor/SKILL.md` | `cloudflare/state/deal-communication.state.json`, `cloudflare/state/client-portal.state.json` |
| Calendar and meeting invites | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/operations/SKILL.md`, `agents/communication/SKILL.md`, `agents/conductor/SKILL.md` | `cloudflare/state/agent-event.schema.json` |
| Voice notes, transcription, STT | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/communication/SKILL.md`, `agents/sales/SKILL.md`, `agents/conductor/SKILL.md` | `cloudflare/state/deal-communication.state.json` |
| SMS | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/communication/SKILL.md`, `agents/conductor/SKILL.md` | `cloudflare/state/deal-communication.state.json` |
| Documents and R2 storage | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md`, `docs/PRODUCTION_RUNBOOK.md` | `agents/documents/SKILL.md`, `agents/conductor/SKILL.md` | `cloudflare/state/agent-event.schema.json` |
| Invoicing center | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/payments/SKILL.md`, `agents/documents/SKILL.md`, `agents/communication/SKILL.md` | `cloudflare/state/invoice-connectors.state.json` |
| Bank-account payout setup | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/payments/SKILL.md`, `agents/operations/SKILL.md` | `cloudflare/state/invoice-connectors.state.json` |
| Stripe, PayPal, Whop, QuickBooks connectors | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/payments/SKILL.md`, `agents/conductor/SKILL.md` | `cloudflare/state/invoice-connectors.state.json` |
| Affiliate center | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/payments/SKILL.md`, `agents/operations/SKILL.md`, `agents/conductor/SKILL.md` | `cloudflare/state/agent-event.schema.json` |
| Intelligence and battlecards | `docs/PRODUCT_POSITIONING_AND_TOOL_BACKLOG.md` | `agents/intelligence/SKILL.md` | `cloudflare/state/agent-job.schema.json` |

## No-Rogue-Coding Rule

- A feature is not complete unless it has a product requirement, agent owner, state model when needed, D1/R2 boundary, and UI surface.
- UI pages can expose a feature, but the page is not the source of truth.
- Every outbound or stored action should have a resource trace.
- D1 stores metadata and state. R2 stores files, audio, generated invoice PDFs, uploads, and storage-heavy artifacts.
