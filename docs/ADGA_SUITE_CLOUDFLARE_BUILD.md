# ADGA Suite Cloudflare Build

## Decision

ADGA Suite is a new Cloudflare-native production platform for `adga.ai`.

This is a clean Cloudflare-native build. The existing ADGA repo is used as product and visual reference only: current public pages, current premium light UI, current Suite module layout, and current workspace workflow shape.

## Product Shape

ADGA has one platform domain:

- `adga.ai`

The platform has two surfaces:

- Public marketing site: sells ADGA Suite as subscription software.
- Workspace tool: authenticated ADGA Suite environment for customers.

## Non-Negotiables

- Full production product, not MVP.
- No demo-only workflows in production.
- No placeholder backend.
- No legacy backend dependency in the new Cloudflare runtime.
- No legacy table migration.
- No dark-mode redesign.
- Preserve the current premium light SaaS presence.
- Use Cloudflare as the production environment.

## Cloudflare Stack

- Next.js with OpenNext on Cloudflare.
- Cloudflare Workers for API/runtime.
- Cloudflare Worker AI binding for ADGA Suite agent intelligence.
- Cloudflare D1 for structured product data.
- Cloudflare R2 for files, uploads, exports, and media assets.
- Cloudflare Assets for Next/OpenNext static frontend files.
- Kimi 2.6 as the intended primary model through Cloudflare Worker runtime.
- Cloudflare secrets for billing, email, webhook, and approved third-party service keys.
- Cloudflare Workers/custom-domain cutover only after production verification passes.

## Production Integrations

- Owner/admin email: `hellonolen@gmail.com`.
- Additional admin email: `kamarokyle5@gmail.com`.
- Transactional email: Postmark.
- Payments/subscriptions: Whop.
- Localhost must allow owner/admin access without blocking development.
- Production must enforce secure sessions, role checks, and audit logging.

## Core Modules

The production ADGA Suite tool includes:

- Leads
- CRM
- Documents
- Knowledge Hub
- Intelligence
- Admin
- Billing/subscription
- Account/workspace/user settings

## Agentic Backend

The platform uses an event-based backend, but not every UI action creates an event.

Agents run through the Cloudflare Worker AI binding. The first production path is Cloudflare-native; Gemini, Claude, OpenAI, or other external AI APIs are not the primary agent runtime.

Events are emitted for meaningful business actions:

- lead created
- lead status changed
- lead scored
- contact created
- deal stage changed
- task completed
- proposal sent
- invoice paid
- contract signed
- knowledge page published
- company intelligence generated
- subscription changed
- user invited
- agent job completed
- agent recommendation accepted or rejected

Small UI actions do not emit events:

- opening drawers
- switching tabs
- typing in search
- changing filters
- draft keystrokes

## Build Strategy

1. Keep this project isolated as the ADGA Suite source of truth.
2. Create the Cloudflare data model from current Suite screens and production requirements.
3. Recreate backend behavior directly on Cloudflare.
4. Preserve or recreate the current premium light ADGA Suite UI.
5. Connect modules to D1/R2 APIs.
6. Add agent jobs and event processing after product records are stable.
7. Deploy through the OpenNext Cloudflare pipeline.
8. Verify production workflows and public domain access.
9. Keep `adga.ai` on this Cloudflare Worker/custom-domain path.

## Production Deploy Contract

The deploy is not just a successful Worker upload. A valid production deploy must:

- build the Next app
- build the OpenNext Cloudflare bundle
- deploy `.open-next/worker.js`
- bind `.open-next/assets` through Cloudflare Assets
- keep `adga.ai` and `www.adga.ai` routed to the `adga-suite` Worker
- verify DNS through Cloudflare and Google public resolvers
- verify `https://adga.ai/`
- verify `https://adga.ai/suite`
- verify `https://adga.ai/api/health`
- verify the production Next CSS/JS asset URLs

The verification script is `scripts/verify-production.mjs`.
The Cloudflare domain setup script is `scripts/cloudflare-production-setup.mjs`.

Do not use Convex, legacy ADGA backend references, forced local DNS, cache-busted URLs, or R2 static-asset patches as production deployment proof.

## Production Gate

The build is not ready until:

- signup works
- login works
- subscription state works
- user/workspace roles work
- Leads works
- CRM works
- Documents works
- Knowledge Hub works
- Intelligence works
- Admin works
- D1 migrations are repeatable
- R2 upload/download works
- agent jobs are logged
- audit log exists for sensitive changes
- Cloudflare deploy succeeds through GitHub Actions
- public production verification passes for `adga.ai`
