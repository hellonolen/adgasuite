---
name: import-airtable
owner: operations
description: Pull records from an Airtable base into ADGA. Satisfies the source-agnostic ImportBatch contract.
inputs:
  - target_type: "contacts" | "leads" | "deals" | "organizations"
  - credential_id: string
  - object_id: string
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

# Airtable Import — Source Adapter

## Why this exists

Airtable buyers built a CRM-shaped base because nothing else fit. They're the most likely segment
to grade a CRM on data-model flexibility — which is exactly where ADGA's record contracts beat
opinionated legacy CRMs. Importing the base in place removes the "I'll lose the structure" fear.

## Source contract

Airtable PAT (personal access token) stored in `integrations.airtable` keyed by `credential_id`.
`object_id` = `baseId/tableId` joined by `/`. Skill parses and queries via Airtable REST API.

## Field discovery

Airtable Meta API gives field types via `GET /v0/meta/bases/:baseId/tables`. Preview surfaces
field names + types to the mapping UI.

## Field type → target coercion

| Airtable type | Target |
|---|---|
| `singleLineText`, `multilineText` | string |
| `email` | string (validates) |
| `phoneNumber` | string |
| `number`, `currency`, `percent` | number |
| `singleSelect` | string |
| `multipleSelects` | string[] joined by `;` |
| `multipleRecordLinks` | resolved to FK ids (organization_id when target is contact/deal) |
| `formula`, `rollup`, `count` | coerced by result type |
| `attachment` | URL list (not imported; flagged in dedupe_match for follow-up) |

## Decision rules

- **PAT missing required scope** (`data.records:read` / `schema.bases:read`) → `import.failed`
  with the required scope listed in `error`.
- **Per-table rate limit** (5 req/s) → token bucket inside handler.

## v1 scope

Not in MVP. Contract declared; handler ships when Airtable OAuth/PAT input lands.
