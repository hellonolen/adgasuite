# GAPS — ADGA Suite

Last audited: 2026-05-23
North star: $1,000,000/month
Current MRR: $0 (pre-launch — billing flow not yet exercised end-to-end)
Distance to target: $1,000,000/month

## Top 10 Gaps (Ordered by Revenue Impact)

| # | Gap | Revenue Impact | Blocker? | Owner | Status |
|---|-----|----------------|----------|-------|--------|
| 1 | Stripe checkout → magic-link provisioning not verified end-to-end. Pricing claims it works; the wiring may have drift. | All MRR at risk if signup → workspace fails | Yes | Sales + Payments | Not started |
| 2 | Voice-note auto-transcription claimed on every plan but the transcription job pipeline may not be hitting an LLM that produces text. | ~$15K/mo (Pro tier credibility) | No | Voice | Not verified |
| 3 | Suite shell is a 8000-line monolith with `@ts-nocheck`; every workspace renderer lives inside one file. Restructure into `app/suite/<route>/page.tsx` per-route components with shared state via Context. Currently each route is a thin SuiteClient wrapper that bootstraps the monolith. | ~$30K/mo unlocked (velocity tax, bug surface) | No | Platform | In progress (routes.ts contract landed; per-route extraction next) |
| 4 | Seat management UI in workspace settings — pricing says "Add seats any time from workspace settings"; no seat UI exists. | ~$8K/mo from Team upgrades | No | Sales | Not started |
| 5 | Six legacy CSS files (~9k lines, `final-overrides.css` full of `!important` overrides) are the visual debt that keeps fighting layout fixes. | Indirect; slows every UI change | No | Platform | Not started |
| 6 | `/api/agent/chat` doesn't yet surface the live deal context (deals on the board, recent events) into the system prompt by default — only when explicit `kind:"map"` is passed. Workspace chat is generic. | ~$5K/mo (perceived AI value) | No | Intelligence | Partial |
| 7 | Approval queue has API + admin UI scaffolds but no end-to-end notification path (email / in-app) when an approval is created. | ~$4K/mo (Team tier retention) | No | Conductor | Not started |
| 8 | No customer revenue dashboard inside `/suite/intelligence` — KPIs compute from local `deals` array, not aggregated D1 revenue or Stripe MRR. | Operator-side, but Intelligence agent can't act on it | No | Intelligence | Not started |
| 9 | Watermarked client shares (Enterprise pricing claim) — `/share/map/[token]` exists but does not yet watermark or rate-limit access. | Required for Enterprise pricing claim | No | Documents | Not started |
| 10 | MCP server (`mcp-server.ts`) does not exist at project root. Per the canonical agentic backbone, every project exposes its agent capabilities through MCP. | Indirect; blocks orchestration from external tools | No | Conductor | Started in this audit |

## Anti-Gap List (do not promote these to gaps)

- More agents — we already have the 7 canonical agents (some renamed). Do not add another.
- More CSS files — the existing six are already too many. Future visual work consolidates, never adds.
- More marketing pages — pricing/product/home/cases/process is enough. New marketing copy improves these, doesn't bolt on.
- SSO — explicitly removed from Enterprise pricing copy this cycle. Don't reintroduce until built.

## Resolved (most recent first)

- 2026-05-23 — Standalone /suite/* pages bypassing the shell — replaced 17 with shell-mounting pages, then collapsed to a registry-driven contract (`app/suite/routes.ts`).
- 2026-05-23 — Audit log immutability — events API is POST-only; contract comment added so future contributors don't add mutation handlers.
- 2026-05-23 — Hardcoded fake metrics ($284.6M weighted, 17 deals) — replaced with computed values from the live deal set.
- 2026-05-23 — Seed-data persistence on first real-user login — chat + deal seed now wipe when `/api/suite/state` confirms a real session.
- 2026-05-23 — Pricing page density — rebuilt with comparison table, trust strip, per-plan feature breakdown.
