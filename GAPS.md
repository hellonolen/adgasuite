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
| 3 | AdgaSuite.tsx (8000+ lines) still contains 20+ workspace renderers inline. WorkspaceContract pattern shipped (`app/suite/workspaces.ts`) — KnowledgeWorkspace extracted as proof point. Next 20 workspaces need mechanical migration into `components/suite/workspaces/<Name>.tsx`, each consuming `useSuite()` from `components/suite/suite-context.tsx`. | ~$30K/mo (velocity tax, bug surface) | No | Platform | In progress (1 of 21 extracted) |
| 4 | Seat management UI in workspace settings — pricing says "Add seats any time from workspace settings"; no seat UI exists. | ~$8K/mo from Team upgrades | No | Sales | Not started |
| 5 | Six legacy CSS files (~9k lines, `final-overrides.css` full of `!important` overrides) are the visual debt that keeps fighting layout fixes. | Indirect; slows every UI change | No | Platform | Not started |
| 6 | Bus is wired end-to-end: agent jobs/approvals/lead intake all publish through `lib/events/bus.ts` with delivery tracking + dead-letter parking. Client mirror still only receives `suite.route_viewed` — server→client streaming (SSE or polling) is the next link to close so workspaces can react to agent activity in real time. | ~$10K/mo (perceived AI velocity) | No | Intelligence + Platform | Server-side complete; client-side streaming pending |
| 7 | Approval queue has API + admin UI scaffolds but no end-to-end notification path (email / in-app) when an approval is created. | ~$4K/mo (Team tier retention) | No | Conductor | Not started |
| 8 | No customer revenue dashboard inside `/suite/intelligence` — KPIs compute from local `deals` array, not aggregated D1 revenue or Stripe MRR. | Operator-side, but Intelligence agent can't act on it | No | Intelligence | Not started |
| 9 | Watermarked client shares (Enterprise pricing claim) — `/share/map/[token]` exists but does not yet watermark or rate-limit access. | Required for Enterprise pricing claim | No | Documents | Not started |
| 10 | MCP HTTP transport shipped at `/api/mcp`. External orchestrators can now GET the inventory (routes + workspaces + actions + skills + bus handler stats) and POST tool calls. Direct dispatch wires through `agent_job.started` event publication; per-action native handlers (e.g. `pipeline.deal.update_stage` → deal mutation API) are the next layer. | Indirect; unlocks external orchestration | No | Conductor | Transport shipped, per-action native dispatch pending |

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
