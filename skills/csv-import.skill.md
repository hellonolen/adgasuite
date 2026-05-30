---
name: csv-import
owner: operations
description: Ingest external records (contacts, leads, deals, organizations) into the workspace from CSV, clipboard paste, or third-party CRM exports. Source-agnostic, field-mapped, idempotent, recoverable.
inputs:
  - source_type: "csv" | "paste" | "hubspot" | "pipedrive" | "salesforce" | "notion" | "airtable"
  - target_type: "contacts" | "leads" | "deals" | "organizations"
  - payload:
      csv: { file_url: string, has_header: boolean }
      paste: { rows: string[][], has_header: boolean }
      hubspot|pipedrive|salesforce|notion|airtable: { credential_id: string, object_id?: string }
  - field_mapping: Record<source_column, target_field>
  - dedupe_strategy: "email" | "external_id" | "name_plus_company" | "none"
  - organization_id: string
  - actor: { type: "user" | "agent", id: string }
outputs:
  - batch_id: string
  - rows_total: number
  - rows_succeeded: number
  - rows_failed: number
  - failure_summary: Record<reason, count>
events_emitted:
  - import.requested
  - import.row_succeeded
  - import.row_failed
  - import.completed
  - import.failed
state_contracts:
  - cloudflare/state/import-batch.schema.json
---

# CSV Import — Source-Agnostic Record Ingest

## Why this skill exists

First-paying-customer friction is "I already have a pipeline somewhere else." The import wedge
removes that. A buyer pastes a CSV, maps four columns, hits run, and their workspace is populated
before they finish the first sentence of the onboarding email.

This skill is the deterministic ingest engine. It is source-agnostic by contract — CSV today,
HubSpot / Pipedrive / Salesforce / Notion / Airtable as separate adapters that satisfy the same
input shape. MVP implements `csv` and `paste`; other source types throw `not_implemented` until
their adapters land. The shape doesn't change.

## Behavior

1. **Validate source.** Reject batches over the configured size cap (default 5 MB / 50K rows).
   MIME-type whitelist on uploads. CSV cells are read as text — no formula evaluation, ever.

2. **Parse + dedupe.** Stream the source, normalize headers (trim, lowercase, strip BOM), apply
   `field_mapping`. For each row, build a target record draft.

3. **Resolve dedupe key per target_type:**
   - `contacts`: lowercased email (preferred), else `name + organization_id`
   - `leads`: lowercased email, else `phone`, else `name + source`
   - `deals`: `name + organization_id` (deals don't have a natural unique key)
   - `organizations`: `domain` (preferred), else `name`

4. **Per-row insert with constraint catch.** Each row insert is wrapped — failures push to the
   batch dead-letter (`import_batch_rows` with `failure_reason`), the batch keeps going. Never
   abort the batch on a row failure.

5. **Persist batch summary + emit `import.completed`** with row counts. Daily-brief picks this up
   and shows "Imported 247 contacts" on /suite/home for the actor's next session.

## Decision rules

- **Source unknown / adapter not registered** → return `error: "source_not_implemented"`, do not
  write anything, do not emit `import.requested`.
- **field_mapping missing required fields for target_type** (e.g. contacts without an email or
  name column mapped) → return `error: "mapping_incomplete"` with the missing fields listed.
  Surface in the preview API so the UI can guide before the user commits.
- **Duplicate found** under chosen dedupe_strategy → update non-conflicting fields on the existing
  record, count row as `succeeded`, append `dedupe.matched=existing_id` on the row record. Never
  silently overwrite a non-empty field with a blank value.
- **Per-row validation failure** (bad email format, value > column length cap, FK miss, etc.) →
  row goes to dead-letter with `failure_reason`. Batch continues.
- **Batch-level failure** (DB unavailable, R2 read fails on file_url) → emit `import.failed`,
  mark batch `status: failed`, leave already-inserted rows in place (we don't roll back partial
  success — the operator can dedupe on re-run).

## Recovery

- Failed rows persisted in `import_batch_rows` with `status: "failed"` and `failure_reason`.
- `POST /api/import/batches/[id]/retry` re-runs the failed-rows subset. Idempotent: if a row's
  dedupe key now matches an existing record, it counts as `succeeded` without insert.
- Operator can download the failed-rows CSV, fix in spreadsheet, upload as a new batch.

## Telemetry

| Signal | Where |
|---|---|
| `import.requested` | events table, before any DB write |
| `import.row_succeeded` | per-row event (sampled / batched in MVP to avoid event flood) |
| `import.row_failed` | per-row event, includes `failure_reason` |
| `import.completed` | once batch finalizes, includes row counts + duration |
| `import.failed` | only on batch-level failure |
| Daily brief composition | reads `import.completed` events from last 24 h |

## Out of scope for v1

- HubSpot / Pipedrive / Salesforce / Notion / Airtable live adapters (shape is ready, code lands later)
- Scheduled / recurring imports
- Two-way sync
- Inline AI cleanup of imported rows (separate skill: `import-enrichment`)

## How an agent calls this

```ts
await callSkill(ctx, "csv-import", {
  source_type: "csv",
  target_type: "contacts",
  payload: { csv: { file_url: "/r2/imports/abc.csv", has_header: true } },
  field_mapping: { name: "full_name", email: "email", company: "organization_name" },
  dedupe_strategy: "email",
  organization_id: ctx.organization_id,
  actor: { type: "user", id: "user_123" },
});
```

## How an external orchestrator (MCP) calls this

```
POST /api/mcp
{ "tool": "skill.csv-import", "arguments": { ...same shape as above... } }
```

Admin-gated. Returns `batch_id` immediately; subscribe to `import.completed` to know when done.
