# ADGA Suite Production Runbook

## Local URLs

- Marketing: `http://localhost:3010/`
- Suite: `http://localhost:3010/suite`
- Health: `http://localhost:3010/api/health`

## Cloudflare Resources

Create these once in the Cloudflare account:

```sh
wrangler d1 create adga-suite
wrangler r2 bucket create adga-assets
wrangler r2 bucket create adga-suite-documents
wrangler r2 bucket create adga-suite-uploads
```

Paste the D1 database id into `wrangler.toml`, then apply:

```sh
wrangler d1 migrations apply adga-suite --remote
```

## Secrets

```sh
wrangler secret put POSTMARK_SERVER_TOKEN
wrangler secret put POSTMARK_FROM_EMAIL
wrangler secret put WHOP_API_KEY
wrangler secret put WHOP_WEBHOOK_SECRET
wrangler secret put WHOP_COMPANY_ID
wrangler secret put SESSION_SECRET
```

## GitHub Deployment

The `main` branch runs `.github/workflows/cloudflare.yml`.

Required GitHub repository secrets for automatic Cloudflare deploys:

```sh
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

The workflow typechecks and builds every pull request. Pushes to `main` must complete the full production pipeline:

1. Typecheck.
2. Next build.
3. OpenNext Cloudflare build.
4. Deploy `.open-next/worker.js` through Wrangler.
5. Upload/bind `.open-next/assets` through Cloudflare Assets.
6. Confirm the Cloudflare zone/domain configuration for `adga.ai` and `www.adga.ai`.
7. Verify public production access for DNS, `/`, `/suite`, `/api/health`, and Next static CSS/JS assets.

The production deploy command used by CI is:

```sh
npx wrangler deploy worker.js --cwd .open-next --config ../wrangler.ci.toml --x-autoconfig=false --keep-vars
```

Do not replace this with a generic `wrangler deploy` unless the config and working directory produce the same OpenNext Worker and Cloudflare Assets binding.

## Production Checks

```sh
npm run typecheck
npm run build
npm run build:cf:ci
npm run cloudflare:production
npm run verify:production
```

The Suite agent panel posts to `/api/agent/jobs`. Meaningful route/workflow activity posts to `/api/agent/events` and `/api/workflows`. D1 is the production metadata store. R2 is the production document/upload store.

## D1/R2 Boundary

D1 is not the file store. Use D1 for metadata and pointers:

- product records
- event/audit records
- workflow state
- agent job state
- calendar state
- storage object metadata
- R2 keys

Use R2 for:

- uploaded documents
- generated PDFs/exports
- recordings
- transcripts when they become large
- images and media
- agent-produced artifacts that are too large for metadata rows

## Frontend Asset Rule

Next/OpenNext frontend assets are not product uploads.

- Serve `/_next/static/...` from Cloudflare Assets via the `ASSETS` binding.
- Keep product uploads, documents, exports, and generated artifacts in R2.
- Do not patch the Worker to serve Next static files from R2 as a production workaround.
- Do not rely on cache-busted URLs or forced DNS resolution to prove production works.

## Domain Incident Note

On 2026-05-20, `adga.ai` appeared to work in one browser while failing on other devices with DNS errors. The root issue was that the deploy pipeline did not fully own and verify production domain/static-asset delivery.

The fix was to make CI enforce the production path:

- deploy OpenNext Worker
- bind Cloudflare Assets
- confirm Worker-managed DNS/custom-domain state
- verify public DNS through Cloudflare and Google
- verify `https://adga.ai/`
- verify `https://adga.ai/suite`
- verify `https://adga.ai/api/health`
- verify production CSS/JS asset URLs

If a future deploy is green but the public URL fails, treat that as a pipeline failure and add the missing check to `scripts/verify-production.mjs`.
