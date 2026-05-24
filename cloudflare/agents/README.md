# ADGA Suite Agents

ADGA Suite uses agents as backend workers. Agents do not own the UI. Agents react to business events, create jobs, and write structured outputs.

Agents use the Cloudflare Worker AI binding as the primary inference path. Kimi 2.6 is the intended model. External AI APIs are not the default architecture.

## Agents

- Conductor: routes work and decides next steps.
- Sales: lead scoring, follow-up recommendations, pipeline movement.
- Intelligence: company research, battlecards, market/customer insights.
- Documents: proposal, invoice, contract, and document summaries.
- Operations: onboarding, reminders, task creation, workflow hygiene.
- Communication: SMS, email, calls, voice notes, invite copy, and traceable record communication.
- Payments: invoice connectors, payout setup, platform fees, affiliate payout state.
- Voice: inbound/outbound call preparation, recording, transcription, summaries, and post-call execution.

These eight names are the valid `agent` values in `cloudflare/state/agent-job.schema.json`.

## Rules

- Agents operate from skill files.
- Agents read/write structured JSON.
- Agents record jobs and runs.
- Agents call the Cloudflare Worker AI binding through the shared AI adapter.
- Agents do not silently mutate important data without an event/audit trail.
- Agents produce recommendations unless an action is explicitly safe and approved by policy.
- Agents that prepare customer-facing, financial, legal, or destructive work must write a prepared action before any application step.
- Every applied prepared action must produce an audit-log record.

## State Contracts

- `cloudflare/state/agent-job.schema.json` records queued/running/completed work and includes all eight agent owners.
- `cloudflare/state/prepared-action.schema.json` defines approval lanes: safe internal, review recommended, approval required, restricted.
- `cloudflare/state/audit-log.schema.json` defines append-only action history.
- `cloudflare/state/record-graph.schema.json` links workspace resources across deals, contacts, documents, calls, meetings, invoices, maps, and tasks.
- `cloudflare/state/workspace-search.schema.json` defines workspace-wide retrieval results.
- `cloudflare/state/deal-memory.schema.json` defines persistent deal context and next moves.
- `cloudflare/state/agentic-outcomes.schema.json` defines outcome rollups for dashboards and operating reviews.
- `cloudflare/state/document.schema.json` and `cloudflare/state/calendar-event.schema.json` define document and calendar backbone state.
- `cloudflare/state/dealflow-map.schema.json` defines map nodes, edges, positions, and live resource bindings.

## Scheduled Work

- Five-minute cron drains queued jobs for every valid agent owner.
- Hourly maintenance creates Sales, Communication, Operations, Payments, Voice, or Conductor jobs when stale records, pending approvals, payment exceptions, call follow-ups, or missing next actions are detected.
- Cron-created jobs must include `organization_id`, `agent`, `job_type`, resource trace input, and a source event or audit reference when available.

## Initial Skills

- lead-scoring
- pipeline-risk
- follow-up-generation
- proposal-generation
- battlecard-generation
- knowledge-summary
- onboarding-sequence
- prepared-action
- deal-memory
- workspace-search
- record-graph
