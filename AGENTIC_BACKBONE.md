# ADGA Suite — Agentic Backbone

> Project conforms to the canonical structure in `~/.claude/rules/common/agentic-backbone.md`.
> This file lists project-specific overrides only. Read the canonical doc for the framework.

Last audited: 2026-05-24

## North star
$1,000,000/month ARR. Every architectural decision ties back to closing deals on the platform.

## Tech stack
- Next.js 15 (App Router) running on Cloudflare Workers via `@opennextjs/cloudflare`
- Cloudflare D1 for deal records, leads, contacts, documents, calendar, agent jobs, events
- Cloudflare R2 for documents, voice notes, generated assets
- Cloudflare KV / Durable Objects (TBD for agent state, currently in-process)
- Cloudflare AI bindings for the Kimi 2.6 chat surface (`/api/agent/chat`)

## 7-Agent mapping (project-specific names)
The canonical 7 agents (Conductor, Research, Creative, Production, Distribution, Sales, Intelligence)
exist in this project under the following directories — names retained for historical reasons but
roles aligned per the canonical doc:

| Canonical    | Project folder                  | Decides                                             |
|--------------|---------------------------------|-----------------------------------------------------|
| Conductor    | `agents/conductor/`             | Which cycle runs, when to escalate, autonomy gates  |
| Research     | `agents/intelligence/`          | Pipeline risk, forecast deltas, gap detection       |
| Creative     | `agents/communication/`         | Outbound drafts, follow-ups, voice/SMS responses    |
| Production   | `agents/documents/`             | Document assembly, template materialization         |
| Distribution | `agents/communication/` (split) | Channel selection, send timing                      |
| Sales        | `agents/sales/`                 | Lead qualification, nurture sequences, close timing |
| Intelligence | `agents/intelligence/`          | Revenue monitoring, gap escalation, win-rate analysis |

Additional folders (`agents/operations/`, `agents/payments/`, `agents/voice/`) wrap operational
surfaces and third-party tool boundaries. They remain first-class job owners in ADGA state contracts
so scheduling, payments, calls, and approvals can be audited directly, while the canonical 7-agent
mapping above remains the reasoning framework.

## Runtime job owner enum
Agent jobs may be owned by:

- `conductor`
- `sales`
- `intelligence`
- `documents`
- `operations`
- `communication`
- `payments`
- `voice`

This enum is locked in `cloudflare/state/agent-job.schema.json` and shared by prepared actions,
deal memory, record graph generation, and outcome rollups.

## State contract index
Backbone/state contracts live under `cloudflare/state/`:

- `prepared-action.schema.json` — approval lanes for agent-prepared work
- `record-graph.schema.json` — relationships across records
- `workspace-search.schema.json` — search/retrieval result shape
- `deal-memory.schema.json` — persistent deal context
- `agentic-outcomes.schema.json` — measurable agent work rollups
- `audit-log.schema.json` — append-only audit record shape
- `document.schema.json` — document metadata and R2 version boundary
- `calendar-event.schema.json` — calendar events and invite delivery
- `dealflow-map.schema.json` — map nodes, edges, positions, and resource bindings
- `import-batch.schema.json` — single ingest operation (CSV / paste / adapter); row counts + lifecycle
- `import-row.schema.json` — per-row outcome of an ImportBatch; failed rows are the dead-letter
- `list.schema.json` — saved filtered segment over a target record type (resolved live, no materialization)
- `email-sync-cursor.schema.json` — per-mailbox sync resume state (provider, account, opaque cursor)
- `custom-object.schema.json` — user-defined record type metadata + field schema
- `record-comment.schema.json` — threaded comment + reaction + @mention shape

## Skills (`skills/*.skill.md`)

### Markdown contracts (behavior + recovery + telemetry per skill)

Original suite:
- `lead-scoring` — owner: Sales — scores inbound leads against ICP
- `pipeline-risk` — owner: Intelligence — surfaces slipping deals
- `proposal-generation` — owner: Creative — drafts proposals from a deal record
- `battlecard-generation` — owner: Research — competitive context per deal
- `knowledge-summary` — owner: Research — summarizes uploaded docs
- `prepared-action` — owner: Conductor / Operations — queues approval-lane work
- `deal-memory` — owner: Sales / Conductor — maintains persistent deal context
- `workspace-activation` — owner: Conductor — turns a paid checkout into a ready workspace
- `dealflow-template-materialization` — owner: Conductor — populates a canvas from a template
- `daily-brief` — owner: Conductor — composes the `/suite/home` brief
- `team-invite` / `team-invite.accept` — owner: Sales — invitation lifecycle

Import wedge (source-agnostic ingest — `import-batch` + `import-row` shared state contracts):
- `csv-import` — owner: Operations — CSV/paste record ingest, MVP target
- `import-hubspot` — owner: Operations — HubSpot adapter (stub: returns not_implemented)
- `import-pipedrive` — owner: Operations — Pipedrive adapter (stub)
- `import-salesforce` — owner: Operations — Salesforce adapter (stub)
- `import-notion` — owner: Operations — Notion database adapter (stub)
- `import-airtable` — owner: Operations — Airtable base adapter (stub)
- `import-enrichment` — owner: Intelligence — AI cleanup of an ImportBatch (stub)

Attio-parity capability surface:
- `list-segment` — owner: Intelligence — saved filtered cohorts over any record (stub)
- `activity-timeline` — owner: Intelligence — chronological per-record event stream (stub)
- `inbox-sync` — owner: Communication — Gmail/Outlook + Calendar auto-population (stub)
- `custom-object` — owner: Operations — user-defined record types (stub)
- `record-comment` — owner: Communication — threaded comments + @mentions (stub)

### Executable handlers (deterministic counterpart of the markdown contracts)
Real implementations:
- `lib/agents/handlers/workspace-activation.ts`
- `lib/agents/handlers/dealflow-template-materialization.ts`
- `lib/agents/handlers/daily-brief.ts`
- `lib/agents/handlers/team-invite.ts` (send + accept)

Stub handlers (contracts declared, implementations return `not_implemented` —
each graduates to its own file `lib/agents/handlers/<skill>.ts` when built):
- `lib/agents/handlers/stubs.ts` — all 12 import-wedge + Attio-parity skills

Registered in `lib/agents/handlers/index.ts` via `registerSkill(id, owner, handler)` —
both real and stub. The registry knows every contract; calling a stub returns
`{ ok: false, error: "not_implemented" }` so external orchestrators get a
predictable response rather than `unknown_skill`.

### Agent-to-agent invocation
`lib/agents/skill-registry.ts` exposes `callSkill(context, skill_id, input)`. Every call
emits `agent_job.started` + `agent_job.completed` / `agent_job.failed` events on the bus,
correlated by a generated `job_id` and the `calling_skill` field. No direct imports
between agent modules — synchronous cross-agent calls flow through this primitive so the
audit trail holds.

### Event → handler bindings
`lib/events/subscriptions.ts` declares `EVENT_SKILL_BINDINGS`. When an event publishes,
the bus invokes the bound handler inline (in addition to the standard `agent_job` queue):

| Event | Skill handler invoked inline |
|---|---|
| `subscription.activated`     | `workspace-activation` |
| `workspace.activated`        | `daily-brief` (recompose for the new operator) |
| `team.invite.accepted`       | `daily-brief` (recompose for the inviter) |
| `deal.created`               | `daily-brief` (recompose) |
| `import.completed`           | `daily-brief` (recompose) + `import-enrichment` (auto cleanup pass) |
| `inbox.sync.completed`       | `daily-brief` (recompose so freshly-synced contacts appear) |
| `contact.auto_created`       | `lead-scoring` (score contacts auto-created from inbox) |
| `record.comment.mentioned`   | `record-comment` (delivers @mention notification) |

### Per-skill default risk (autonomy gate)

`lib/events/autonomy.ts` exports `SKILL_DEFAULT_RISK` — the conservative default
risk band per skill, used by `decide(mode, risk)`:

| Risk band | Examples |
|---|---|
| `low`  | `daily-brief`, `pipeline-risk`, `knowledge-summary`, `activity-timeline`, `list-segment`, `lead-scoring`, `record-comment`, `team-invite.accept`, `workspace-activation`, `dealflow-template-materialization` |
| `medium` | `csv-import`, `import-*` adapters, `import-enrichment`, `proposal-generation`, `battlecard-generation`, `team-invite` |
| `high` | `inbox-sync` (private data), `custom-object` (schema change) |

## Suite route contract
`app/suite/routes.ts` is the single source of truth for every `/suite/*` URL — sidebar, breadcrumbs,
layout matching, and the MCP capability surface all read from this registry. Adding or renaming a
route is a one-line change there, not a series of hand-written page wrappers.

## Event bus
`lib/events/` (this project)
- `types.ts` — discriminated-union event catalog
- `bus.ts` — publish / subscribe / persist
- `subscriptions.ts` — wiring (which agent listens to which event)
- `autonomy.ts` — autonomy gate (hands_off / medium / hands_on)

Every action persists to the `events` table in D1 (append-only — see route hardening in
`app/api/agent/events/route.ts`).

## MCP surface
`mcp-server.ts` at root holds the canonical inventory generator. It's exposed through HTTP at:

- `GET  /api/mcp`                           — full inventory: server identity, routes, workspaces,
                                              actions, skills, tools, and live bus handler stats.
- `POST /api/mcp { tool, arguments }`       — dispatch a tool call. Admin-gated. Actions whose
                                              policy is `approval_required` return 202 with the
                                              next-step direction; `owner_only` returns 403; `auto`
                                              actions emit `agent_job.started` on the bus so the
                                              platform's own agents handle the work.

The inventory is generated from contracts — `app/suite/routes.ts` (route capabilities),
`app/suite/workspaces.ts` (per-workspace actions + policies), `skills/*.skill.md`. Adding a row
to any of those automatically widens the MCP surface — no separate registration step.

## Replay surface
- `GET /api/events/replay?from=ISO&to=ISO&event_type=X`   — windowed audit log access
- `GET /api/events/replay?dead_letter=1`                  — parked failed events
- Bus handlers that throw past `REPLAY_RETRY_BUDGET` (5) get parked in `event_dead_letter`
  with their last error, awaiting operator review. Migration `0014_event_delivery_tracking.sql`
  adds the supporting columns + table.

## Gaps
See `GAPS.md` at root — top 10 revenue-tied gaps, refreshed every session.
