// Intelligence handler: skills/list-segment.skill.md
//
// Saved filtered segments over contacts / leads / deals. Lists are persisted
// as (target_type, filter-tree, sort, visibility) records; queries resolve
// against the target table at runtime — no materialized view, no cache to
// invalidate. Same contract powers human Lists in the sidebar and agent-side
// cohort tracking (Intelligence agent re-queries on an interval).
//
// State contract:  cloudflare/state/list.schema.json
// Materialized in: cloudflare/db/migrations/0027_lists.sql

import { publish } from "@/lib/events/bus";
import { newId, nowIso } from "@/lib/server/id";
import type { SkillContext } from "@/lib/agents/skill-registry";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ListTargetType = "contacts" | "leads" | "deals" | "organizations";
export type ListVisibility = "private" | "team" | "workspace";
export type ListFilterOp =
  | "eq" | "neq" | "gt" | "gte" | "lt" | "lte"
  | "contains" | "starts_with"
  | "in" | "between"
  | "is_null" | "is_not_null";

export interface ListFilter {
  field: string;
  op: ListFilterOp;
  value: unknown;
}

export interface ListSort {
  field: string;
  direction: "asc" | "desc";
}

export interface ListRecord {
  id: string | null;
  name: string;
  description?: string | null;
  target_type: ListTargetType;
  filters: ListFilter[];
  sort?: ListSort[] | null;
  visibility: ListVisibility;
  pinned?: boolean;
}

export interface ListSegmentInput {
  operation: "create" | "update" | "delete" | "query" | "list_all";
  list?: ListRecord;
}

export interface ListSegmentOutput {
  list_id: string;
  matched_count: number | null;
  rows: Array<Record<string, unknown>> | null;
  list?: Record<string, unknown> | null;
  lists?: Array<Record<string, unknown>> | null;
}

class HandlerError extends Error {
  constructor(public readonly reason: string, message?: string) {
    super(message || reason);
    this.name = "ListSegmentError";
  }
}

// ─── Field whitelists — SQL injection guard ─────────────────────────────────
//
// SECURITY: field names land directly in SQL (parameterized values cannot
// parameterize column names). Every filter/sort field MUST be validated
// against this whitelist before string interpolation.

const TARGET_COLUMNS: Record<ListTargetType, Set<string>> = {
  contacts: new Set([
    "id", "organization_id", "first_name", "last_name", "email",
    "phone", "company", "title", "status", "created_at", "updated_at",
  ]),
  leads: new Set([
    "id", "organization_id", "full_name", "email", "company", "job_title",
    "source", "status", "score", "owner_user_id", "next_action", "notes",
    "created_at", "updated_at",
  ]),
  deals: new Set([
    "id", "organization_id", "contact_id", "name", "company", "value_cents",
    "stage", "probability", "expected_close_at", "created_at", "updated_at",
  ]),
  organizations: new Set([
    // organizations v1 unsupported — kept here for completeness.
  ]),
};

const RESULT_LIMIT = 100;

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function listSegmentHandler(
  context: SkillContext,
  input: ListSegmentInput,
): Promise<ListSegmentOutput> {
  if (!context.env.DB) throw new HandlerError("d1_unavailable", "list-segment requires D1.");
  await ensureListsTable(context.env);

  switch (input.operation) {
    case "create":   return createList(context, requireList(input));
    case "update":   return updateList(context, requireList(input));
    case "delete":   return deleteList(context, requireList(input));
    case "list_all": return listAllLists(context);
    case "query":    return queryList(context, requireList(input));
    default:
      throw new HandlerError("invalid_operation", `Unknown operation: ${String(input.operation)}`);
  }
}

function requireList(input: ListSegmentInput): ListRecord {
  if (!input.list) throw new HandlerError("missing_required_field", "input.list is required for this operation.");
  return input.list;
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

async function createList(context: SkillContext, list: ListRecord): Promise<ListSegmentOutput> {
  validateListShape(list);
  validateFiltersAgainstTarget(list.target_type, list.filters);
  if (list.sort) validateSortAgainstTarget(list.target_type, list.sort);

  const id = list.id || newId("list");
  const now = nowIso();
  await context.env.DB!
    .prepare(
      `INSERT INTO lists (
         id, organization_id, name, description, target_type,
         filters_json, sort_json, visibility, pinned,
         cohort_tracking_json, created_by, created_at, updated_at
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .bind(
      id,
      context.organization_id,
      list.name,
      list.description ?? null,
      list.target_type,
      JSON.stringify(list.filters || []),
      list.sort ? JSON.stringify(list.sort) : null,
      list.visibility,
      list.pinned ? 1 : 0,
      null,
      context.actor_id || "unknown",
      now,
      null,
    )
    .run();

  await publish(context.env.DB, {
    organization_id: context.organization_id,
    event_type: "list.created",
    actor_type: context.actor_type,
    actor_id: context.actor_id,
    resource_type: "list",
    resource_id: id,
    payload: { list_id: id, name: list.name, target_type: list.target_type },
  }).catch(() => null);

  const saved = await loadListById(context, id);
  return { list_id: id, matched_count: null, rows: null, list: saved };
}

async function updateList(context: SkillContext, list: ListRecord): Promise<ListSegmentOutput> {
  if (!list.id) throw new HandlerError("missing_required_field", "list.id is required for update.");
  validateListShape(list);
  validateFiltersAgainstTarget(list.target_type, list.filters);
  if (list.sort) validateSortAgainstTarget(list.target_type, list.sort);

  const existing = await loadListById(context, list.id);
  if (!existing) throw new HandlerError("not_found", `List ${list.id} not found in this organization.`);

  const now = nowIso();
  await context.env.DB!
    .prepare(
      `UPDATE lists
          SET name = ?, description = ?, target_type = ?,
              filters_json = ?, sort_json = ?, visibility = ?, pinned = ?,
              updated_at = ?
        WHERE id = ? AND organization_id = ?`,
    )
    .bind(
      list.name,
      list.description ?? null,
      list.target_type,
      JSON.stringify(list.filters || []),
      list.sort ? JSON.stringify(list.sort) : null,
      list.visibility,
      list.pinned ? 1 : 0,
      now,
      list.id,
      context.organization_id,
    )
    .run();

  await publish(context.env.DB, {
    organization_id: context.organization_id,
    event_type: "list.updated",
    actor_type: context.actor_type,
    actor_id: context.actor_id,
    resource_type: "list",
    resource_id: list.id,
    payload: { list_id: list.id },
  }).catch(() => null);

  const saved = await loadListById(context, list.id);
  return { list_id: list.id, matched_count: null, rows: null, list: saved };
}

async function deleteList(context: SkillContext, list: ListRecord): Promise<ListSegmentOutput> {
  if (!list.id) throw new HandlerError("missing_required_field", "list.id is required for delete.");

  const existing = await loadListById(context, list.id);
  if (!existing) throw new HandlerError("not_found", `List ${list.id} not found in this organization.`);

  await context.env.DB!
    .prepare(`DELETE FROM lists WHERE id = ? AND organization_id = ?`)
    .bind(list.id, context.organization_id)
    .run();

  await publish(context.env.DB, {
    organization_id: context.organization_id,
    event_type: "list.deleted",
    actor_type: context.actor_type,
    actor_id: context.actor_id,
    resource_type: "list",
    resource_id: list.id,
    payload: { list_id: list.id },
  }).catch(() => null);

  return { list_id: list.id, matched_count: null, rows: null, list: null };
}

async function listAllLists(context: SkillContext): Promise<ListSegmentOutput> {
  const result = await context.env.DB!
    .prepare(
      `SELECT id, organization_id, name, description, target_type,
              filters_json, sort_json, visibility, pinned,
              cohort_tracking_json, created_by, created_at, updated_at
         FROM lists
        WHERE organization_id = ?
        ORDER BY pinned DESC, target_type ASC, name ASC`,
    )
    .bind(context.organization_id)
    .all<ListRow>()
    .catch(() => ({ results: [] as ListRow[] }));

  const lists = (result.results || []).map(rowToList);
  return { list_id: "", matched_count: null, rows: null, lists };
}

// ─── Query ───────────────────────────────────────────────────────────────────

async function queryList(context: SkillContext, list: ListRecord): Promise<ListSegmentOutput> {
  // Resolve persisted list if id supplied; otherwise treat list as ad-hoc query.
  let resolved: ListRecord = list;
  let resolvedId = list.id || "";
  if (list.id) {
    const persisted = await loadListById(context, list.id);
    if (!persisted) throw new HandlerError("not_found", `List ${list.id} not found in this organization.`);
    resolved = {
      id: list.id,
      name: String(persisted.name),
      description: persisted.description as string | null,
      target_type: persisted.target_type as ListTargetType,
      filters: persisted.filters as ListFilter[],
      sort: persisted.sort as ListSort[] | null,
      visibility: persisted.visibility as ListVisibility,
      pinned: Boolean(persisted.pinned),
    };
    resolvedId = list.id;
  }

  if (resolved.target_type === "organizations") {
    throw new HandlerError(
      "target_not_supported",
      "organizations target type is not supported in list-segment v1.",
    );
  }

  validateFiltersAgainstTarget(resolved.target_type, resolved.filters);
  if (resolved.sort) validateSortAgainstTarget(resolved.target_type, resolved.sort);

  const { sql, bindings } = buildQuery(
    context.organization_id,
    resolved.target_type,
    resolved.filters || [],
    resolved.sort || null,
  );

  const startedTs = Date.now();
  const result = await context.env.DB!
    .prepare(sql)
    .bind(...bindings)
    .all<Record<string, unknown>>()
    .catch((err: unknown) => {
      throw new HandlerError("query_failed", err instanceof Error ? err.message : String(err));
    });
  const durationMs = Date.now() - startedTs;
  const rows = result.results || [];

  await publish(context.env.DB, {
    organization_id: context.organization_id,
    event_type: "list.queried",
    actor_type: context.actor_type,
    actor_id: context.actor_id,
    resource_type: "list",
    resource_id: resolvedId || null,
    payload: { list_id: resolvedId, matched_count: rows.length, duration_ms: durationMs },
  }).catch(() => null);

  return {
    list_id: resolvedId,
    matched_count: rows.length,
    rows,
  };
}

// ─── SQL builder — parameterized, whitelisted ────────────────────────────────

interface BuiltQuery {
  sql: string;
  bindings: Array<string | number | null>;
}

function buildQuery(
  organizationId: string,
  targetType: ListTargetType,
  filters: ListFilter[],
  sort: ListSort[] | null,
): BuiltQuery {
  const table = quoteIdent(targetType);
  const where: string[] = [`organization_id = ?`];
  const bindings: Array<string | number | null> = [organizationId];

  for (const filter of filters) {
    const column = quoteIdent(filter.field);
    switch (filter.op) {
      case "eq":
        where.push(`${column} = ?`); bindings.push(toScalar(filter.value)); break;
      case "neq":
        where.push(`${column} != ?`); bindings.push(toScalar(filter.value)); break;
      case "gt":
        where.push(`${column} > ?`); bindings.push(toScalar(filter.value)); break;
      case "gte":
        where.push(`${column} >= ?`); bindings.push(toScalar(filter.value)); break;
      case "lt":
        where.push(`${column} < ?`); bindings.push(toScalar(filter.value)); break;
      case "lte":
        where.push(`${column} <= ?`); bindings.push(toScalar(filter.value)); break;
      case "contains":
        where.push(`${column} LIKE ?`); bindings.push(`%${escapeLike(String(filter.value ?? ""))}%`); break;
      case "starts_with":
        where.push(`${column} LIKE ?`); bindings.push(`${escapeLike(String(filter.value ?? ""))}%`); break;
      case "in": {
        const arr = Array.isArray(filter.value) ? filter.value : [filter.value];
        if (arr.length === 0) {
          // Empty IN list → no row can match.
          where.push(`1 = 0`);
        } else {
          const placeholders = arr.map(() => "?").join(", ");
          where.push(`${column} IN (${placeholders})`);
          for (const v of arr) bindings.push(toScalar(v));
        }
        break;
      }
      case "between": {
        const arr = Array.isArray(filter.value) ? filter.value : [];
        if (arr.length !== 2) {
          throw new HandlerError(
            "filter_value_invalid",
            `between operator requires a [low, high] array (got ${JSON.stringify(filter.value)}).`,
          );
        }
        where.push(`${column} BETWEEN ? AND ?`);
        bindings.push(toScalar(arr[0]), toScalar(arr[1]));
        break;
      }
      case "is_null":
        where.push(`${column} IS NULL`); break;
      case "is_not_null":
        where.push(`${column} IS NOT NULL`); break;
      default:
        throw new HandlerError(
          "filter_op_unknown",
          `Unsupported filter op: ${String((filter as ListFilter).op)}`,
        );
    }
  }

  let orderClause = "";
  if (sort && sort.length > 0) {
    const parts = sort.map((s) => {
      const col = quoteIdent(s.field);
      const dir = s.direction === "desc" ? "DESC" : "ASC";
      return `${col} ${dir}`;
    });
    orderClause = ` ORDER BY ${parts.join(", ")}`;
  } else {
    // Stable default ordering — newest first.
    orderClause = ` ORDER BY created_at DESC`;
  }

  const sql = `SELECT * FROM ${table} WHERE ${where.join(" AND ")}${orderClause} LIMIT ${RESULT_LIMIT}`;
  return { sql, bindings };
}

function toScalar(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  return String(value);
}

function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function quoteIdent(name: string): string {
  // Defensive: callers must have validated against the whitelist before this point,
  // but reject anything outside [a-zA-Z0-9_] as a second line of defense.
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new HandlerError("identifier_invalid", `Refusing to quote identifier: ${name}`);
  }
  return `"${name}"`;
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateListShape(list: ListRecord): void {
  if (!list.name || !list.name.trim()) {
    throw new HandlerError("missing_required_field", "list.name is required.");
  }
  if (list.name.length > 80) {
    throw new HandlerError("name_too_long", "list.name must be <= 80 chars.");
  }
  if (!list.target_type || !TARGET_COLUMNS[list.target_type]) {
    throw new HandlerError("target_type_unknown", `Unknown target_type: ${String(list.target_type)}`);
  }
  if (list.visibility !== "private" && list.visibility !== "team" && list.visibility !== "workspace") {
    throw new HandlerError("visibility_invalid", `Unknown visibility: ${String(list.visibility)}`);
  }
  if (!Array.isArray(list.filters)) {
    throw new HandlerError("filters_invalid", "list.filters must be an array.");
  }
}

function validateFiltersAgainstTarget(targetType: ListTargetType, filters: ListFilter[]): void {
  const columns = TARGET_COLUMNS[targetType];
  if (!columns || columns.size === 0) {
    throw new HandlerError(
      "target_not_supported",
      `target_type "${targetType}" has no column whitelist registered.`,
    );
  }
  for (const f of filters) {
    if (!f || typeof f.field !== "string" || !columns.has(f.field)) {
      throw new HandlerError(
        "filter_field_unknown",
        `Filter field "${f?.field}" is not a known column on ${targetType}.`,
      );
    }
  }
}

function validateSortAgainstTarget(targetType: ListTargetType, sort: ListSort[]): void {
  const columns = TARGET_COLUMNS[targetType];
  for (const s of sort) {
    if (!s || typeof s.field !== "string" || !columns.has(s.field)) {
      throw new HandlerError(
        "sort_field_unknown",
        `Sort field "${s?.field}" is not a known column on ${targetType}.`,
      );
    }
    if (s.direction !== "asc" && s.direction !== "desc") {
      throw new HandlerError("sort_direction_invalid", `Sort direction must be asc|desc (got ${s.direction}).`);
    }
  }
}

// ─── Persistence helpers ─────────────────────────────────────────────────────

interface ListRow {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  target_type: string;
  filters_json: string;
  sort_json: string | null;
  visibility: string;
  pinned: number;
  cohort_tracking_json: string | null;
  created_by: string;
  created_at: string;
  updated_at: string | null;
}

async function loadListById(
  context: SkillContext,
  id: string,
): Promise<Record<string, unknown> | null> {
  const row = await context.env.DB!
    .prepare(
      `SELECT id, organization_id, name, description, target_type,
              filters_json, sort_json, visibility, pinned,
              cohort_tracking_json, created_by, created_at, updated_at
         FROM lists
        WHERE id = ? AND organization_id = ?
        LIMIT 1`,
    )
    .bind(id, context.organization_id)
    .first<ListRow>()
    .catch(() => null);
  if (!row) return null;
  return rowToList(row);
}

function rowToList(row: ListRow): Record<string, unknown> {
  return {
    id: row.id,
    organization_id: row.organization_id,
    name: row.name,
    description: row.description,
    target_type: row.target_type,
    filters: safeParseJson(row.filters_json, []),
    sort: row.sort_json ? safeParseJson(row.sort_json, null) : null,
    visibility: row.visibility,
    pinned: Boolean(row.pinned),
    cohort_tracking: row.cohort_tracking_json ? safeParseJson(row.cohort_tracking_json, null) : null,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function safeParseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ─── Table defense — matches csv-import.ts pattern ───────────────────────────

export async function ensureListsTable(env: CloudflareEnv): Promise<void> {
  if (!env.DB) return;
  await env.DB
    .prepare(
      `CREATE TABLE IF NOT EXISTS lists (
         id TEXT PRIMARY KEY,
         organization_id TEXT NOT NULL,
         name TEXT NOT NULL,
         description TEXT,
         target_type TEXT NOT NULL,
         filters_json TEXT NOT NULL DEFAULT '[]',
         sort_json TEXT,
         visibility TEXT NOT NULL DEFAULT 'private',
         pinned INTEGER NOT NULL DEFAULT 0,
         cohort_tracking_json TEXT,
         created_by TEXT NOT NULL,
         created_at TEXT NOT NULL,
         updated_at TEXT
       )`,
    )
    .run();
  await env.DB
    .prepare(`CREATE INDEX IF NOT EXISTS idx_lists_org_target ON lists (organization_id, target_type)`)
    .run();
  await env.DB
    .prepare(`CREATE INDEX IF NOT EXISTS idx_lists_org_created ON lists (organization_id, created_at DESC)`)
    .run();
}
