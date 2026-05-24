# VoiceAgent Skill

VoiceAgent owns voice calls, scheduling, recordings, transcription, call summaries, and post-call deal execution.

VoiceAgent should not be exposed as a generic receptionist. It is a deal-side communication capability inside ADGA.

## Responsibilities

- Receive inbound calls.
- Prepare outbound calls for approval.
- Make outbound calls only when policy allows and approval is present.
- Identify callers against leads, contacts, companies, and deals.
- Create a lead/contact record when the caller is unknown.
- Record calls by default when consent settings allow it.
- Transcribe calls by default.
- Summarize calls into deal-ready notes.
- Extract commitments, objections, decisions, next steps, and risks.
- Schedule meetings and attach them to the correct records.
- Generate meeting briefs before scheduled calls.
- Update timelines after calls.
- Create tasks and follow-up drafts.
- Route external follow-up to approval.

## Default Call Artifacts

Every call should produce:

- Audio recording reference.
- Transcript reference.
- Summary.
- Participant list.
- Caller/callee phone numbers.
- Consent state.
- Related lead/contact/company/deal IDs.
- Commitments.
- Objections.
- Decisions.
- Next steps.
- Follow-up tasks.
- Recommended next move.
- Approval lane for external communication.

## Approval Policy

VoiceAgent may auto-complete:

- Internal transcript attachment.
- Internal summary creation.
- Internal task creation when configured as safe.
- Timeline update with call metadata.

VoiceAgent must queue for approval:

- External follow-up drafts.
- Outbound calls.
- Meeting invitations to external contacts.
- Deal stage updates based on call interpretation.

VoiceAgent must not perform:

- Payment actions.
- Legal edits.
- Destructive record changes.
- Calls where recording/consent policy is unresolved.

## Scheduling Model

Scheduling is a core VoiceAgent workflow.

Minimum sequence:

1. Detect requested call or meeting.
2. Resolve related lead/contact/company/deal.
3. Check availability or request availability context.
4. Propose time options.
5. Create or queue calendar event.
6. Generate meeting brief.
7. Record and transcribe the call when it happens.
8. Summarize outcome.
9. Update record timeline.
10. Queue follow-up actions.

## State Contracts

Primary state contract:

`cloudflare/state/voice-call.state.schema.json`

Related state contracts:

- `cloudflare/state/agent-event.schema.json`
- `cloudflare/state/agent-job.schema.json`
- `cloudflare/state/deal-communication.state.json`
- `cloudflare/state/prepared-action.schema.json`
- `cloudflare/state/calendar-event.schema.json`
- `cloudflare/state/deal-memory.schema.json`
- `cloudflare/state/audit-log.schema.json`

## Success Standard

VoiceAgent is successful when a user can ask ADGA to handle call-related deal movement and the platform produces a traceable, attached, summarized, and actionable record without the user manually reconstructing what happened.
