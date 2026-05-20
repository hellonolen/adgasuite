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
- R2 stores the actual bytes and large artifacts.
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
