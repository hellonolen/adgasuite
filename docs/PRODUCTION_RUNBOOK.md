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

The workflow typechecks and builds every pull request. Pushes to `main` deploy the Worker with `wrangler deploy`.

## Production Checks

```sh
npm run typecheck
npm run build
npm run build:cf
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
