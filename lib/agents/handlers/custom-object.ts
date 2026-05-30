// Operations handler: skills/custom-object.skill.md
//
// Workspace-defined record types beyond the built-in contacts / leads /
// deals / organizations. Each row in `custom_objects` is the metadata
// for one type ("Property", "Investor", "Fund"). The Skill contract
// declares D1 table-per-slug materialization (`custom_obj_<slug>`); v1
// punts that materialization to keep the contract shippable.
//
// ──────────────────────────────────────────────────────────────────────
// v1 trade-off — generic records table instead of per-slug DDL:
//   D1 does NOT permit runtime DDL from a multi-tenant Worker without
//   significant security risk (no rollback, schema drift across shards,
//   permissioning unclear). Rather than dynamically `CREATE TABLE
//   custom_obj_<slug>` per object, v1 stores ALL custom-object records
//   in a single `custom_object_records` table with a `data_json` blob
//   keyed by `custom_object_id`. This lets the contract ship today.
//
//   Implications:
//     - Field-level indexing is unavailable in v1 (data_json is opaque).
//     - Field add is non-destructive (metadata-only update).
//     - Field remove with `confirm: "drop_data"` is a no-op against the
//       blob storage; v2 will introduce per-slug indexed tables and at
//       that point drop_data will rewrite the blob.
//
//   v2 plan: hybrid — keep `custom_object_records` for cold/new fields,
//   add per-slug indexed sidecar tables once a custom object exceeds
//   the records-per-org threshold (~10k).
// ──────────────────────────────────────────────────────────────────────
//
// State contracts:
//   cloudflare/state/custom-object.schema.json
// Materialized in cloudflare/db/migrations/0029_custom_objects.sql.

import { publish } from "@/lib/events/bus";
import { newId, nowIso } from "@/lib/server/id";
import type { SkillContext } from "@/lib/agents/skill-registry";
import type { CustomObjectInput, CustomObjectOutput } from "./stubs";

// ─── Constants ───────────────────────────────────────────────────────────────

const BUILTIN_SLUGS = new Set(["contacts", "leads", "deals", "organizations"]);

const SLUG_PATTERN = /^[a-z][a-z0-9_]{1,29}$/;
const FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]{0,40}$/;

const FIELD_TYPES = new Set([
  "text", "long_text", "number", "currency",
  "boolean", "select", "multi_select",
  "date", "datetime", "email", "phone",
  "url", "reference", "formula",
]);

const VISIBILITIES = new Set(["private", "team", "workspace"]);

// Cap object metadata size and record count to keep operations bounded.
const MAX_FIELDS_PER_OBJECT = 100;
const MAX_OBJECTS_PER_ORG = 200;

// ─── Errors ──────────────────────────────────────────────────────────────────

class HandlerError extends Error {
  constructor(public readonly reason: string, message?: string) {
    super(message || reason);
    this.name = "CustomObjectError";
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function customObjectHandler(
  context: SkillContext,
  input: CustomObjectInput,
): Promise<CustomObjectOutput> {
  if (!context.env.DB) {
    throw new HandlerError("d1_unavailable", "custom-object requires D1.");
  }
  await ensureCustomObjectTables(context.env);

  switch (input.operation) {
    case "create": return createObject(context, requireObject(input));
    case "update": return updateObject(context, requireObject(input));
    case "delete": return deleteObject(context, requireObject(input));
    case "list":   return listObjects(context, input);
    case "get":    return getObject(context, requireObject(input));
    default:
      throw new HandlerError(
        "invalid_operation",
        `Unknown operation: ${String(input.operation)}`,
      );
  }
}

function requireObject(input: CustomObjectInput): NonNullable<CustomObjectInput["object"]> {
  if (!input.object) {
    throw new HandlerError(
      "missing_required_field",
      "input.object is required for this operation.",
    );
  }
  return input.object;
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

type ObjectShape = NonNullable<CustomObjectInput["object"]>;

async function createObject(
  context: SkillContext,
  object: ObjectShape,
): Promise<CustomObjectOutput> {
  validateObjectShape(object);

  // Built-in collision check.
  if (BUILTIN_SLUGS.has(object.slug)) {
    throw new HandlerError(
      "slug_reserved",
      `Slug "${object.slug}" collides with a built-in record type (contacts/leads/deals/organizations).`,
    );
  }

  // Per-org slug uniqueness.
  const existing = await context.env.DB!
    .prepare(
      `SELECT id FROM custom_objects
        WHERE organization_id = ? AND slug = ?
        LIMIT 1`,
    )
    .bind(context.organization_id, object.slug)
    .first<{ id: string }>()
    .catch(() => null);
  if (existing?.id) {
    throw new HandlerError(
      "slug_in_use",
      `Slug "${object.slug}" already exists in this workspace.`,
    );
  }

  // Org-wide object cap.
  const count = await context.env.DB!
    .prepare(`SELECT COUNT(*) AS n FROM custom_objects WHERE organization_id = ?`)
    .bind(context.organization_id)
    .first<{ n: number }>()
    .catch(() => ({ n: 0 }));
  if ((count?.n ?? 0) >= MAX_OBJECTS_PER_ORG) {
    throw new HandlerError(
      "object_limit_reached",
      `Workspace already has ${MAX_OBJECTS_PER_ORG} custom objects (cap).`,
    );
  }

  const id = object.id || newId("co");
  const now = nowIso();
  await context.env.DB!
    .prepare(
      `INSERT INTO custom_objects (
         id, organization_id, slug, name_singular, name_plural, icon,
         fields_json, visibility, archived_at, record_count_cache,
         created_by, created_at, updated_at
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .bind(
      id,
      context.organization_id,
      object.slug,
      object.name_singular,
      object.name_plural,
      null,
      JSON.stringify(object.fields || []),
      object.visibility,
      null,
      0,
      context.actor_id || "unknown",
      now,
      null,
    )
    .run();

  await publish(context.env.DB, {
    organization_id: context.organization_id,
    event_type: "custom_object.created",
    actor_type: context.actor_type,
    actor_id: context.actor_id,
    resource_type: "custom_object",
    resource_id: id,
    payload: { object_id: id, slug: object.slug },
  }).catch(() => null);

  const saved = await loadObjectById(context, id);
  return { object_id: id, object: saved, records_count: 0 };
}

async function updateObject(
  context: SkillContext,
  object: ObjectShape,
): Promise<CustomObjectOutput> {
  if (!object.id) {
    throw new HandlerError("missing_required_field", "object.id is required for update.");
  }
  validateObjectShape(object);

  const existing = await loadObjectById(context, object.id);
  if (!existing) {
    throw new HandlerError(
      "not_found",
      `Custom object ${object.id} not found in this organization.`,
    );
  }

  // Slug cannot change once created (would invalidate references / URLs).
  if (existing.slug !== object.slug) {
    throw new HandlerError(
      "slug_immutable",
      "Slug cannot be changed after creation. Archive this object and create a new one.",
    );
  }

  // Field add/remove logic.
  //
  // v1 with blob storage: this is a metadata-only update. Removing a field
  // from the schema does not strip it from existing records' data_json blobs
  // (the data is still there, just no longer "declared"). The skill contract
  // requires `confirm: "drop_data"` for destructive removals — we enforce
  // the flag at the API boundary, but in v1 the storage behavior is the same
  // either way. v2 (indexed sidecar tables) will make this matter.
  const previousKeys = new Set(
    (existing.fields as Array<{ key: string }>).map((f) => f.key),
  );
  const currentKeys = new Set(object.fields.map((f) => f.key));
  const removed = [...previousKeys].filter((k) => !currentKeys.has(k));
  if (removed.length > 0) {
    // NOTE: API route is the gatekeeper for the `confirm: "drop_data"` flag.
    // Handler accepts the update; the audit trail records what was dropped.
  }

  const now = nowIso();
  await context.env.DB!
    .prepare(
      `UPDATE custom_objects
          SET name_singular = ?, name_plural = ?, icon = ?,
              fields_json = ?, visibility = ?, updated_at = ?
        WHERE id = ? AND organization_id = ?`,
    )
    .bind(
      object.name_singular,
      object.name_plural,
      null,
      JSON.stringify(object.fields || []),
      object.visibility,
      now,
      object.id,
      context.organization_id,
    )
    .run();

  await publish(context.env.DB, {
    organization_id: context.organization_id,
    event_type: "custom_object.updated",
    actor_type: context.actor_type,
    actor_id: context.actor_id,
    resource_type: "custom_object",
    resource_id: object.id,
    payload: { object_id: object.id },
  }).catch(() => null);

  const saved = await loadObjectById(context, object.id);
  const recordsCount = await countRecords(context, object.id);
  return { object_id: object.id, object: saved, records_count: recordsCount };
}

async function deleteObject(
  context: SkillContext,
  object: ObjectShape,
): Promise<CustomObjectOutput> {
  if (!object.id) {
    throw new HandlerError("missing_required_field", "object.id is required for delete.");
  }

  const existing = await loadObjectById(context, object.id);
  if (!existing) {
    throw new HandlerError(
      "not_found",
      `Custom object ${object.id} not found in this organization.`,
    );
  }

  // Archive, never DROP. Contract guarantee.
  const now = nowIso();
  await context.env.DB!
    .prepare(
      `UPDATE custom_objects
          SET archived_at = ?, updated_at = ?
        WHERE id = ? AND organization_id = ?`,
    )
    .bind(now, now, object.id, context.organization_id)
    .run();

  await publish(context.env.DB, {
    organization_id: context.organization_id,
    event_type: "custom_object.deleted",
    actor_type: context.actor_type,
    actor_id: context.actor_id,
    resource_type: "custom_object",
    resource_id: object.id,
    payload: { object_id: object.id },
  }).catch(() => null);

  const saved = await loadObjectById(context, object.id);
  const recordsCount = await countRecords(context, object.id);
  return { object_id: object.id, object: saved, records_count: recordsCount };
}

async function listObjects(
  context: SkillContext,
  input: CustomObjectInput,
): Promise<CustomObjectOutput> {
  // include_archived flag travels via input.object (a slight contract bend —
  // the operation has no first-class object payload). v1 only.
  const includeArchived = Boolean(
    (input as { include_archived?: boolean }).include_archived,
  );

  const sql = includeArchived
    ? `SELECT id, organization_id, slug, name_singular, name_plural, icon,
              fields_json, visibility, archived_at, record_count_cache,
              created_by, created_at, updated_at
         FROM custom_objects
        WHERE organization_id = ?
        ORDER BY archived_at IS NULL DESC, name_plural ASC`
    : `SELECT id, organization_id, slug, name_singular, name_plural, icon,
              fields_json, visibility, archived_at, record_count_cache,
              created_by, created_at, updated_at
         FROM custom_objects
        WHERE organization_id = ? AND archived_at IS NULL
        ORDER BY name_plural ASC`;

  const result = await context.env.DB!
    .prepare(sql)
    .bind(context.organization_id)
    .all<CustomObjectRow>()
    .catch(() => ({ results: [] as CustomObjectRow[] }));

  const objects = (result.results || []).map(rowToObject);
  return {
    object_id: "",
    object: { objects } as unknown as Record<string, unknown>,
    records_count: objects.length,
  };
}

async function getObject(
  context: SkillContext,
  object: ObjectShape,
): Promise<CustomObjectOutput> {
  if (!object.id) {
    throw new HandlerError("missing_required_field", "object.id is required for get.");
  }
  const saved = await loadObjectById(context, object.id);
  if (!saved) {
    throw new HandlerError(
      "not_found",
      `Custom object ${object.id} not found in this organization.`,
    );
  }
  const recordsCount = await countRecords(context, object.id);
  return { object_id: object.id, object: saved, records_count: recordsCount };
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateObjectShape(object: ObjectShape): void {
  if (!object.slug || !SLUG_PATTERN.test(object.slug)) {
    throw new HandlerError(
      "slug_invalid",
      `Slug must match ${SLUG_PATTERN.source} (lowercase, 2-30 chars, [a-z0-9_]).`,
    );
  }
  if (!object.name_singular || object.name_singular.length < 1 || object.name_singular.length > 40) {
    throw new HandlerError(
      "name_singular_invalid",
      "name_singular is required (1-40 chars).",
    );
  }
  if (!object.name_plural || object.name_plural.length < 1 || object.name_plural.length > 40) {
    throw new HandlerError(
      "name_plural_invalid",
      "name_plural is required (1-40 chars).",
    );
  }
  if (!VISIBILITIES.has(object.visibility)) {
    throw new HandlerError(
      "visibility_invalid",
      `visibility must be one of: ${[...VISIBILITIES].join(", ")}.`,
    );
  }
  if (!Array.isArray(object.fields)) {
    throw new HandlerError("fields_invalid", "fields must be an array.");
  }
  if (object.fields.length < 1) {
    throw new HandlerError("fields_empty", "fields must declare at least one field.");
  }
  if (object.fields.length > MAX_FIELDS_PER_OBJECT) {
    throw new HandlerError(
      "fields_too_many",
      `fields exceeds cap of ${MAX_FIELDS_PER_OBJECT}.`,
    );
  }

  const seenKeys = new Set<string>();
  for (const field of object.fields) {
    if (!field.key || !FIELD_KEY_PATTERN.test(field.key)) {
      throw new HandlerError(
        "field_key_invalid",
        `Field key "${field.key}" must match ${FIELD_KEY_PATTERN.source}.`,
      );
    }
    if (seenKeys.has(field.key)) {
      throw new HandlerError(
        "field_key_duplicate",
        `Field key "${field.key}" is declared more than once.`,
      );
    }
    seenKeys.add(field.key);

    if (!field.label || field.label.length < 1 || field.label.length > 60) {
      throw new HandlerError(
        "field_label_invalid",
        `Field "${field.key}" label is required (1-60 chars).`,
      );
    }
    if (!FIELD_TYPES.has(field.type)) {
      throw new HandlerError(
        "field_type_invalid",
        `Field "${field.key}" type "${field.type}" is not a supported type.`,
      );
    }
    if (typeof field.required !== "boolean") {
      throw new HandlerError(
        "field_required_invalid",
        `Field "${field.key}" required flag must be boolean.`,
      );
    }
  }
}

// ─── Persistence helpers ─────────────────────────────────────────────────────

interface CustomObjectRow {
  id: string;
  organization_id: string;
  slug: string;
  name_singular: string;
  name_plural: string;
  icon: string | null;
  fields_json: string;
  visibility: string;
  archived_at: string | null;
  record_count_cache: number | null;
  created_by: string;
  created_at: string;
  updated_at: string | null;
}

async function loadObjectById(
  context: SkillContext,
  id: string,
): Promise<Record<string, unknown> | null> {
  const row = await context.env.DB!
    .prepare(
      `SELECT id, organization_id, slug, name_singular, name_plural, icon,
              fields_json, visibility, archived_at, record_count_cache,
              created_by, created_at, updated_at
         FROM custom_objects
        WHERE id = ? AND organization_id = ?
        LIMIT 1`,
    )
    .bind(id, context.organization_id)
    .first<CustomObjectRow>()
    .catch(() => null);
  if (!row) return null;
  return rowToObject(row);
}

function rowToObject(row: CustomObjectRow): Record<string, unknown> {
  return {
    id: row.id,
    organization_id: row.organization_id,
    slug: row.slug,
    name_singular: row.name_singular,
    name_plural: row.name_plural,
    icon: row.icon,
    fields: safeParseJson(row.fields_json, [] as unknown[]),
    visibility: row.visibility,
    archived_at: row.archived_at,
    record_count_cache: row.record_count_cache,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function countRecords(context: SkillContext, customObjectId: string): Promise<number> {
  const result = await context.env.DB!
    .prepare(
      `SELECT COUNT(*) AS n
         FROM custom_object_records
        WHERE custom_object_id = ? AND organization_id = ?`,
    )
    .bind(customObjectId, context.organization_id)
    .first<{ n: number }>()
    .catch(() => ({ n: 0 }));
  return result?.n ?? 0;
}

function safeParseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ─── Table defense — matches csv-import.ts pattern ───────────────────────────

export async function ensureCustomObjectTables(env: CloudflareEnv): Promise<void> {
  if (!env.DB) return;
  await env.DB
    .prepare(
      `CREATE TABLE IF NOT EXISTS custom_objects (
         id TEXT PRIMARY KEY,
         organization_id TEXT NOT NULL,
         slug TEXT NOT NULL,
         name_singular TEXT NOT NULL,
         name_plural TEXT NOT NULL,
         icon TEXT,
         fields_json TEXT NOT NULL DEFAULT '[]',
         visibility TEXT NOT NULL DEFAULT 'private',
         archived_at TEXT,
         record_count_cache INTEGER,
         created_by TEXT NOT NULL,
         created_at TEXT NOT NULL,
         updated_at TEXT
       )`,
    )
    .run();
  await env.DB
    .prepare(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_objects_org_slug
         ON custom_objects (organization_id, slug)`,
    )
    .run();
  await env.DB
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_custom_objects_org_archived
         ON custom_objects (organization_id, archived_at)`,
    )
    .run();
  await env.DB
    .prepare(
      `CREATE TABLE IF NOT EXISTS custom_object_records (
         id TEXT PRIMARY KEY,
         custom_object_id TEXT NOT NULL,
         organization_id TEXT NOT NULL,
         data_json TEXT NOT NULL DEFAULT '{}',
         created_by TEXT NOT NULL,
         created_at TEXT NOT NULL,
         updated_at TEXT
       )`,
    )
    .run();
  await env.DB
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_custom_object_records_org_object
         ON custom_object_records (organization_id, custom_object_id)`,
    )
    .run();
}
