---
name: list-segment
owner: intelligence
description: Saved filtered segment over any record type. "All deals in stage X owned by me with amount > Y" persists as a named List that updates live. Drives sidebar pinned views + agent-tracked cohorts.
inputs:
  - operation: "create" | "update" | "delete" | "query" | "list_all"
  - list:
      id: string | null
      name: string
      target_type: "contacts" | "leads" | "deals" | "organizations"
      filters: Array<{ field: string, op: "eq" | "neq" | "in" | "gt" | "gte" | "lt" | "lte" | "contains" | "starts_with" | "between", value: unknown }>
      sort: Array<{ field: string, direction: "asc" | "desc" }> | null
      visibility: "private" | "team" | "workspace"
  - organization_id: string
  - actor: { type: "user" | "agent", id: string }
outputs:
  - list_id: string
  - matched_count: number | null
  - rows: Array<Record> | null
events_emitted:
  - list.created
  - list.updated
  - list.deleted
  - list.queried
state_contracts:
  - cloudflare/state/list.schema.json
---

# List Segment — Saved Filtered Views Over Any Record Type

## Why this exists

Buyers expect "save this filter as a List" — it's the muscle memory from every modern CRM
(Salesforce, HubSpot, Pipedrive). Without it every prospect has to rebuild their filter every
visit, which kills perceived intelligence of the workspace.

Lists are also the substrate the Intelligence agent uses to track changing cohorts (e.g. "deals
that went stale in the last 7 days"). One contract serves both human and agent consumers.

## Behavior

Lists are stored as a (target_type, filter-tree, sort, visibility) record. The handler resolves
the filter tree against the target table at query time — no materialized view, no cache invalidation
to manage. Rows are always live.

## Decision rules

- **Filter references unknown column** → return `error: "filter_field_unknown"` with field name.
- **Visibility=workspace** on a non-admin actor → return `error: "permission_denied"`.
- **Sort references unindexed column** → still serves, but emits `list.queried.slow` so the
  Platform agent can surface index recommendations.

## Recovery

Lists are persistent records. Bad filters return empty rows but never destroy the list.

## v1 scope

CRUD + query. Cron-watched cohorts (Intelligence agent re-queries a list every N minutes and
emits `cohort.changed`) declared in this contract but ships in a later iteration.
