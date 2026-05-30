# ADGA — One-Pager

## The deal platform for closers
Designed for the operators who carry the number. Every contact, every call,
every commitment locked to the deal — surfaced when it's time to act.

---

## The problem
Dealmakers — M&A advisors, sales operators, capital-raise leads — run their
pipelines through 6+ disconnected tools: a CRM that tracks no real activity, a
shared drive of stale documents, a calendar that doesn't know about the deal,
an inbox that loses threads, and a spreadsheet to compensate. The deal lives
in the operator's head. When they're offline, the deal is offline.

## The product
ADGA is one workspace where the deal is the spine. A visual canvas places every
counterparty, contact, document, call, and task around the deal. An agentic
assistant — built on a 7-agent backbone — keeps the deal moving: scores risk,
drafts follow-ups, schedules calls, summarizes voice notes, surfaces next moves,
all gated by an approval lane the operator controls.

## How it's different
- **Deal-centric, not record-centric.** Every other CRM is a database of contacts
  with deals attached. ADGA is the inverse — the deal is the object, everything
  hangs off it visually.
- **Agentic by design, not bolted-on AI.** The 7 agents are the product. UI
  surfaces what the agents have prepared. The operator approves, edits, or
  rejects — autonomy gate visible at every step.
- **Built on a contract-first, event-driven backbone.** 23 state contracts in
  JSON. Append-only event log. Replay + dead-letter. Audit + recovery at the
  platform level, not bolted on.

## Traction
- **Status:** production-deployed at adga.ai on Cloudflare's edge. Stripe
  checkout wired live mode, webhook subscription provisioning verified end-to-end.
- **Stack proven at zero ops cost:** Next.js 15 on Cloudflare Workers,
  D1, R2, Workers AI (Kimi 2.6 chat + Whisper transcription verified).
- **Early access:** founder + 2 admin operators currently in production usage.
- **MRR:** pre-launch — billing flow exercised end-to-end via signed simulated
  webhook; first paid customer hold pending launch campaign.

## Market
- **Total dealmaking software** (CRM, deal rooms, pipeline tools): $80B+ TAM
  across M&A advisory, capital markets, complex B2B sales.
- **Closest comps:** Affinity ($2B valuation, 2021), modern CRMs raising
  at $1B+ in 2024, Salesforce Deal Studio (legacy).
- **Wedge:** small-firm M&A + capital-raise advisors who can't justify a
  Salesforce/Affinity seat but lose deals in spreadsheets. Bottom-up by seat
  density on the operator side of the desk.

## Pricing
- **Pro:** $99/mo · 1 seat · all features
- **Team:** $299/mo · 3 seats included, $99 per extra seat
- **Enterprise:** $799/mo · 10 seats included, $149 per extra seat, watermarked
  client shares, advanced governance

## Use of funds (pre-seed)
- 40% — paid acquisition validation (Meta + LinkedIn + dealmaker community sponsorships)
- 30% — agentic features the early customer loop demands (deal-memory deepening,
  prepared-action lanes, native MCP dispatch coverage)
- 20% — design system consolidation + first-run onboarding
- 10% — operations buffer + legal (TOS, MSA templates for Enterprise)

## Why now
- Agentic infrastructure (Cloudflare Workers AI, MCP, model-routing) became
  production-ready in 2026. Closer-side AI products built on this stack didn't
  exist 12 months ago.
- Dealmakers are the last knowledge-work cohort whose primary tool is still
  email + spreadsheet. Every horizontal SaaS has tried; none built deal-shaped.

## Team
- **Nolen Hendreson** — founder, sole operator. Background: 10+ years building
  product, last 18 months on the agentic backbone that runs ADGA.
- Two admin operators on the platform (Kamaro Kyle, Tracy Hogan).

## Ask
- **Pre-seed: $250K** for 6 months runway to convert the production stack into
  $30K MRR through the validation loop described in use of funds.
- **Lead investor wanted** for the round; structuring as a priced seed or
  SAFE-cap depending on lead preference.

## Contact
hellonolen@gmail.com · adga.ai
