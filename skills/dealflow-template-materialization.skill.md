---
id: dealflow-template-materialization
owner: conductor
status: active
emits:
  - dealflow.created
  - dealflow.node_added
consumes:
  - workspace.activated
  - operator.requested_new_deal
contracts:
  - cloudflare/state/dealflow-map.schema.json
  - cloudflare/state/deal-template.schema.json
---

# dealflow-template-materialization

## Purpose
Turn a deal **intent** ("I want to start a deal") into a populated
canvas the operator can immediately work — never a blank page.

## Triggered by
- `workspace.activated` → seed one starter dealflow so the operator's
  first login lands on a populated canvas
- `operator.requested_new_deal` (from `/api/dealflows` POST or
  `+ New deal` in the UI) → materialize the template the operator
  selected (or "starter" by default)

## Required inputs
- `organization_id`
- `template_id` — `"starter"` | `"acquisition"` | `"capital-raise"` |
  `"partnership"` | `"licensing"` (matches `templates/<template_id>` in
  `lib/templates.ts`)
- `name` — display label for the dealflow
- `actor_email` — for audit trail

## What the skill does (atomic, idempotent per map_id)

1. **Resolve the template** — read the template definition from
   `lib/templates.ts`. Each template declares its nodes (kind, label,
   sublabel, status defaults) and edges (from → to). The `"starter"`
   template = 3 inner-ring entities (company, contact, bank) + 4
   outer-ring entities (document, task, meeting, group), all
   placeholder labels for the operator to fill in.
2. **Create the map row** — `INSERT INTO maps` keyed by a new
   `map_id`. `name`, `template`, `created_by_user_id`, `organization_id`.
3. **Materialize nodes** — for each template node, compute the
   position using `buildInitial()` ring algorithm
   (CENTER 480,320, inner radius 280 offset 30°, outer radius 460
   offset 0°). `INSERT INTO map_nodes`. Emit
   `dealflow.node_added` per insert so the UI's `useSuiteEvent`
   subscribers react live.
4. **Materialize edges** — for each template edge, INSERT into
   `map_edges` with `source_node_id` / `target_node_id` pointing at
   the new node ids. Inner-ring entities flow TO the deal node
   (entity → deal), outer-ring entities flow FROM the deal
   (deal → entity), matching the visual semantic.
5. **Stamp `deal-memory`** — write the initial `deal-memory` row per
   `cloudflare/state/deal-memory.schema.json` with empty
   `next_move`, `risk='neutral'`, `commitments=[]`. Sales agent will
   fill these in as activity accumulates.
6. **Emit `dealflow.created`** — payload includes
   `{ map_id, organization_id, template, node_count, edge_count }`.

## Telemetry that proves it worked
- `dealflow.created` event row in D1 with matching `resource_id`
- `dealflow.node_added` event rows (one per node, count matches the
  template's node count)
- `map_nodes` rows are reachable from `map_id`, all kinds are valid
  `DealFlowEntityKind` (no `"lawyer"` / `"deal"` strings — they map to
  `"contact"` / `"action"`)
- `/suite/dealflow/<map_id>` HTML contains every entity label

## Recovery
- If any step throws after the map row is created, the bus's replay
  surface re-runs the skill. Step 2 is INSERT (collision = abort);
  steps 3-6 are INSERT OR IGNORE (idempotent per node id).
- If the operator interrupts during materialization (rare — the loop
  runs in a single Worker invocation), the partial map is still
  reachable. They can re-trigger via "Rebuild from template" in the
  dealflow page (future feature).

## Hard rules
- Never create a map with `template="blank-deal"` for a new operator.
  Blank is a power-user "I'll start from scratch" choice, not the
  default first-run.
- Every materialized node's `id` follows `<map_id>__<suffix>`. Edge
  ids follow `<map_id>__edge_<suffix>`. Predictable so dedupe + replay
  work.
- Node `kind` must be a valid `DealFlowEntityKind` from
  `components/suite/DealFlow.tsx`. The deal node itself is created by
  the React component (id = `map_id`); the skill never inserts a
  duplicate deal node.
