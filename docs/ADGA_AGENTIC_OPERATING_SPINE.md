# ADGA Agentic Operating Spine

This document is the source of truth for making ADGA Suite an agentic deal execution platform. It exists to prevent random coding, visual spot-fixing, and disconnected feature work.

Before implementation starts, new agentic work must be reflected in:

- This markdown document.
- `docs/ADGA_DEAL_PROCESS_SPINE.md` when the work changes the deal lifecycle, import flow, stage model, or post-close expansion.
- The relevant agent markdown file in `agents/*/SKILL.md`.
- A JSON state/schema file when the work creates durable state.
- `docs/AGENT_FEATURE_MAP.md` when ownership or routing changes.

## Product Position

ADGA is a deal execution platform.

The product should not behave like a generic CRM with chat added to the side. ADGA should watch the deal workspace, prepare the next move, and keep work moving toward close.

The customer-facing promise:

> ADGA keeps every lead, contact, document, meeting, call, decision, task, and agent action tied to the deal record so teams can move deals forward without losing the next step.

## Target Agentic Score

The platform target is **85/100 agentic**.

Do not target 100/100 autonomy. Deal work involves external communications, legal documents, payments, client commitments, and sensitive records. ADGA should be highly proactive while preserving human control.

Target breakdown:

| Area | Target |
| --- | ---: |
| Agentic positioning | 90 |
| Agentic UI surface | 85 |
| Platform-wide agency | 80 |
| Autonomous workflow execution | 75 |
| User override and approval model | 90 |
| Auditability and trust | 85 |

## Operating Principles

- Start from the deal outcome, not the feature.
- Every action should attach to a lead, contact, company, deal, document, meeting, invoice, task, or voice call.
- The assistant should search the whole platform, not just the current page.
- Agents should prepare actions, not only suggest them.
- Humans can approve, override, pause, or audit important actions.
- Safe internal actions may be automatic when the policy allows it.
- External communication, payments, legal edits, account changes, and destructive edits require explicit approval.
- Agent activity must be visible and traceable.
- No customer-facing copy should imply there is a human sales team waiting for contact.
- Primary CTA language should be outcome-oriented deal movement language. Do not use access/request phrasing or vague product-entry phrasing.
- The deal lifecycle, existing-deal import model, trial policy, and post-close expansion path are defined in `docs/ADGA_DEAL_PROCESS_SPINE.md`.

## The Ten Required Capabilities

### 1. Real System Of Record

Every lead, contact, company, deal, document, email, call, meeting, invoice, task, approval, and agent action needs a durable relationship to the right record.

Minimum outcome:

- A user can open a deal and see the full execution history.
- A user can open a contact and see the related deals, calls, notes, documents, tasks, and follow-ups.
- A user can open a document and see which contact, company, and deal it belongs to.

### 2. Platform-Wide Search And Retrieval

ADGA chat must be able to search across the entire workspace.

Search scope:

- Leads
- Contacts
- Companies
- Deals
- Documents
- Calendar events
- Meetings
- Voice calls
- Transcripts
- Tasks
- Invoices
- Messages
- Notes
- Agent events
- Approval history

Minimum outcome:

- A user can ask, "What happened with Northbound Therapeutics?" and ADGA can retrieve the relevant deal, contact, documents, calls, and next steps.

### 3. Persistent Deal Memory

ADGA needs memory per deal, contact, and company.

Memory should answer:

- What happened?
- What changed?
- Who owes what?
- What is blocking close?
- What was promised?
- What is the next action?
- What did the last call or meeting produce?

Minimum outcome:

- Deal memory is updated after calls, meetings, uploads, status changes, and approved agent actions.

### 4. Autonomous Monitoring

ADGA should continuously watch for deal movement and risk.

Monitoring signals:

- Stale deals
- Missing follow-ups
- No-response periods
- Unsigned documents
- Upcoming meetings
- Missing fields
- Unassigned leads
- Overdue invoices
- Stage slippage
- Close-date movement
- Missing next action

Minimum outcome:

- ADGA surfaces a daily queue of risks, next moves, and prepared actions.

### 5. Prepared Actions

ADGA should prepare the action, not simply say what could be done.

Prepared actions include:

- Draft email
- Draft SMS
- Prepare call script
- Schedule task
- Draft meeting agenda
- Summarize document
- Update deal record
- Attach document
- Create invoice reminder
- Move deal stage
- Queue follow-up sequence

Minimum outcome:

- The user sees a ready-to-approve action with context, source records, and risk level.

### 6. Approval Lanes

ADGA needs explicit action lanes.

| Lane | Behavior | Examples |
| --- | --- | --- |
| Safe internal | Can auto-complete with audit | Add internal task, update missing metadata, attach transcript |
| Review recommended | Queue for approval | Draft follow-up, stage move, meeting agenda |
| Explicit approval | Never auto-send | External email/SMS, outbound call, invoice/payment action, legal document edit |
| Restricted | Block or require admin | Delete records, change security, alter billing, export sensitive data |

Minimum outcome:

- Every prepared action has a lane, reason, source, and audit event.

### 7. Workflow Agents

ADGA needs internal agent capabilities, even when they are not exposed to customers as named bots.

Core agents:

- Conductor Agent
- Sales Agent
- Operations Agent
- Documents Agent
- Intelligence Agent
- Communication Agent
- Payments Agent
- VoiceAgent

Minimum outcome:

- Agent ownership is documented before work begins.

### 8. Event Engine

ADGA needs triggers that convert workspace events into agent work.

Required triggers:

- New lead submitted
- Lead urgency changed
- No response in configured window
- Meeting scheduled
- Meeting ended
- Voice call completed
- Transcript created
- Document uploaded
- Document viewed
- Deal stage changed
- Close date moved
- Invoice created
- Invoice overdue
- Approval accepted
- Approval rejected

Minimum outcome:

- Events create agent jobs and audit entries without requiring the user to manually prompt the assistant.

### 9. Action Audit Trail

Every agent action must explain what happened and why.

Audit fields:

- Actor or agent
- Trigger
- Source records
- Proposed action
- Risk lane
- Approval state
- Timestamp
- Result
- Reversal or override path when applicable

Minimum outcome:

- A user can inspect why ADGA recommended or completed an action.

### 10. Outcome Dashboard

ADGA should prove that agency is happening.

Dashboard examples:

- Deals monitored
- Follow-ups prepared
- Follow-ups sent after approval
- Close risks detected
- Meetings briefed
- Calls recorded
- Calls transcribed
- Stale records repaired
- Documents attached
- Invoices followed up
- Dollar value at risk

Minimum outcome:

- The home dashboard shows operating outcomes, not decorative metrics.

## VoiceAgent Layer

VoiceAgent is the communication execution layer for calls and scheduling.

It should not be positioned as a generic receptionist or voice bot. It should be a deal-side voice capability that helps qualify, schedule, follow up, capture call intelligence, and update deal records.

### VoiceAgent Responsibilities

- Receive inbound calls.
- Make outbound calls after approval.
- Identify callers or create new contact/lead records.
- Qualify leads against configured intake questions.
- Schedule calls and meetings.
- Prepare call briefs.
- Use deal context during calls.
- Record calls by default when compliance settings allow it.
- Transcribe calls by default.
- Summarize calls.
- Extract objections, commitments, decisions, next steps, and risks.
- Update the related lead, contact, company, deal, and timeline.
- Create tasks and follow-up drafts.
- Queue external follow-up for approval.

### Call Recording And Transcription

Every call should be recorded, transcribed, summarized, and attached by default, subject to consent and jurisdiction settings.

Minimum call artifacts:

- Audio recording
- Transcript
- Summary
- Participants
- Consent state
- Related lead/contact/company/deal
- Key commitments
- Objections
- Decisions
- Follow-up tasks
- Recommended next move
- Approval lane for any external communication

### Scheduling

Scheduling should be a first-class workflow, not an afterthought.

VoiceAgent and ADGA should support:

- Proposed meeting times
- Calendar availability checks
- Meeting confirmation
- Reminder creation
- Meeting brief generation
- Post-call summary
- Follow-up draft
- Deal timeline update

## JSON-First Development Rule

For agentic work, do not start by building UI.

The preferred order is:

1. Markdown requirement.
2. Agent ownership in markdown.
3. JSON state/schema.
4. Event contract.
5. Approval policy.
6. API or worker job.
7. UI surface.
8. Browser verification.
9. Production deploy.

## Initial Task List

The structured task list lives in:

`docs/ADGA_AGENTIC_TASKS.json`

Use that file to track phases, owners, dependencies, state contracts, and acceptance criteria.

## First Build Phases

### Phase 1: Spine And Contracts

- Establish docs and JSON contracts.
- Add VoiceAgent ownership.
- Define call state, transcript state, and approval lanes.
- Update feature routing.

### Phase 2: Retrieval And Record Graph

- Workspace-wide search scope.
- Relationship graph for lead/contact/company/deal/document/meeting/call/task.
- Deal memory object.

### Phase 3: Event Engine And Monitoring

- Trigger agent jobs from real platform events.
- Add monitoring for stale deals, missing follow-ups, no-response periods, and upcoming meetings.

### Phase 4: Prepared Actions And Approvals

- Create prepared action format.
- Add lane classification.
- Route actions to approval queue.
- Add audit entries.

### Phase 5: VoiceAgent

- Call state contract.
- Recording and transcript storage contract.
- Scheduling flow.
- Inbound and outbound call policies.
- Post-call record update pipeline.

### Phase 6: Outcome Dashboard

- Surface agentic work completed, pending, and blocked.
- Show measurable deal movement.
