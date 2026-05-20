# ADGA Suite Cloudflare Structure

This folder defines the Cloudflare-native ADGA Suite backend and agent structure.

It is intentionally separate from the legacy ADGA code. The goal is a clean production platform on Cloudflare, not a table migration.

## Target Runtime

- Next.js/OpenNext on Cloudflare
- D1 for relational product state
- R2 for files and generated assets
- Cloudflare Assets for Next/OpenNext static frontend files
- Worker/API routes for product actions
- Scheduled Workers for agent jobs and maintenance
- Cloudflare Worker AI binding for agent inference

## Folder Map

```txt
cloudflare/
  db/
    schema.sql
    migrations/
  r2/
    buckets.md
  agents/
    README.md
  state/
    agent-event.schema.json
    agent-job.schema.json
    workflow-state.schema.json
```

## Rule

Use the existing ADGA frontend as the product and design reference. Build the Cloudflare backend from what ADGA Suite needs now.

AI work runs through the Cloudflare Worker runtime. Kimi 2.6 is the intended primary model; do not wire Gemini, Claude, or OpenAI as the default agent engine.

## Production Deploy Rule

The production domain is `adga.ai`.

The production Worker is `adga-suite`.

The deploy path is OpenNext on Cloudflare Workers:

- Worker bundle: `.open-next/worker.js`
- frontend static assets: `.open-next/assets` via Cloudflare Assets
- product uploads/documents/artifacts: R2
- metadata/state/audit: D1

Do not use R2 as the production delivery path for `/_next/static/...`. R2 is for product storage, not the app shell.
