---
name: import-pipedrive
owner: operations
description: Pull persons, organizations, and deals from a connected Pipedrive workspace into ADGA. Satisfies the source-agnostic ImportBatch contract.
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

# Pipedrive Import — Source Adapter

## Why this exists

Pipedrive is the second-most-common source for high-ticket sales pipelines that outgrew the tool.
Pipedrive users are drift-prone — the product is fine for tracking, weak for executing — which
means they self-qualify into ADGA the moment they need workflow, approvals, or document flow.

## Source contract

Pipedrive API token lives in `integrations.pipedrive` keyed by `credential_id`. Skill resolves
at call-time, never stores secrets, never logs the token.

Pagination: Pipedrive's REST v1 returns `start` + `limit` paginated. Handler walks pages of 100
until `more_items_in_collection: false`.

## Field mapping defaults

| Target | Pipedrive source field |
|---|---|
| `contact.full_name` | `name` |
| `contact.email` | `email[0].value` (primary) |
| `contact.phone` | `phone[0].value` (primary) |
| `contact.organization_id` | resolved from `org_id` |
| `deal.name` | `title` |
| `deal.value_cents` | `value` * 100 (currency conversion deferred to enrichment skill) |
| `deal.stage` | mapped via `stage_mapping` config |
| `organization.name` | `name` |

## Decision rules

Same shape as `import-hubspot`. Token-revoked → `import.failed`. Per-record fault → dead-letter.

## v1 scope

Not in MVP. Contract declared; handler ships when OAuth wiring lands.
