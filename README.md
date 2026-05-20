# ADGA Suite

Cloudflare-native production build for ADGA Suite on `adga.ai`.

This project is intentionally isolated from the legacy ADGA repo. It is a clean Cloudflare-native source of truth.

## Product

ADGA Suite is subscription software for:

- Leads
- CRM
- Documents
- Knowledge Hub
- Intelligence
- Admin
- Agent-driven business workflows

## Runtime

- Next.js
- OpenNext for Cloudflare
- Cloudflare Workers
- Cloudflare D1
- Cloudflare R2
- Cloudflare Worker AI with Kimi 2.6
- Postmark for transactional email
- Whop for payments/subscriptions

## Current Backend Contract

- `/api/suite/state` returns app state, recent agent jobs, and recent business events.
- `/api/agent/jobs` creates and runs Cloudflare Worker AI agent jobs with local deterministic fallback.
- `/api/agent/events` records meaningful business events.
- `/api/workflows` starts orchestrated agent workflows.
- `/api/documents/upload` stores uploaded files in R2.
- `/api/storage/objects` lists D1 metadata pointers for R2 objects.
- `/api/email/send` sends Postmark email when secrets are configured.
- `/api/billing/checkout` creates a Whop checkout configuration when Whop secrets are configured.
- `/api/webhooks/whop` records Whop subscription/payment events after signature verification.

## Storage Rule

Do not store file bodies, generated exports, recordings, transcripts, images, or large agent artifacts in D1.

- D1 stores metadata, indexes, workflow state, audit records, and R2 keys.
- R2 stores product file bytes and large artifacts.
- Cloudflare Assets serves the Next/OpenNext frontend static files from `.open-next/assets`.
- Every R2 object used by the product should have a `storage_objects` metadata row in D1.

## Owner Access

Owner/admin email: `hellonolen@gmail.com`.

Additional admin email: `kamarokyle5@gmail.com`.

Localhost must not block owner access. Production auth must still use real sessions, roles, and audit logs.

## Design Rule

Premium light SaaS UI. Preserve the ADGA presence: clean, professional, dense, calm, and workspace-tool focused.

No dark dashboard redesign. No generic AI-product styling. No bulky placeholder UI.

## Build Rule

Build from the ADGA Suite product requirements and existing frontend look/feel. Do not reuse legacy backend wiring.

## Deployment

Production deploys are owned by GitHub Actions in `.github/workflows/cloudflare.yml`.

Pushes to `main` run:

1. Typecheck and Next build.
2. OpenNext Cloudflare build.
3. Cloudflare Worker deploy with Cloudflare Assets bound to `.open-next/assets`.
4. Cloudflare production domain verification/setup for `adga.ai` and `www.adga.ai`.
5. Public production verification for DNS, `/`, `/suite`, `/api/health`, and Next CSS/JS assets.

Required GitHub repository secrets:

```sh
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

Local production checks:

```sh
npm run typecheck
npm run build:cf:ci
npm run verify:production
```

Manual deploys should use the same OpenNext worker/assets path as CI:

```sh
npm run build:cf:ci
npx wrangler deploy worker.js --cwd .open-next --config ../wrangler.ci.toml --x-autoconfig=false --keep-vars
```

Do not ship production from a one-off cache-busted URL, forced local DNS mapping, or R2 static asset workaround.
