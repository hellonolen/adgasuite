---
name: custom-object
owner: operations
description: User-defined record types beyond the built-in contacts/leads/deals/organizations. A real-estate workspace might add "Property" or "Listing"; a capital-raise workspace might add "Investor" or "Fund." Each custom object gets its own field schema and integrates with existing surfaces (lists, timelines, MCP).
inputs:
  - operation: "create" | "update" | "delete" | "list" | "get"
  - object:
      id: string | null
      slug: string
      name_singular: string
      name_plural: string
      fields: Array<{ key: string, label: string, type: FieldType, required: boolean, options: object | null }>
      visibility: "private" | "team" | "workspace"
  - organization_id: string
  - actor: { type: "user" | "agent", id: string }
outputs:
  - object_id: string
  - object: CustomObject | null
  - records_count: number | null
events_emitted:
  - custom_object.created
  - custom_object.updated
  - custom_object.deleted
state_contracts:
  - cloudflare/state/custom-object.schema.json
---

# Custom Object — Workspace-Defined Record Types

## Why this exists

ADGA ships with contacts/leads/deals/organizations. Every vertical needs one more. Real estate
needs Properties. Capital raise needs Investors and Funds. M&A needs Targets and Bidders.
Without custom objects, the workspace bends the existing types (deal-as-property hack) and the
data model degrades.

This is the contract that lets a workspace declare a new record type without code. The handler
materializes a D1 table per custom object on creation, registers it with the WORKSPACE contract,
and exposes it to MCP automatically.

## Behavior

1. **create**: validate slug uniqueness, generate D1 table `custom_obj_<slug>`, register the
   object in `custom_objects` metadata table, emit `custom_object.created`.
2. **update**: alter fields. Adding a field is non-destructive; removing requires explicit
   `confirm: "drop_data"` in payload.
3. **delete**: archive (never drop the table). Set `archived_at`, hide from sidebar, keep data
   queryable via `?include_archived=true`.
4. **list / get**: read-only metadata fetches.

## Field types supported

`text`, `long_text`, `number`, `currency`, `boolean`, `select` (with options), `multi_select`,
`date`, `datetime`, `email`, `phone`, `url`, `reference` (FK to another record type), `formula`
(computed at read time).

## Decision rules

- **Slug collides with built-in** (`contacts`, `leads`, `deals`, `organizations`) → reject.
- **Reference field points to an archived object** → allowed (existing data preserved); UI grays
  the option in pickers.
- **Formula references unknown field** → reject at create; validate at update.

## Recovery

Custom objects are archive-only, never deleted. Field removal requires explicit consent and the
existing column data moves to `_archived_<column>` for one retention window.

## v1 scope

Contract declared. Handler ships once we have a real-estate or capital-raise buyer who needs it —
this is a contract waiting for a customer, not a feature waiting for users.
