# ADGA Suite Cloudflare Structure

This folder defines the Cloudflare-native ADGA Suite backend and agent structure.

It is intentionally separate from the legacy ADGA code. The goal is a clean production platform on Cloudflare, not a table migration.

## Target Runtime

- Next.js/OpenNext on Cloudflare
- D1 for relational product state
- R2 for files and generated assets
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
