---
id: daily-brief
owner: conductor
status: active
emits:
  - conductor.brief.composed
consumes:
  - conductor.brief.requested
contracts:
  - cloudflare/state/daily-brief.schema.json
  - cloudflare/state/deal-memory.schema.json
  - cloudflare/state/prepared-action.schema.json
---

# daily-brief

## Purpose
The Conductor agent's first visible output to the operator. Replaces the
empty `/suite` redirect with a composed read of "here are the 3-7 things
that need your attention right now, ordered by deal impact, each with
a one-click action."

## Triggered by
- `conductor.brief.requested` — fires on every load of `/suite` for the
  authenticated operator
- The hourly cron tick — Conductor pre-composes the brief so the page
  load is instant

## Required inputs
- `organization_id`
- `user_email`
- `now` — current ISO timestamp (so the same skill is deterministic in
  tests + replays)

## What the skill composes (the brief output, max 7 items)

The brief is a ranked list of `BriefItem`s defined in
`cloudflare/state/daily-brief.schema.json`. Composition order:

1. **Stalled deals** — read from `pipeline-risk` skill output: every
   deal with stage unchanged > 7 days AND value > $0. One item per
   stalled deal. CTA: open the deal, surface a prepared follow-up.
2. **Overdue commitments** — read `deal-memory.commitments[]` where
   `due_at < now`. One item per overdue commitment. CTA: mark done
   or reschedule.
3. **Prepared actions awaiting approval** — read
   `prepared_actions` table where `status='pending_approval'` and
   `risk in ('low','medium')`. CTA: approve / edit / reject.
4. **New qualified leads (last 24h)** — read `leads` where
   `qualified_at > now - 24h`. CTA: open lead, recommend deal
   creation.
5. **Deals at the close stage** — `deals.stage IN ('close','sign')`
   AND `expected_close_at <= now + 7d`. CTA: open deal, surface
   closing checklist.
6. **Recent activity worth reviewing** — events from `events` table
   in last 24h: agent_approval.requested, dealflow.node_added
   (by agents), workspace.activated. Operator scan.
7. **Pipeline summary** — single item with weighted pipeline value,
   active deal count, MRR. Sourced from same query the Intelligence
   page uses.

## Output shape (BriefItem)
Per `cloudflare/state/daily-brief.schema.json`:
- `id` (string) — stable id, e.g. `brief:stalled:DEAL-621810:2026-05-30`
- `kind` (enum) — `stalled_deal` | `overdue_commitment` |
  `prepared_action` | `qualified_lead` | `closing_soon` | `activity` |
  `pipeline_summary`
- `priority` (int 1-5) — 1 highest. Stalled high-value deals = 1,
  pipeline_summary = 5
- `headline` (string) — one-line operator-readable
- `subheadline` (string) — context, e.g. "Last activity: 4 days ago"
- `deal_id` (string | null) — deep link
- `cta_label` (string) — "Send follow-up" / "Approve" / "Open deal"
- `cta_href` (string) — `/suite/dealflow/<id>` or
  `/suite/admin/audit?approval_id=<id>`
- `prepared_action_id` (string | null) — if the action is pre-staged,
  links to the prepared action row so one click executes it

## Telemetry that proves it worked
- `conductor.brief.composed` event row in D1 with the full
  `BriefItem[]` JSON in payload
- `/api/conductor/brief?org=<id>&user=<email>` returns the cached
  brief (composed once per cron tick, returned instantly from D1
  on page load)
- Operator click-through tracked: each item's `cta_href` records a
  `brief.item_clicked` event so we can A/B which item kinds drive
  action

## Recovery
- If composition throws, return the last successfully composed brief
  (cached in D1) with a `stale_at` timestamp so the operator knows
  the data is N minutes behind
- If no prior brief exists (brand new workspace), return a curated
  onboarding brief: "Create your first deal", "Invite a teammate",
  "Connect your calendar"
- Bus dead-letter at 5 retries; operator can manually re-trigger via
  `/api/admin/diag/conductor/recompose-brief`

## Hard rules
- Brief is never operator-blocking. If the skill takes > 800ms, return
  the last cached brief and recompose in the background.
- Brief items must always have a `cta_href`. An item the operator
  can't act on doesn't belong in the brief.
- Pipeline summary item appears exactly once, always last (lowest
  priority), so the operator sees the "what's happening RIGHT NOW"
  items first.
