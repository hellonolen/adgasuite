# ADGA Communication Workflow

## Purpose

Communication actions should never stand alone. SMS, voice notes, calls, emails, calendar invites, and follow-up tasks must trace back to a lead, contact, deal, meeting, or invoice.

## Inputs

- `resource_type`: lead, contact, deal, meeting, invoice, or task
- `resource_id`: the record the communication belongs to
- `channel`: sms, email, voice_note, call, calendar_invite, or internal_note
- `audience`: internal, client, counterparty, or general
- `visibility`: internal or client_visible
- `recipient`: name, email, phone, and preferred contact method when available
- `message`: outbound text, email body, call summary, or note body
- `audio_r2_key`: R2 key for voice-note audio when applicable
- `transcript_text`: speech-to-text output when applicable
- `prepared_action_id`: approval-lane record for outbound or external-facing messages when applicable
- `requested_by`: user or agent initiating the action

## Workflow

1. Validate the target record exists or can be represented by `resource_type` and `resource_id`.
2. Create the communication event.
3. Store large artifacts in R2.
4. Store metadata, status, transcript text, delivery state, and trace IDs in D1.
5. Queue the appropriate agent review:
   - Sales agent for lead/contact follow-up.
   - Operations agent for calendar and scheduling.
   - Documents agent for invoice/document communication.
   - Client portal workflow for represented-client updates.
   - Conductor for cross-record coordination.
6. Update the record timeline/activity history.
7. Surface the result inside the original record, not only inside a standalone tool page.

## Rules

- Do not send an outbound message without a resource trace unless the user explicitly creates a general message.
- Internal deal-team communication stays private unless a user explicitly marks it client-visible.
- Client-visible deal communication must attach to both the represented client and the deal.
- Customer-facing outbound email, SMS, external calls, calendar invite copy, and post-call follow-up must route through `cloudflare/state/prepared-action.schema.json` unless policy explicitly marks it safe.
- Communication touchpoints that change deal context should update or reference `cloudflare/state/deal-memory.schema.json`.
- Do not store audio file bodies in D1.
- Do not treat Postmark as SMS.
- Do not depend on Twilio or Telnyx.
- SMS uses the configured self-hosted open-source gateway.
- Voice notes use R2 for audio and Cloudflare Workers AI STT when available.

## State Contracts

- `cloudflare/state/deal-communication.state.json`
- `cloudflare/state/prepared-action.schema.json`
- `cloudflare/state/calendar-event.schema.json`
- `cloudflare/state/deal-memory.schema.json`
- `cloudflare/state/audit-log.schema.json`
