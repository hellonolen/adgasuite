# ADGA Suite — Agentic Backbone

> Project conforms to the canonical structure in `~/.claude/rules/common/agentic-backbone.md`.
> This file lists project-specific overrides only. Read the canonical doc for the framework.

Last audited: 2026-05-23

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

Additional folders (`agents/operations/`, `agents/payments/`, `agents/voice/`) wrap third-party tool
adapters and lean toward "skills" rather than full agents per the canonical decision rule. They are
slated to be merged into the appropriate canonical agent in a follow-up.

## Skills (`skills/*.skill.md`)
- `lead-scoring` — owner: Sales — scores inbound leads against ICP
- `pipeline-risk` — owner: Intelligence — surfaces slipping deals
- `proposal-generation` — owner: Creative — drafts proposals from a deal record
- `battlecard-generation` — owner: Research — competitive context per deal
- `knowledge-summary` — owner: Research — summarizes uploaded docs

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
`mcp-server.ts` at root exposes the agentic capabilities declared in `routes.ts` and the skills in
`skills/` as discoverable MCP tools.

## Gaps
See `GAPS.md` at root — top 10 revenue-tied gaps, refreshed every session.
