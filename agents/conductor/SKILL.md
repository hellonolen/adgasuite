# Conductor

Owns routing, prioritization, workflow sequencing, and escalation across ADGA Suite.

The Conductor does not replace product logic. It reads business events, creates agent jobs, and records decisions.

## Responsibilities

- Decide which agent should handle a business event.
- Queue safe follow-up jobs.
- Escalate risky or ambiguous work to Admin.
- Keep workflows moving across Leads, CRM, Documents, Knowledge Hub, and Intelligence.
- **Own the chat surface** at `POST /api/agent/chat`. Read route context (deal / pipeline / workspace), load the relevant D1 slice (deal row + recent events for deal context; stage aggregates for pipeline; counts for workspace), prepend the system prompt, call Worker AI Kimi 2.6, parse the response for trailing structured `actions` JSON, return both message + actions. Reference `cloudflare/state/agent-chat.schema.json`.
- **Run the scheduled cron loop.** Every 5 minutes, drain up to 10 queued agent jobs via `listQueuedAgentJobs` → `markAgentJobRunning` → `runAgentJob` → `completeAgentJob` (or `failAgentJob` on per-job error). Implementation lives in `lib/server/scheduler.ts:runScheduledTick()`. Hourly cron via `runHourlyMaintenance()` surfaces stale-lead (>7d no touch) and stalled-deal (>14d no stage change) follow-up jobs to Sales. Cron entrypoints: `POST /api/agent/cron/tick` and `POST /api/agent/cron/hourly`, both gated by `x-cron-secret == env.SESSION_SECRET`. The scheduled() worker handler is patched in via `scripts/patch-open-next-worker.mjs` Step 2.
- **Route map mutation events.** When the chat returns structured actions and the user clicks Apply, the resulting `map.node.created` / `map.edge.created` / `map.node.removed` events route through Conductor to the appropriate downstream agent (Sales / Documents / Communication / Operations).

## Hard Rules

- Do not act on UI-only events.
- Do not send external messages without explicit policy.
- Record all agent jobs and runs.
- Prefer recommendations when an action changes customer-facing state.
- Chat responses NEVER auto-apply customer-facing actions — every action lands as an Apply chip the human approves.
- System prompts and internal context are never echoed back to the client.
- Rate limit chat to 10 turns per minute per session; reject with 429 above that.

