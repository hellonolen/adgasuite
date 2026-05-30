---
id: workspace-activation
owner: conductor
status: active
emits:
  - workspace.activated
consumes:
  - subscription.activated
contracts:
  - cloudflare/state/workspace-activation.schema.json
  - cloudflare/state/agent-job.schema.json
---

# workspace-activation

## Purpose
Convert a successful Stripe checkout into a fully provisioned, ready-to-use
ADGA workspace. Closes the loop between **paid** and **productive** without
operator intervention.

## Triggered by
`subscription.activated` event (emitted by Stripe webhook on
`checkout.session.completed` reconcile path) **OR** the manual
`/api/admin/diag/stripe/simulate` smoke path.

## Required inputs (from the event payload)
- `email` — the paying customer's email
- `plan` — pro | team | enterprise
- `stripe_customer_id`
- `stripe_subscription_id`
- `organization_id` — derived via `orgIdForEmail()` if not in metadata

## What the skill does (in order, all idempotent)

1. **Ensure organization** — `INSERT OR IGNORE INTO organizations` for the
   resolved `organization_id`. Plan and `subscription_status='active'`.
2. **Ensure user + session** — call `provisionUserSession()`. Returns a
   session token to deliver via magic-link email.
3. **Mark the workspace as activated** — write a row keyed by
   `organization_id` into the `workspace_activations` lane defined in
   `cloudflare/state/workspace-activation.schema.json`. Status:
   `activated`. Stamps `activated_at`, `plan`, `stripe_subscription_id`,
   the operator's email, and the autonomy mode default for new
   workspaces (`hands_off` for the first 7 days, then `medium`).
4. **Seed a starter dealflow** — invoke the
   `dealflow-template-materialization` skill so the operator's first
   login lands on a populated canvas, not an empty Deals page.
5. **Send the welcome magic link** — `lib/integrations/postmark.ts` with
   the session token issued in step 2. Subject:
   "Your ADGA workspace is live."
6. **Emit `workspace.activated`** — payload includes
   `{ organization_id, email, plan, activated_at }`. Intelligence
   subscribes (starts MRR rollup). Sales subscribes (queues the welcome
   sequence).

## Telemetry that proves it worked
- `workspace.activated` event row in D1 (`SELECT * FROM events WHERE
  event_type='workspace.activated' AND resource_id=:organization_id`)
- `workspace_activations` row with `status='activated'`
- Subscription row in `subscriptions` table with provider='stripe',
  status='active', plan matching the checkout
- Magic-link email delivery recorded in Postmark message events

## Recovery
- If any step throws past `REPLAY_RETRY_BUDGET`, the event lands in
  `event_dead_letter`. Operator can resolve via
  `/api/admin/diag/stripe/simulate` with the same session id to replay
  the activation cleanly (every step is idempotent).
- If the magic-link email fails (Postmark down), the workspace is still
  activated; operator can re-request the link via `/login`.

## Hard rules
- Never double-charge. Step 1 idempotency comes from `INSERT OR IGNORE`.
- Never write `subscription.activated` from the page layer — only the
  Stripe webhook + the diag simulate path may publish it.
- Autonomy is `hands_off` for first 7 days regardless of plan.
