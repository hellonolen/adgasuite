---
name: inbox-sync
owner: communication
description: Two-way sync of Gmail/Outlook inbox + Google/Microsoft Calendar with workspace records. Auto-creates contacts from sender domains, logs every email + meeting on the matching record, and lets the operator reply from inside ADGA. The single highest-leverage feature for new-account activation.
inputs:
  - operation: "connect" | "sync_full" | "sync_incremental" | "send_reply" | "disconnect"
  - provider: "gmail" | "outlook"
  - credential_id: string | null
  - cursor: string | null
  - reply:
      thread_id: string
      message_id: string | null
      body: string
      cc: string[] | null
      bcc: string[] | null
  - organization_id: string
  - actor: { type: "user" | "agent", id: string }
outputs:
  - sync_id: string | null
  - messages_processed: number
  - contacts_created: number
  - records_touched: number
  - cursor: string | null
events_emitted:
  - inbox.sync.started
  - inbox.sync.completed
  - inbox.sync.failed
  - inbox.message.linked
  - contact.auto_created
state_contracts:
  - cloudflare/state/email-sync-cursor.schema.json
---

# Inbox Sync — Auto-Populate the Workspace From Email + Calendar

## Why this exists

The single largest activation event in CRM is "I connected my inbox and my pipeline appeared."
Empty-workspace abandonment is the #1 reason a paid trial cancels. Inbox sync converts a blank
workspace into a populated one within 60 seconds of OAuth approval, before the operator finishes
the first onboarding email.

## Behavior

1. **connect**: store OAuth token in `integrations.{provider}` keyed by user_id. Emit
   `inbox.sync.started`, immediately run a full sync.
2. **sync_full**: walk inbox by date desc, last 90 days by default. For each message:
   - Extract participants
   - Match each participant against existing contacts; create new contacts for unmatched (emit
     `contact.auto_created`)
   - Link the message to the matching contact + any open deal where contact appears on the deal team
   - Persist message id + thread id in `email_messages` so the activity timeline can render it
   - Update cursor after every page
3. **sync_incremental**: resume from cursor. Fired by cron every 5 minutes per connected mailbox.
4. **send_reply**: post outbound message via provider API, persist outbound under same thread,
   emit `inbox.message.linked` for activity timeline.
5. **disconnect**: revoke token, delete sync cursor, keep historical messages.

## Decision rules

- **Token expired** → handler refreshes via refresh_token, retries once, then `inbox.sync.failed`.
- **Provider rate-limit** → exponential backoff, persists cursor at last successful page so the
  next run resumes cleanly.
- **Contact match ambiguous** (same email on two records, e.g. shared inbox) → link to all matches.
  Operator can untangle from the contact detail view.
- **Calendar event sync** is a sibling operation in the same skill — same cursor, same auth, same
  contact-creation path.

## Privacy boundary

- Body text is stored encrypted at rest (column-level encryption via env-stored key).
- Display name + subject + snippet stored as plaintext for search.
- Operator can opt out per-thread (`/suite/inbox/[thread]/private`) → message body is purged,
  metadata kept.

## Recovery

Per-mailbox cursor in `email_sync_cursors`. If sync fails mid-page, cursor stays on the last fully
processed page so re-runs don't re-process the same messages.

## v1 scope

`connect`, `sync_full`, `sync_incremental` for Gmail only. Outlook + outbound reply land in
subsequent iterations using the same contract.
