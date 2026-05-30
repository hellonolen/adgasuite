---
name: activity-timeline
owner: intelligence
description: Render the chronological activity stream for any record — every email, meeting, file, comment, voice note, agent action, and approval — by querying the events table filtered to that resource. No new state; events table is the source of truth.
inputs:
  - resource_type: "contact" | "lead" | "deal" | "organization" | "workspace"
  - resource_id: string
  - filters:
      since: string | null
      until: string | null
      event_types: DomainEventType[] | null
      actor_type: "user" | "agent" | null
      limit: number
      cursor: string | null
  - organization_id: string
  - actor: { type: "user" | "agent", id: string }
outputs:
  - items: Array<{ id: string, event_type: string, actor_type: string, actor_id: string, occurred_at: string, summary: string, payload: object }>
  - next_cursor: string | null
events_emitted:
  - timeline.viewed
state_contracts: []
---

# Activity Timeline — Per-Record Event Stream

## Why this exists

Every record needs a "what happened here" surface. Salesforce calls it Chatter. Attio calls it the
record timeline. Without it the workspace feels like a database, not a system that does work.

ADGA already has the source of truth: the `events` table. This skill is the structured read
adapter that turns events → timeline items, including the per-event human summary that the UI
displays without each consumer rewriting it.

## Behavior

1. Filter events by `(organization_id, resource_type, resource_id)` plus optional filters.
2. For each event, derive a `summary` string per the per-event-type formatter declared inline below.
3. Return paginated, cursor-based (cursor = base64-encoded `(occurred_at, id)`).

## Summary formatters (per event_type)

| event_type | summary template |
|---|---|
| `deal.created` | "Deal created" |
| `deal.stage_changed` | "Stage moved {from} → {to}" |
| `deal.won` | "Deal won — {amount}" |
| `deal.lost` | "Deal lost — {reason}" |
| `agent_approval.requested` | "{agent} requested approval: {title}" |
| `agent_approval.approved` | "{actor} approved: {title}" |
| `agent_approval.rejected` | "{actor} rejected: {title}" |
| `lead.captured` | "Lead captured from {source}" |
| `lead.qualified` | "Lead qualified — score {score}" |
| `team.invite.accepted` | "{invitee_email} joined the workspace" |
| `import.completed` | "Imported {rows_succeeded} of {rows_total} {target_type}" |
| `voice_note.created` | "Voice note added — {word_count} words" |
| ...future event types | summary fallback: human-readable event_type + actor |

## Decision rules

- **Permission**: actor must be a member of `organization_id`. Owner/admin sees all; members see
  events they're entitled to per the resource's visibility (e.g. deal team only).
- **No events** → return empty `items`, `next_cursor: null`. Not an error.
- **Resource doesn't exist** → still returns empty; existence check happens at the UI layer.

## Recovery

Read-only skill — no writes, nothing to recover.

## v1 scope

All event types in `lib/events/types.ts` get a summary formatter. New event types added later
must also add their formatter, enforced at build time by a unit test that asserts every event
type has a row in the formatter map.
