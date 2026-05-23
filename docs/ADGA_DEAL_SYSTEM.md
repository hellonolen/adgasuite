# The ADGA Deal System

Every deal runs on two tracks: **The Journey** (the software path, days to months) and **The Call** (what happens on a single call, minutes). The suite, the marketing, and the agent layer are built around these two tracks.

## The Journey

The full path a deal takes from arrival to repeat business.

**Lead → Qualify → Discover → Scope → Design → Close → Sign → Deliver → Expand**

| Stage | What it means |
|---|---|
| **Lead** | A new lead is in the system. Ad, referral, form, QR, inbound, import. |
| **Qualify** | Survey, score, decision to invest sales time. Owner assigned. |
| **Discover** | Discovery call done. Problem understood. |
| **Scope** | Tech call done. Terms, price, timeline, stakeholders agreed in principle. |
| **Design** | High-level design / proposal / plan delivered. |
| **Close** | Verbal deal done. Terms accepted. No ink yet. |
| **Sign** | Contract signed. Invoice fires. Payment triggers. Work queues. |
| **Deliver** | Sprints, closing, milestones — execution in motion. |
| **Expand** | Renewal, repeat, referral, upsell, or partner transition. |

## The Call

The flow inside a single sales call. Lives inside Qualify + Discover + Close on The Journey.

**Connect → Why → Situation → Tried → Ready → The wall → Future state → Close → Investment → Commitment → Sign**

| Stage | What it means |
|---|---|
| **Connect** | Rapport. |
| **Why** | Why this call. Why now. |
| **Situation** | What is actually happening. |
| **Tried** | What has already been tried. |
| **Ready** | Are they ready right now. |
| **The wall** | What is blocking them. |
| **Future state** | What life looks like once it is solved. |
| **Close** | Emotional commit to the future state. Two closing questions land here: *"Is there any reason we shouldn't work together?"* and *"If there's something that needs to happen between now and you reaching success based on what you've shared, what does that look like? I can help you with that."* |
| **Investment** | The price. Reveal only after Close. |
| **Commitment** | Verbal yes to the price. |
| **Sign** | Ink. Invoice fires. |

## How They Fit

The Journey is the dashboard view. The Call is the meeting brief and post-call summary template. Every call recorded in the suite is structured around The Call. Every deal moved in the pipeline is structured around The Journey.

| Long track | What runs inside |
|---|---|
| Qualify | Connect → Why → Situation → Tried → Ready (qualifying call) |
| Discover | Connect → Why → Situation → Tried → Ready → The wall → Future state (discovery call) |
| Scope / Design | Tech call covers the same flow plus scope confirmation |
| Close | The closing call ends at *Close* — the verbal deal is done, paperwork starts |
| Sign | Contract executed, invoice fires automatically |

## Sign Triggers Invoicing

Sign is the financial trigger. When a deal hits Sign:

1. **Documents agent** drafts the invoice (line items, terms, due date) and writes the PDF to R2.
2. **Payments agent** routes the payment link through the active connector (Whop today, Stripe next).
3. **Communication agent** prepares the invoice delivery email.
4. The drafted invoice + payment link + email sit in the **approval lane** until a human approves.
5. On approve → invoice sends, payment link opens, the deal moves to **Deliver**.

Payment status posts back to the deal timeline. Failure routes to the approval lane with a recovery action prepared.

## Objection Philosophy

Objections are not handled — they signal the lead is not ready. If real objections surface in the closing call, Qualify failed earlier. The lead returns to the queue with a follow-up scheduled, not pressure to overcome the objection.

> Nobody objects to toilet paper when they need it.

The call flow handles **questions**, not objections. Questions get answered. Objections route back to Qualify.

## Autonomy + Override Contract

At every stage on both tracks, the same contract holds:

1. **Agents do the work that doesn't need judgment** — drafting, scheduling, summarizing, transcribing, scoring, routing, surfacing.
2. **Agents prepare the work that does need judgment** — customer-facing emails, payments, signatures, status changes. These land in the approval lane with the agent's draft + reasoning + risk class.
3. **Humans decide and override** — approve, edit, reject. Always reversible inside the grace window.
4. **Every action persists** to the deal timeline with attribution.
5. **Pause anywhere** — single deal, pipeline lane, agent, or whole workspace.

## Agent Ownership

| Agent | Owns | Active in |
|---|---|---|
| **Conductor** | Routing, sequencing, escalation | Every stage |
| **Sales** | Lead scoring, follow-up cadence, pipeline risk | Lead, Qualify, Discover, Close |
| **Documents** | Proposals, contracts, invoices, summaries | Scope, Design, Sign |
| **Communication** | SMS, email, voice notes, meeting invites, transcripts | Every stage |
| **Operations** | Onboarding, reminders, workspace hygiene | Deliver |
| **Intelligence** | Company profiles, battlecards, comparables, market signals | Discover, Scope, Design, Expand |
| **Payments** | Connectors, payouts, fees, invoice routing | Sign, Deliver |
| **Voice** | Calls, scheduling, recording, transcription, summaries | Every stage with a call event |

## What This Looks Like In The Suite

The product must surface this contract everywhere a deal lives.

- **Pipeline view** shows The Journey as the kanban stages.
- **Deal detail page** opens with the **mindmap** of all related entities (parties, files, calls, commitments, next actions). Status pulses on overdue nodes.
- **Call brief** (before any call) uses The Call as its template. Auto-fills Situation / Tried / The wall from prior touches.
- **Call summary** (after any call) uses The Call as its summary structure. Agent fills it from the transcript; human edits.
- **Approval lane** is a top-level sidebar item. Every customer-facing prepared action lives here.
- **Timeline** shows every agent + human action in order.
- **Pause** is a control on every deal card, every stage column, every agent, and a workspace-level switch.

This is the system. It is not a feature list. It is the operating contract between the human and the deal.
