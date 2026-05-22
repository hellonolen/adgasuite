# ADGA Deal Process Spine

This document defines the customer-facing deal process ADGA must support. It exists so the product does not feel like a manual Kanban board, a loose CRM, or disconnected tools.

ADGA is a deal execution platform. The platform can be described as agentic, but public-facing product copy should not expose internal agent roles or behind-the-scenes automation mechanics.

## Core Promise

ADGA gives a team a clear path from first signal to repeat purchase.

The platform should always answer:

- Where did this deal come from?
- What stage is it in?
- What needs to happen next?
- Who is attached to it?
- What proof, documents, calls, and commitments support it?
- What blocks the close?
- What happens after the first purchase?

## Deal Anatomy

Every deal should have:

- Source signal
- Lead or existing opportunity
- Primary contact
- Company or account
- Deal record
- Stage
- Stage confidence
- Next action
- Due date
- Owner
- Related calls
- Related meetings
- Related documents
- Related messages
- Commitments
- Risks
- Approvals
- Payment or purchase event
- Follow-on opportunity

## Sovereign Deal Process

The default ADGA process has eight stages:

1. **Signal**
   - A new source appears: ad response, referral, inbound form, import, call, email, QR link, event, partner, or existing pipeline.
   - ADGA should capture source, intent, contact, company, and context.

2. **Capture**
   - The signal becomes a lead or imported opportunity.
   - Required work: dedupe, enrich, assign owner, create contact/company, set urgency, and define the first next action.

3. **Qualify**
   - The lead is checked for fit, budget, authority, need, timing, and strategic value.
   - Required work: call, message, research, qualification notes, and disqualification reason if rejected.

4. **Shape**
   - The opportunity becomes a real deal path.
   - Required work: define offer, terms, stakeholders, expected value, close date, blockers, required files, and meeting plan.

5. **Advance**
   - The team moves the deal through active follow-up, documents, meetings, objections, and commitments.
   - Required work: follow-up cadence, meeting briefs, call notes, task queue, updated stage confidence, and deal timeline.

6. **Close**
   - The deal reaches purchase, signature, payment, onboarding, or final accepted commitment.
   - Required work: final documents, invoice/payment status, decision record, signed terms, close summary, and handoff.

7. **Deliver**
   - The customer receives the promised product, service, access, onboarding, or next operational step.
   - Required work: onboarding tasks, success milestones, delivery notes, support route, and relationship owner.

8. **Expand**
   - The customer is evaluated for repeat purchase, renewal, referral, upsell, cross-sell, or partner opportunity.
   - Required work: outcome review, satisfaction signal, expansion trigger, and next offer path.

## Existing Deal Import

ADGA must support bringing existing deals onto the platform without forcing the user to start from a new lead.

Import sources:

- CSV
- Manual entry
- Existing CRM export
- Email thread
- Calendar history
- Document folder
- Call transcript
- Spreadsheet

Import requirements:

- Create or match contact.
- Create or match company.
- Create deal record.
- Assign stage.
- Capture current value, close date, source, owner, and next action.
- Attach known documents.
- Attach relevant calls, meetings, notes, and messages when available.
- Create missing-data tasks.
- Produce a first deal brief.

## Required User Experience

The product should show deal progress as a process, not just a board.

Required surfaces:

- A lifecycle indicator for each deal.
- A stage definition panel.
- A next-action panel.
- A missing-data panel.
- A risk and blocker panel.
- A history timeline.
- An import existing deals flow.
- A post-close expansion panel.

## Workspace Activation

ADGA should not sell the platform around a public free trial.

The first customer experience should be a seven-step activation path:

1. Import or create deals.
2. Connect contacts and companies.
3. Attach documents and notes.
4. Set stages and close paths.
5. Create next actions.
6. Review risks and blockers.
7. Run the weekly close plan.

This can be delivered as an onboarding checklist, an email sequence, an in-app progress tracker, or all three.

The activation path is not a 7-day free trial. It is the setup process for getting real deals into ADGA quickly.

Do not default to a 14-day trial. Do not make "free trial" the public promise.

## Public Copy Rules

Use:

- Agentic deal flow.
- Deal execution platform.
- Move deals forward.
- Start closing deals.
- Bring existing deals into ADGA.
- Run the deal process from signal to close.
- Your organized deal flow from lead to close, then repeat.

Avoid:

- Access/request language.
- Named internal agents.
- Behind-the-scenes automation mechanics.
- Manual follow-up from ADGA staff.
- Long trial framing.
- Free trial as the primary CTA.
