# GAPS — ADGA Suite

Last audited: 2026-05-29
North star: $1,000,000/month
Current MRR: $0 (pre-launch — billing flow not yet exercised end-to-end)
Distance to target: $1,000,000/month

## Top 10 Gaps (Ordered by Revenue Impact)

| # | Gap | Revenue Impact | Blocker? | Owner | Status |
|---|-----|----------------|----------|-------|--------|
| 1 | Stripe checkout → magic-link provisioning not verified end-to-end. Pricing claims it works; the wiring may have drift. | All MRR at risk if signup → workspace fails | Yes | Sales + Payments | Not started |
| 2 | Voice-note auto-transcription claimed on every plan but the transcription job pipeline may not be hitting an LLM that produces text. | ~$15K/mo (Pro tier credibility) | No | Voice | RESOLVED 2026-05-29 — verified end-to-end. Uploaded a 1-second WAV to POST /api/voice-notes, route returned `transcription_status:"completed"` with `transcript_text`, `transcript_vtt`, and `word_count` populated by `@cf/openai/whisper`. Fixed a pre-existing platform bug along the way: `requireUser` / `requireAdmin` were 401ing every prod request because `getRuntimeContext` never read the session cookie. Added `hydrateUserFromSession()` so any route can opt in. |
| 3 | AdgaSuite.tsx (8000+ lines) still contains 20+ workspace renderers inline. WorkspaceContract pattern shipped (`app/suite/workspaces.ts`) — KnowledgeWorkspace extracted as proof point. Next 20 workspaces need mechanical migration into `components/suite/workspaces/<Name>.tsx`, each consuming `useSuite()` from `components/suite/suite-context.tsx`. | ~$30K/mo (velocity tax, bug surface) | No | Platform | In progress (4 of 21 extracted — Knowledge, VoiceNotes, Messaging, Reports). Remaining: Home, Pending, Inbox, Tasks, Calendar, Teams, Leads, Pipeline, Story, CRM, Documents, Intelligence, Admin, Affiliates, Invoicing, Billing, Settings. |
| 4 | Seat management UI in workspace settings — pricing says "Add seats any time from workspace settings"; no seat UI exists. | ~$8K/mo from Team upgrades | No | Sales | RESOLVED 2026-05-29 — `/suite/settings/seats` registered in routes contract with `seats.read` / `seats.update` capabilities. Page renders plan, included seats, used, extra-seat cost, member list, "Add seats" CTA that hands off to the Stripe billing portal. |
| 5 | Six legacy CSS files (~9k lines, `final-overrides.css` full of `!important` overrides) are the visual debt that keeps fighting layout fixes. | Indirect; slows every UI change | No | Platform | PARTIAL 2026-05-29 — audited and documented. Baseline: 6 files, 12,281 lines, 942 `!important`, 2,212 selectors (see `.css-audit.json`, regenerate with `npm run css:audit`). Architecture written to `components/adga/CSS_ARCHITECTURE.md` with cascade order and per-file role. Finding: `final-overrides.css` is **not** the debt — its 56 `!important` are deliberate breakpoint hammers. The real debt is `globals.css` at 7,634 lines (736 `!important`) with overlapping "final pass" sections. Removing dead rules safely requires a visual regression pass (Playwright screenshot diff) that this session can't run; sequenced plan documented in the architecture doc. |
| 6 | Bus is wired end-to-end: agent jobs/approvals/lead intake all publish through `lib/events/bus.ts` with delivery tracking + dead-letter parking. Client mirror still only receives `suite.route_viewed` — server→client streaming (SSE or polling) is the next link to close so workspaces can react to agent activity in real time. | ~$10K/mo (perceived AI velocity) | No | Intelligence + Platform | RESOLVED 2026-05-29 — `/api/events/stream` GET + `useEventStream()` polling fan-out wired through `SuiteContextProvider`. |
| 7 | Approval queue has API + admin UI scaffolds but no end-to-end notification path (email / in-app) when an approval is created. | ~$4K/mo (Team tier retention) | No | Conductor | RESOLVED 2026-05-29 — `lib/server/approval-notify.ts` resolves owner/admin recipients from D1 + `ADGA_ADMIN_EMAILS`, sends Postmark email with deep link to `/suite/admin/audit?approval_id=…`. Fires from `/api/agent/approvals` POST after the bus publish; failures don't block. |
| 8 | No customer revenue dashboard inside `/suite/intelligence` — KPIs compute from local `deals` array, not aggregated D1 revenue or Stripe MRR. | Operator-side, but Intelligence agent can't act on it | No | Intelligence | RESOLVED 2026-05-29 — page renders live MRR / ARR / pipeline / weighted pipeline / leads / contacts / by-stage / by-subscription, all aggregated server-side from D1. |
| 9 | Watermarked client shares (Enterprise pricing claim) — `/share/map/[token]` exists but does not yet watermark or rate-limit access. | Required for Enterprise pricing claim | No | Documents | RESOLVED 2026-05-29 — rotated diagonal watermark + bottom-right pill on `/share/map/[token]`; in-memory rate limit (5 req / 60 s per IP) preserved. |
| 10 | MCP HTTP transport shipped at `/api/mcp`. External orchestrators can now GET the inventory (routes + workspaces + actions + skills + bus handler stats) and POST tool calls. Direct dispatch wires through `agent_job.started` event publication; per-action native handlers (e.g. `pipeline.deal.update_stage` → deal mutation API) are the next layer. | Indirect; unlocks external orchestration | No | Conductor | RESOLVED 2026-05-29 — `lib/server/mcp-native-dispatch.ts` registry: native handlers for `pipeline.deal.update_stage`, `billing.download_invoice`, `settings.toggle_notification`. POST /api/mcp consults registry first, emits `agent_job.completed` with the result, falls back to event emission for unregistered actions. GET /api/mcp now lists `native_dispatch` ids so external orchestrators can discover them. |

## Anti-Gap List (do not promote these to gaps)

- More agents — we already have the 7 canonical agents (some renamed). Do not add another.
- More CSS files — the existing six are already too many. Future visual work consolidates, never adds.
- More marketing pages — pricing/product/home/cases/process is enough. New marketing copy improves these, doesn't bolt on.
- SSO — explicitly removed from Enterprise pricing copy. Don't reintroduce until built.
- pushState routing — eliminated. Sidebar uses `<Link>`, programmatic nav uses `router.push()`. No more dual systems.

## Resolved (most recent first)

- 2026-05-23 — **WorkspaceContract** shipped (`app/suite/workspaces.ts`). Each /suite/* surface now declares renderer, required agents, required skills, emitted events, allowed actions, capability visibility, approval policy. KnowledgeWorkspace extracted as the first concrete consumer.
- 2026-05-23 — **Event-driven UI rail** laid down. `lib/events/hooks.ts` provides `useSuiteEvent(type, handler)` backed by a BroadcastChannel-mirrored client emitter. Server-emitted events reach the client via `emitSuiteEvent()` calls in the originating effect.
- 2026-05-23 — **SuiteContextProvider** mounted in AdgaSuite App. Workspaces consume shared state (user, deals, leads, openDeal, tweaks, navigate, setQuickCreate) via `useSuite()` instead of receiving props through the in-monolith route switch.
- 2026-05-23 — **pushState removed**. Sidebar uses `next/link <Link>`. Programmatic nav uses `useRouter().push()`. One navigation system, URL is the only source of truth.
- 2026-05-23 — **Agentic backbone files** added at root: `AGENTIC_BACKBONE.md`, `GAPS.md`, `lib/events/{types,bus,subscriptions,autonomy}.ts`, `mcp-server.ts`. Project structurally complies with the global canonical doc.
- 2026-05-23 — **Routes contract** (`app/suite/routes.ts`) — sidebar, layout, crumbs, route matching all read from one typed registry. ROUTE_PATHS / ROUTE_LABELS / SUITE_ROUTE_IDS no longer maintained in multiple drifted copies.
- 2026-05-23 — Standalone /suite/* pages bypassing the shell — collapsed to one-line `return null` pages; `app/suite/layout.tsx` owns the shell once.
- 2026-05-23 — Audit log immutability — events API is POST-only; contract comment added so future contributors don't add mutation handlers.
- 2026-05-23 — Hardcoded fake metrics ($284.6M weighted, 17 deals) — replaced with computed values from the live deal set.
- 2026-05-23 — Seed-data persistence on first real-user login — chat + deal seed now wipe when `/api/suite/state` confirms a real session.
- 2026-05-23 — Pricing page density — rebuilt with comparison table, trust strip, per-plan feature breakdown.
