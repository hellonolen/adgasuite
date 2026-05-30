---
name: import-enrichment
owner: intelligence
description: Post-import AI cleanup of an ImportBatch — normalize names, derive missing fields (company from email domain, title from LinkedIn), dedupe near-matches, and score lead quality.
inputs:
  - batch_id: string
  - operations: Array<"normalize_names" | "derive_company_from_email" | "dedupe_near_matches" | "score_leads" | "summarize_imported">
  - organization_id: string
  - actor: { type: "user" | "agent", id: string }
outputs:
  - enrichment_id: string
  - operations_applied: Array<{ operation: string, rows_touched: number, rows_changed: number }>
  - duration_ms: number
events_emitted:
  - enrichment.requested
  - enrichment.completed
  - enrichment.failed
state_contracts:
  - cloudflare/state/import-batch.schema.json
  - cloudflare/state/import-row.schema.json
---

# Import Enrichment — AI Cleanup of an ImportBatch

## Why this exists

The single biggest reason buyers reject CSV imports is "the data is dirty now and it's still
dirty after import." This skill is the cleanup pass that fires after `import.completed` — runs
through the freshly inserted rows, normalizes the obvious junk (caps-lock names, missing company
from email domain, duplicate near-matches), and writes the changes back.

It runs as a separate skill from `csv-import` because:
1. Enrichment is async — operator shouldn't wait for it on the import-finished modal
2. Enrichment may call LLMs; csv-import must stay deterministic
3. Operator can re-run enrichment on any batch without re-importing

## Operations

| Operation | What it does |
|---|---|
| `normalize_names` | Title-case `full_name`, strip trailing whitespace, fix obvious caps-lock |
| `derive_company_from_email` | When `organization_id` is null + `email` exists, set `organization_id` from `domain` lookup (creates org if absent) |
| `dedupe_near_matches` | Find near-duplicates by trigram similarity on `full_name + email_local`, propose merges as `agent_approval.requested` |
| `score_leads` | When target_type=leads, run lead-scoring skill on each row, write `score` field |
| `summarize_imported` | Composes a daily-brief item: "Imported 247 contacts · 12 new accounts · 3 lead scores ≥ 80" |

## Decision rules

- **Operation that needs LLM credits but bindings missing** → skip with warning, log to
  `events.payload.skipped_operations`, do not fail the batch.
- **dedupe_near_matches finds candidates** → emits `agent_approval.requested` rather than
  auto-merging. Human approval gate per the autonomy contract.

## Recovery

Re-running enrichment on an already-enriched batch is idempotent — operations are tagged with a
content hash; rows that haven't changed since the last enrichment skip.

## v1 scope

Operations `normalize_names` and `derive_company_from_email` ship with the import-wedge MVP.
`dedupe_near_matches` + `score_leads` + `summarize_imported` declared in contract, handlers land
incrementally.
