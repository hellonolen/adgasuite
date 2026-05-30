---
name: import-notion
owner: operations
description: Pull rows from a Notion database into ADGA as contacts, leads, deals, or organizations. Satisfies the source-agnostic ImportBatch contract.
inputs:
  - target_type: "contacts" | "leads" | "deals" | "organizations"
  - credential_id: string
  - object_id: string
  - field_mapping: Record<source_property, target_field>
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

# Notion Import — Source Adapter

## Why this exists

Notion is the most common "I built a half-CRM in a doc tool" source. The buyer's pipeline is in a
Notion database, they're tired of it, and a one-click import that respects their column structure
flips them in minutes.

## Source contract

Notion integration token stored in `integrations.notion` keyed by `credential_id`. Skill resolves
at call-time. `object_id` is the Notion database id (required — Notion has no concept of "all
databases" via API).

## Field discovery

Notion property types vary per database. Preview API calls
`POST https://api.notion.com/v1/databases/:object_id/query` with `page_size=1` to discover
property names + types, then exposes them in the field_mapping UI.

## Property type → target type coercion

| Notion property | Target field type |
|---|---|
| `title` | string (required for record name) |
| `rich_text` | string |
| `email` | string (validates as email) |
| `phone_number` | string |
| `number` | number (cents conversion when mapped to value_cents) |
| `select` | string (single value) |
| `multi_select` | string[] (joined by `;`) |
| `date` | ISO 8601 |
| `relation` | resolved to organization_id if target is contact/deal |
| `formula` | coerced by result type |

## Decision rules

- **Database not shared with integration** → `import.failed` with guidance to add integration to
  the database in Notion's connection panel.
- **Rate limit** → Notion allows 3 req/s. Handler enforces token bucket, never bursts past limit.

## v1 scope

Not in MVP. Contract declared; handler ships when Notion OAuth lands.
