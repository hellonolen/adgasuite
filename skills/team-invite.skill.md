---
id: team-invite
owner: sales
status: active
emits:
  - team.invite.sent
  - team.invite.accepted
  - team.invite.expired
consumes:
  - operator.requested_team_invite
contracts:
  - cloudflare/state/team-invite.schema.json
  - cloudflare/state/agent-job.schema.json
---

# team-invite

## Purpose
Let the workspace owner / admin invite a teammate without leaving the
app and without operator-side SQL. Until this skill landed, every team
member existed only because the platform owner manually inserted them.
That kills the Team-plan promise.

## Triggered by
`operator.requested_team_invite` — fires from the seat management page
(`/suite/settings/seats`) when the operator clicks **Invite** and
provides an email + role.

## Required inputs
- `organization_id`
- `inviter_user_id`
- `invitee_email`
- `invitee_role` — `admin` | `member` (never `owner` — that's a
  separate ownership-transfer flow, out of scope here)

## What the skill does (atomic per invite_id)

1. **Seat-count guard** — read the org's plan + current
   `organization_members` count. If adding this seat exceeds the
   plan's included seats AND there's no Stripe seat-overage line item
   yet, queue a `prepared-action` for the operator to confirm the
   extra-seat charge. Return early; skill resumes when the action is
   approved.
2. **Create the invite row** — `INSERT INTO team_invites` keyed by a
   new `invite_id`. Status: `pending`. `expires_at = now + 14 days`.
   Token: `randomToken(32)` (same primitive as magic-link). Token
   hash stored — never the plaintext.
3. **Send the invite email** — `lib/integrations/postmark.ts` with a
   personal subject ("`<inviter_name>` invited you to ADGA"), HTML body
   matching the warm-cream transactional email template, and a single
   CTA button pointing at
   `/auth/accept-invite?token=<plaintext_token>`.
4. **Emit `team.invite.sent`** — payload includes
   `{ invite_id, organization_id, invitee_email, invitee_role,
      expires_at }`. Intelligence subscribes (tracks invite funnel).

## Acceptance path (a different trigger, same skill file)
When the invitee clicks the email link:
1. Verify the token hash matches a `pending` invite where
   `expires_at > now`.
2. Provision the invitee via `provisionUserSession()` if they don't
   already exist as a user. **Crucially: do NOT route the invitee to
   a separate personal org** — they join the inviter's org via
   `organization_members`.
3. Insert `organization_members(org_id, user_id, role)` matching the
   invite's `invitee_role`.
4. Mark the invite row as `accepted_at = now`.
5. Emit `team.invite.accepted`. Sales agent subscribes to send the
   inviter a "X joined your workspace" notification.

## Telemetry that proves it worked
- `team_invites` row exists with status flowing
  `pending → accepted` (or `expired`)
- `team.invite.sent` event in D1 with the invite_id
- `team.invite.accepted` event in D1 with the same invite_id
- `organization_members` row exists for the new user

## Recovery
- Postmark failure: mark invite as `pending_email_retry`, queue a
  Conductor retry job. Operator sees "invite created but email did
  not send — click to resend."
- Token replay: each invite's token hash is checked exactly once;
  second click of the same link returns "already accepted" with
  redirect to `/suite`.
- Expired invite click: invite-acceptance page surfaces "this invite
  expired" with a CTA to ask the inviter to resend; Conductor queues
  a notification to the inviter.
- Soft-archive only — never DELETE invite rows. `archived_at`
  column is the contract for revocation. Operator can revoke before
  acceptance via "Cancel invite" on the seat management page.

## Hard rules
- Plain-text token appears in exactly one place: the email body.
  Never logged, never persisted (the DB only stores the hash).
- An invite never auto-promotes itself to `owner` — even if the
  invitee's email matches one of the workspace admins listed in
  `ADGA_ADMIN_EMAILS`. Role comes from the invite payload only.
- The inviter must hold `owner` or `admin` role on the org. Members
  cannot invite.
