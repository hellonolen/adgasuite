---
name: import-hubspot
owner: operations
description: Pull contacts, companies, and deals from a connected HubSpot workspace into ADGA. Satisfies the source-agnostic ImportBatch contract — same outputs, same events, same dead-letter recovery as csv-import.
inputs:
  - target_type: "contacts" | "leads" | "deals" | "organizations"
  - credential_id: string
  - object_id: string | null
  - field_mapping: Record<source_field, target_field>
  - dedupe_strategy: "email" | "external_id" | "name_plus_company" | "domain" | "name"
  - organization_id: string
  - actor: { type: "user" | "agent", id: string }
outputs:
  - batch_id: string
  - rows_total: number
  - rows_succeeded: number
  - rows_failed: number
events_emitted:
  - import.requested
  - import.row_succeeded
  - import.row_failed
  - import.completed
  - import.failed
state_contracts:
  - cloudflare/state/import-batch.schema.json
  - cloudflare/state/import-row.schema.json
---

# HubSpot Import — Source Adapter

## Why this exists

HubSpot is the most common "I have a pipeline somewhere else" answer. A buyer who hands us a
HubSpot connection in the import wizard is already qualified — they own a CRM, they pay for one,
they're shopping for a better one. Importing in place beats asking them to export a CSV.

## Source contract

The HubSpot OAuth credential lives outside this skill — granted via the integrations panel,
stored under `integrations.hubspot` keyed by `credential_id`. This skill never asks for or stores
secrets; it resolves the credential at call-time, exchanges it for an access token, and reads.

Pagination: HubSpot's CRM API returns 100 records per page. The handler streams pages, writing
rows to the ImportBatch as they arrive — never buffers the full result in memory.

## Field mapping defaults (used when field_mapping is empty)

| Target | HubSpot source field |
|---|---|
| `contact.full_name` | `firstname` + " " + `lastname` |
| `contact.email` | `email` |
| `contact.phone` | `phone` |
| `contact.title` | `jobtitle` |
| `contact.organization_id` | resolved from `associatedcompanyid` (lookup or create) |
| `deal.name` | `dealname` |
| `deal.value_cents` | `amount` * 100 |
| `deal.stage` | mapped via `stage_mapping` config (HubSpot stage id → ADGA stage) |
| `organization.name` | `name` |
| `organization.domain` | `domain` |

## Decision rules

- **Credential missing or revoked** → emit `import.failed` with `error: "credential_revoked"`,
  guide UI to re-auth.
- **HubSpot rate-limit hit** → exponential backoff inside the handler, do not abort the batch.
- **Per-record fetch failure** (single record returns 4xx) → row to dead-letter with
  `failure_reason: "unknown"` and `failure_detail` = HubSpot error code. Batch continues.

## Recovery

Same path as csv-import — failed rows land in `import_batch_rows` with `raw_data` = the HubSpot
record JSON. Retry re-fetches by `target_record_id` and re-applies the mapping.

## v1 scope

Not in MVP. Contract is declared so the moment OAuth wiring lands the handler can be written
without renegotiating shape. Until then, calling this skill returns `error: "source_not_implemented"`.
