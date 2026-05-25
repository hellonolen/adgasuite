# ADGA Mail and Calendar Strategy

Date: 2026-05-25

## Decision

ADGA should not start by trying to become a generic Nylas or Composio clone.

The product direction is ADGA-owned communication:

- Users can receive an ADGA mailbox such as `name@adga.com`.
- The mailbox appears inside the ADGA Suite inbox.
- The calendar appears inside ADGA Suite.
- Mail, calendar, contacts, notifications, approvals, and deal records are linked together.
- Outside providers such as Gmail, Microsoft, Yahoo, iCloud, IMAP, CalDAV, Nylas, or Composio can be added later as optional connectors.

The first product should be an ADGA-native inbox and calendar, not a third-party inbox connector.

## Product Intent

The user should be able to open ADGA and work from one place:

- ADGA Inbox
- ADGA Calendar
- ADGA Contacts
- Deal-linked conversations
- Deal-linked calendar events
- Assistant-readable message and calendar context
- Approval-gated outbound communication
- In-app notifications
- Search across deals, contacts, messages, events, files, notes, and invoices

This becomes a reusable ADGA communications platform that can support other products in the wider workspace portfolio.

## Recommended Architecture

Create a reusable package boundary rather than burying this only inside ADGA Suite.

Suggested package structure:

```text
packages/adga-communications/
  mail/
  calendar/
  contacts/
  notifications/
  approvals/
  search/
  storage/
  provider-adapters/
  shared/
```

ADGA Suite then consumes this package instead of owning every communication primitive directly.

## Mail Infrastructure Recommendation

Use a hybrid path first:

1. Postmark or equivalent provider handles outbound delivery.
2. Inbound mail webhooks receive mail for ADGA-owned addresses.
3. Full message payloads and attachments are stored in R2.
4. D1 stores metadata, pointers, indexes, status, and relationship IDs only.
5. The ADGA inbox reads from the ADGA communication store.
6. Deal/contact matching links each thread to the right workspace records.

This avoids the operational risk of running a full mail server too early while still giving ADGA its own mailbox product surface.

## Calendar Recommendation

Build ADGA-native calendar first:

- Calendar events
- Attendees
- Availability blocks
- Meeting links
- ICS generation
- ICS parsing for replies where practical
- Deal-linked events
- Meeting briefs
- Reminders and notifications

Google/Microsoft/iCloud calendar sync can come later as optional connectors.

## Storage Policy

The ADGA storage boundary still applies:

- D1 is metadata and indexing only.
- R2 is long-term payload storage.
- Message bodies, HTML bodies, attachments, generated briefs, invite payloads, transcript payloads, and large event payloads belong in R2.
- D1 rows should store `payload_r2_key`, `storage_object_id`, status, timestamps, user/workspace IDs, search fields, and relationship pointers.
- Records are archived, not hard-deleted.

## Triopia Assessment

Triopia is directly relevant and should be used as internal guidance for ADGA Mail.

Active product inspected:

```text
/Users/savantrock/Workspace/active/triopia
```

Relevant Triopia assets:

- `CLAUDE.md`: product mandate is “Inbox as OS.”
- `migrations/0001_init.sql`: email accounts, emails, contacts, threads, agent actions, memory.
- `migrations/0002_calendar_calls.sql`: calendar events and calls.
- `migrations/0004_notifications_ratelimit.sql`: notifications and rate limits.
- `migrations/0013_sessions.sql`: session model for conversations and artifacts.
- `migrations/0015_inbox_messages.sql`: inbox sessions and message threading.
- `lib/db/schema.ts`: typed schema for email, calendar, notifications, sessions, contacts, agent actions, and memory.
- `lib/gmail.ts`: direct Gmail OAuth/API fetch, parsing, threading, send, archive, and trash operations.
- `lib/email-threading.ts`: incoming email to session/message conversion.
- `lib/context/unified.ts`: cross-domain context assembly across email, notes, calendar, calls, contacts, memory, decisions, and chat.
- `lib/agent/loop.ts`: email triage loop with contextual decisioning.
- `lib/agent/tools.ts`: tools for reading mail, searching mail, tagging, creating calendar events, notifying, and approval queueing.
- `lib/agent/notificationPolicy.ts`: notification policy and daily briefing.
- `skills/email-triage.skill.md`: formal email triage skill.
- `skills/channel-prompt-email.skill.md`: email drafting skill.
- `skills/channel-prompt-calendar.skill.md`: calendar skill.
- `components/triopia/SessionDetailView.tsx`: conversation detail UI with pending actions and reply handling.
- `components/triopia/CalendarView.tsx`: calendar UI.

## What Triopia Can Contribute

Triopia can contribute design and architecture patterns:

- Unified inbox as the operating surface.
- Everything as a session/conversation.
- Sessions with messages, artifacts, approvals, and assistant actions.
- Email-to-contact relationship tracking.
- Email thread ingestion.
- Cross-domain context assembly.
- Notification policy.
- Approval queue for risky outbound actions.
- Calendar linked to email and contacts.
- Assistant tools that work across email, calendar, notes, contacts, and memory.

These patterns are valuable for ADGA because ADGA deals need the same primitives, but attached to deals instead of a general personal workspace.

## What Should Not Be Reused Directly

Do not directly copy Triopia code into ADGA without an intentional extraction pass.

Reasons:

- Triopia is user-centric; ADGA is organization/deal-centric.
- Triopia stores substantial email body fields directly in D1. ADGA requires R2 for long-term payload storage.
- Triopia has Gmail connector logic; ADGA’s first path should be ADGA-owned mailboxes.
- Triopia has product-specific language and UX rules that do not belong in ADGA.
- Some Triopia routes use permanent remove operations; ADGA policy is archive-first.
- Triopia’s email provider model is useful, but ADGA needs a stronger tenant/workspace/account/mailbox boundary.

## ADGA Data Model Direction

ADGA should create a communication layer with these core concepts:

- `mailboxes`: one mailbox per user or workspace-owned address.
- `mail_threads`: conversation-level metadata.
- `mail_messages`: metadata and R2 pointer for body/HTML/raw payload.
- `mail_attachments`: metadata and R2 pointer.
- `calendar_accounts`: ADGA-native calendar account plus optional provider connections.
- `calendar_events`: metadata and R2 pointer for full event payload when needed.
- `notification_events`: in-app notification records.
- `communication_sessions`: unified activity stream across mail, calendar, voice, SMS, documents, and deal activity.
- `communication_links`: relationships from messages/events to deals, contacts, documents, invoices, tasks, and approvals.
- `communication_approvals`: approval lane for outbound actions.

## First Build Slice

Build the ADGA-native version first:

1. ADGA mailbox table and mailbox provisioning concept.
2. Inbound webhook endpoint for ADGA-owned mail.
3. Message ingestion pipeline.
4. R2 payload storage for body, HTML, raw source, and attachments.
5. D1 metadata rows and search fields.
6. Inbox UI backed by real stored messages.
7. Outbound send through Postmark with approval policy.
8. ADGA-native calendar events and ICS invite generation.
9. In-app notification center.
10. Deal/contact linking and assistant search over messages/events.

## Later Build Slices

After ADGA-native mail and calendar work:

1. Custom domain mailbox setup.
2. Google import/sync.
3. Microsoft import/sync.
4. IMAP import.
5. CalDAV/ICS calendar import.
6. Reusable package extraction for other projects.
7. Commercialized ADGA Communications Platform.

## Guiding Principle

Use Nylas, Composio, EmailEngine, Keeper, Cal.com, and Triopia as research inputs and architecture references.

Do not clone their code. Build ADGA’s own communication product and keep it reusable across the broader portfolio.
