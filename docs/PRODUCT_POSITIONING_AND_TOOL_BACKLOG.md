# ADGA Suite Product Positioning And Tool Backlog

This document is the working source of truth for the product, copy, and tool behavior changes discussed before implementation. It should guide the next build pass without changing the provided UI direction or drifting back into the old ADGA site.

## Current Direction

ADGA Suite is a deal execution platform. It should not feel like an editorial site, a lightweight demo, or a generic corporate SaaS page.

The product should communicate control, momentum, and operational clarity for people and teams managing active deal flow.

## Copy And Positioning Rules

- Do not use the word "die" in the main headline.
- Do not use editorial framing such as ledger, issue, reader, room, cover plate, leisure, magazine, or under glass.
- Do not lead with generic AI language.
- Start with a problem the buyer already recognizes: deal work is scattered across people, files, calls, calendars, notes, and follow-ups.
- Explain the mechanism clearly: ADGA keeps a live execution record for each deal and uses agents to surface the next move.
- Keep the tone bold, modern, direct, and premium.
- Avoid soft, cursive, airy, fairy, playful, or decorative product language.
- Avoid technical setup language on customer-facing pages.
- Follow `docs/DESIGN_SYSTEM.md` as the visual source of truth before adding page-specific styling.
- Use a single premium SaaS font system across the app and marketing pages. Do not use serif/cursive styling in the software UI.

## Stronger Positioning Direction

Primary idea:

ADGA keeps deal work from getting scattered.

Supporting idea:

Every lead, contact, meeting, document, decision, task, and agent action belongs to a live execution record, so the next move is visible before it gets missed.

## Lead System Requirements

- The suite needs a clear way to sync and surface the most recent lead.
- The most recent lead should be easy to identify from the Leads area and from the assistant/chat flow.
- Lead records must include the time and date the lead came in.
- Lead records must include urgency so owners know which leads need immediate attention.
- The system must support leads that require follow-up within the first five minutes.
- The owner should see exactly when follow-up is due and what follow-up is planned.
- AI should help manage follow-up so the user can keep working new leads and active deals.
- Users must be able to sort leads by most recent, oldest, next action due date, priority, status, and deal value.
- Users must be able to filter leads by received date, date range, source, QR campaign, owner, status, priority, deal type, stage, and tag.
- The Leads area should include saved views such as Most Recent, Needs Follow-Up, New Today, This Week, High Priority, QR Leads, Unassigned, and Stale Leads.
- Date filters must support today, yesterday, this week, last 7 days, this month, custom range, and all time.
- Lead records must distinguish lead source, including form submission, QR code submission, manual creation, imported lead, or other source.
- A lead form should be able to populate a complete lead record automatically.
- If a QR code is used on the lead form, that QR path/source must be preserved in the lead record.
- Manual lead creation inside the tool must expose the full lead record fields, not a thin or incomplete version.

## Lead Record Fields To Support

- Lead ID
- Lead name
- Company or organization
- Email
- Phone
- Social media profiles
- Preferred contact method
- Best time to contact
- Website
- Source
- QR campaign or QR source
- Date and time received
- Last updated date and time
- Last contacted date and time
- Assigned date and time
- Owner
- Status
- Priority
- Urgency
- Urgency reason
- Deal size or estimated value
- Deal type
- Stage
- Notes
- Next action
- Next action due date
- Follow-up due date and time
- Follow-up sequence
- Follow-up status
- Last follow-up attempt
- Next scheduled follow-up
- Meeting date or requested meeting time
- Documents attached
- Document links
- Tags
- Agent summary
- Agent recommended next move
- Activity history

## Missing Lead Management Basics

- Search across lead name, company, email, phone, notes, tags, and source.
- Bulk actions for assign owner, change status, add tag, archive, export, and delete.
- Clear empty states when no leads match a filter.
- Duplicate detection by email, phone, company, or matching source submission.
- Lead detail timeline showing every status change, note, document, meeting, task, and agent action.
- Import and export support for CSV.
- Lead source reporting so the user can see which form, QR code, or campaign is producing leads.
- Stale lead detection when no action has happened after a defined period.
- Required-field rules for manual creation so incomplete records do not pollute the pipeline.
- Validation for email, phone, URL, dates, and deal value.
- Ownership rules for unassigned leads.
- Archive instead of destructive deletion by default.
- Leads should open directly into usable record content. KPI cards should not push the lead list or lead context below the fold.
- Lead communication actions should be surfaced inside the lead record and should write back to the lead trace.

## Urgency And Follow-Up Requirements

- Urgency should be separate from priority.
- Priority describes business importance.
- Urgency describes how fast action is needed.
- Urgency levels should include Immediate, Same Day, Scheduled, Normal, and Low.
- Immediate leads should trigger a five-minute follow-up window.
- Scheduled leads should support explicit timing such as "call back in two days."
- Every lead should have a visible next follow-up time when follow-up is required.
- Owners should be able to see overdue, due now, upcoming, and completed follow-ups.
- AI should recommend follow-up timing based on lead source, urgency, conversation notes, and prior activity.
- AI should not hide the plan from the owner. The follow-up sequence should be visible and editable.
- Follow-up should create activity records so the history of the lead stays intact.

## Initial Follow-Up Sequence

This is the starting sequence until a final sequence is provided.

- New urgent lead: create record immediately, notify owner, schedule first follow-up within five minutes.
- Five-minute follow-up: call or message using the preferred contact method.
- No response after first attempt: schedule second follow-up in 30 minutes.
- No response after second attempt: schedule same-day follow-up before close of day.
- Lead asks for a later callback: set the requested date and time as the next scheduled follow-up.
- After successful contact: summarize conversation, update status, assign next action, and schedule the next step.
- After no response for 24 hours: move to Needs Follow-Up and recommend a softer follow-up.
- After repeated no response: mark as Stale but keep the record active unless archived by the owner.

## Contact Form And QR Requirements

- Marketing pages should have a contact form available from the footer.
- The footer contact form should show or connect to the QR code flow.
- The contact form should collect the same core information used by manual lead creation.
- The contact form should include social media fields.
- A submission through the contact form should create a lead record with source, received time, QR source when present, and complete contact details.
- Manual "New Lead" creation, contact form submission, QR submission, and contact record editing must use one consistent field model.
- The same fields should not be named differently in different parts of the tool.

## Contact And Business Record Fields To Store

The same record model should be used by the footer contact form, QR form, manual New Lead form, lead detail page, and contact detail page.

Contact identity:

- First name
- Last name
- Full name
- Email
- Phone
- Preferred contact method
- Best time to contact
- Job title
- Role or decision-making authority
- Social media profiles
- LinkedIn URL
- X/Twitter URL
- Instagram URL
- Facebook URL
- Other social/profile URL

Business information:

- Company or organization name
- Business website
- Business phone
- Business email
- Industry
- Business type
- Company size
- Revenue range
- Location
- City
- State or province
- Country
- Time zone
- Current business state or operating status
- What the business needs help with
- Urgency
- Priority
- Estimated deal value
- Deal type
- Source
- QR campaign or QR source
- Referral source
- Notes

Follow-up and ownership:

- Owner
- Status
- Stage
- Date and time received
- Last updated date and time
- Last contacted date and time
- Follow-up due date and time
- Next scheduled follow-up
- Follow-up sequence
- Follow-up status
- Agent summary
- Agent recommended next move
- Activity history

Documents and links:

- Attached documents
- Document links
- Public intake/source link
- Internal record link
- Related deal links
- Related meeting links

## Leads Navigation Requirements

- Clicking "Leads" in the left sidebar should always take the user back to the main Leads list.
- Opening an individual lead must not trap the user inside that lead.
- The user should always understand where they are: Leads list, lead detail, or lead creation.
- The user should be able to move in and out of a lead record without losing context.
- The left sidebar and the assistant/chat should both be able to take the user to the same lead information.

## Story Navigation Requirements

- Story client/deal selection must use scalable searchable controls, not a horizontal rail of capsules.
- Story must support searching by client/company.
- Story must support searching by contact/team member.
- Story must support searching within story content such as notes, calls, documents, meetings, and voice notes.
- The selector pattern must work for hundreds of clients without visual overflow.
- Story filters should show how many records and story items are currently visible.
- Breadcrumbs, tabs, or a clear page title should make the current location obvious.

## Assistant And Navigation Requirements

- The assistant should be able to retrieve the most recent lead.
- The assistant should be able to open or reference a specific lead.
- The assistant should be able to help create a lead record with complete fields.
- The assistant should be able to summarize a lead and recommend the next action.
- The assistant should not replace normal navigation. It should work alongside the sidebar and product controls.

## Product Areas That Need To Exist

- Leads
- Deals
- Calendar
- Tasks
- Documents
- Voice Notes
- Messaging
- Agents
- Approvals
- Affiliate Center
- Invoicing Center
- Activity
- Settings

## Calendar Requirements

- Calendar should be treated as a first-class part of the deal platform.
- Users should be able to see upcoming meetings, follow-ups, deadlines, and next-action dates.
- Lead and deal records should connect to calendar activity.
- Meeting prep and post-meeting summaries should be available through agents.
- Scheduling a meeting must create a calendar event, generate or preserve a meeting link, and send invites to attendees.
- Meeting invites should work regardless of whether the attendee uses Gmail, Outlook, Apple Calendar, or another calendar client.
- Invites should include an ICS calendar attachment when email is available.
- The contact should receive the meeting message in their inbox.
- The ADGA owner/user should see the scheduled meeting in the ADGA Inbox and Calendar.
- Calendar should track invite delivery state: sent, skipped, failed, accepted, declined, tentative, and canceled.
- Meeting records should show attendees, meeting link, invite status, source record, connected lead/deal/contact, and agent prep/follow-up status.

## Affiliate Center Requirements

- ADGA needs a comprehensive affiliate center for platform owners.
- Affiliates need unique referral links and tracking codes.
- Affiliate attribution should track source, campaign, clicked date, signed-up account, subscription plan, revenue, commission, payout status, and fraud/risk flags.
- Owners should be able to approve, pause, reject, or archive affiliates.
- Owners should see affiliate performance by clicks, leads, signups, paid accounts, revenue, commission owed, and payout history.
- Affiliate records should connect to customers and subscriptions without exposing private platform internals.
- Affiliate payouts should be tracked even if payout execution is handled later.

## ADP Affiliate Page Requirements

- `adga.ai/adp` is a dedicated affiliate partner page for ADP.
- The page is not for ADGA to run payroll. It captures a complete payroll lead and sends that lead to ADP.
- The ADP page should collect full contact, company, payroll timing, current provider, state, company size, needs, notes, source, consent, and timestamps.
- ADP referral lead records should be stored in D1.
- Referral email deliveries should be stored in D1 with to-email, provider, status, provider response, sent date, created date, and updated date.
- The default routing email is `ADP_REFERRAL_TO_EMAIL`.
- Email delivery uses Postmark.
- The platform must track how many referral emails were sent for each ADP lead.
- The platform must track all date information for the lead and email delivery.
- This affiliate pattern should be reusable for future partners.

## Invoicing Center Requirements

- ADGA needs a full invoicing center for platform owners.
- Every registered account should also have its own invoicing center so users can invoice their own clients.
- Users should be able to create, send, view, duplicate, void, and mark invoices paid.
- Invoices should support line items, quantities, unit price, discounts, taxes, due dates, client information, notes, document links, status, payment link, and activity history.
- Invoice PDFs or generated files should be stored in R2, with invoice metadata in D1.
- ADGA should charge a transaction fee on user-created invoices.
- The maximum transaction fee is 5%.
- Transaction fee calculation should be automatic and seamless to the user.
- The platform must track gross invoice amount, platform fee percent, platform fee amount, net amount to user, payment status, and fee collection status.
- Owners need visibility into invoice volume, fees collected, unpaid invoices, failed payments, refunds, and disputes.
- The invoicing center should be designed so Whop/payment integration can be connected later without rebuilding the data model.
- Tenants must be able to connect where they receive money.
- Bank-account payout setup must support companies and individuals.
- Invoicing should support connector records for Stripe, PayPal, Whop, QuickBooks, bank accounts, and future providers.
- QuickBooks should be treated as a connector using the tenant's own login and accounting/payment workflow. ADGA should not recreate QuickBooks.
- Connector metadata belongs in D1. Connector secrets must not be stored in D1.
- Invoice payment routes should track provider, gross amount, platform fee, net to user, payment status, payout destination, refunds, disputes, and connector status.
- The Payments agent owns payout setup, connector readiness, invoice payment routing, platform fee tracking, and payment-state gaps.

## Data Storage Rules

- D1 is for metadata and structured records.
- R2 is for documents, uploads, generated files, and storage-heavy assets.
- Do not overcrowd D1 with large file bodies.
- Lead and deal records should store file metadata in D1 and file contents in R2.
- Voice-note audio files should be stored in R2.
- Voice-note metadata, transcript text, transcript status, and resource links should be stored in D1.

## Voice Notes And STT Requirements

- Users should be able to upload voice notes and meeting recordings.
- Voice notes should connect to leads, contacts, deals, meetings, and tasks.
- Audio files should be stored in R2.
- Transcriptions should run through Cloudflare Workers AI speech-to-text when available.
- The default STT model is `@cf/openai/whisper`.
- The transcript should be visible in the app and available for agent summaries, follow-up tasks, and meeting recaps.
- If AI is unavailable locally, the voice note should still be stored and marked for transcription later.

## SMS Requirements

- Do not use Twilio.
- Do not use Telnyx.
- Postmark remains the email provider; it should not be treated as an SMS provider.
- SMS should use a provider-neutral adapter so ADGA can connect to an open-source/self-hosted SMS gateway.
- The selected default direction is a self-hosted Android/SIM gateway, compatible with TextBee/httpSMS/Vendel-style HTTP APIs.
- SMS should be available for leadership use and for normal platform users.
- SMS metadata should be stored in D1.
- SMS should support connection to leads, contacts, deals, meetings, and follow-up workflows.
- ADGA should not charge users separately for SMS. The gateway should be treated as an available platform utility once configured.

## Deal Representation And Communication Requirements

- Deals must support a represented-client record so the platform clearly shows who ADGA represents.
- A represented client should be able to log in and see the status of their own deal.
- Client access must be scoped to the deal they are connected to.
- Each deal needs an internal team communication lane for private notes, calls, voice notes, decisions, blockers, and agent summaries.
- Each deal needs a client communication lane for client-visible updates, meeting invites, documents, SMS, email, and voice-note summaries.
- Internal communication should be private by default.
- Client-visible communication should be explicit and should write back to the deal timeline.
- Voice notes, SMS, email, calls, and meeting invites should never stand alone. They must include a resource trace such as `deal:DEAL-1210` or `lead:L-9881`.
- D1 stores communication metadata, statuses, transcripts, thread/message records, and trace IDs.
- R2 stores audio and large files.
- Workflow instructions live in `agents/communication/SKILL.md`.
- Communication state lives in `cloudflare/state/deal-communication.state.json`.
- Client portal state lives in `cloudflare/state/client-portal.state.json`.

## Agent Governance Requirements

- Feature ownership must be listed in `docs/AGENT_FEATURE_MAP.md`.
- Every agent has a Markdown file under `agents/*/SKILL.md`.
- Agent/job/event JSON state lives under `cloudflare/state/`.
- Do not build disconnected standalone features.
- Do not hardcode feature behavior that should come from workflow Markdown, JSON state, D1 records, or environment variables.

## Implementation Notes For The Next Build Pass

- This document is not permission to redesign the UI from scratch.
- Preserve the current provided UI direction unless explicitly changed.
- Improve behavior, data completeness, copy, state, and navigation around the provided interface.
- Keep `/` for marketing pages.
- Keep `/suite` for the application.
- Do not add Convex.
- Do not surface private implementation details on customer-facing pages.
