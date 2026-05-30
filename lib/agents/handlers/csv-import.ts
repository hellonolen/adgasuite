// Operations handler: skills/csv-import.skill.md
//
// Source-agnostic record ingest. v1 handles `csv` + `paste` source_types
// natively (no external HTTP). Adapter source_types (hubspot/pipedrive/etc)
// delegate to their own skill handlers — same input shape, different fetch
// strategy — and remain stubs until OAuth wiring lands.
//
// State contracts:
//   cloudflare/state/import-batch.schema.json
//   cloudflare/state/import-row.schema.json
// Materialized in cloudflare/db/migrations/0025_import_batches.sql.

import { publish } from "@/lib/events/bus";
import { newId, nowIso } from "@/lib/server/id";
import type { SkillContext } from "@/lib/agents/skill-registry";

export interface CsvImportInput {
  source_type: "csv" | "paste" | "hubspot" | "pipedrive" | "salesforce" | "notion" | "airtable";
  target_type: "contacts" | "leads" | "deals" | "organizations";
  payload: {
    csv?: { content: string; has_header: boolean };
    paste?: { rows: string[][]; has_header: boolean };
    // Adapter payloads — accepted at the contract level but rejected by this
    // handler with source_not_implemented; their own skill handlers take over.
    [adapter: string]: unknown;
  };
  field_mapping: Record<string, string>;
  dedupe_strategy?: "email" | "external_id" | "name_plus_company" | "domain" | "name" | "phone" | "none";
}

export interface CsvImportOutput {
  batch_id: string;
  rows_total: number;
  rows_succeeded: number;
  rows_failed: number;
  failure_summary: Record<string, number>;
  status: string;
  duration_ms: number;
}

const TARGET_REQUIRED_FIELDS: Record<string, string[]> = {
  contacts: ["first_name", "last_name"],
  leads: ["full_name", "email"],
  deals: ["name"],
  organizations: ["name"],
};

// SECURITY: writable-field allowlist per target. Prevents mass-assignment
// attacks via crafted field_mapping (e.g. mapping a source column to
// `organization_id` or `id` to escape tenant scope or hijack record identity).
const TARGET_WRITABLE_FIELDS: Record<string, Set<string>> = {
  contacts: new Set(["first_name", "last_name", "full_name", "email", "phone", "company", "title", "status"]),
  leads: new Set(["full_name", "first_name", "last_name", "email", "company", "job_title", "source", "status", "score", "next_action", "notes"]),
  deals: new Set(["name", "company", "value_cents", "value", "amount", "stage", "probability", "expected_close_at"]),
  organizations: new Set(["name", "domain", "email", "phone"]),
};

// Bulk-write safety cap: blocks runaway DoS via huge paste/csv payloads. Also
// caps the per-batch surface so a single import can never overwrite an entire
// tenant. Configurable per env later; conservative default for v1.
const MAX_ROWS_PER_BATCH = 50_000;

// SECURITY: scrub a value before it lands in an event payload or audit log.
// Replaces raw email/phone/PII with a redacted token. Used in failure_detail
// so the append-only events table doesn't permanently store cell values.
function redactPII(detail: string): string {
  if (!detail) return detail;
  return detail
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[phone]")
    .slice(0, 200);
}

const DEFAULT_DEDUPE: Record<string, "email" | "name_plus_company" | "domain" | "name"> = {
  contacts: "email",
  leads: "email",
  deals: "name_plus_company",
  organizations: "domain",
};

class RowError extends Error {
  constructor(public readonly reason: string, message?: string) {
    super(message || reason);
  }
}

export async function csvImportHandler(
  context: SkillContext,
  input: CsvImportInput,
): Promise<CsvImportOutput> {
  if (!context.env.DB) throw new Error("csv-import requires D1.");
  if (input.source_type !== "csv" && input.source_type !== "paste") {
    throw new RowError("source_not_implemented", `Source "${input.source_type}" has a contract but no handler in this skill — call skill.import-${input.source_type} instead.`);
  }

  await ensureImportTables(context.env);

  const targetType = input.target_type;
  const requiredFields = TARGET_REQUIRED_FIELDS[targetType] || [];
  const allowedFields = TARGET_WRITABLE_FIELDS[targetType] || new Set();
  const mappedTargets = new Set(Object.values(input.field_mapping || {}));

  // SECURITY: reject any mapping that writes outside the per-target allowlist.
  // Blocks mass-assignment of `id`, `organization_id`, `created_at`, etc.
  const disallowed = [...mappedTargets].filter((t) => !allowedFields.has(t));
  if (disallowed.length > 0) {
    throw new RowError(
      "mapping_invalid",
      `field_mapping targets not writable on ${targetType}: ${disallowed.join(", ")}`,
    );
  }

  const missingRequired = requiredFields.filter((f) => !mappedTargets.has(f));
  if (missingRequired.length > 0) {
    throw new RowError(
      "mapping_incomplete",
      `field_mapping is missing required target field(s): ${missingRequired.join(", ")}`,
    );
  }

  const dedupeStrategy = input.dedupe_strategy || DEFAULT_DEDUPE[targetType] || "none";
  const rows = await parseRows(input);

  // SECURITY: hard cap on rows per batch. Stops runaway paste/csv payloads
  // from running until D1 times out. Operator can split larger imports.
  if (rows.length > MAX_ROWS_PER_BATCH) {
    throw new RowError(
      "row_count_exceeded",
      `Batch has ${rows.length} rows; cap is ${MAX_ROWS_PER_BATCH}. Split into smaller batches.`,
    );
  }
  const startedAt = nowIso();
  const startedTs = Date.now();
  const batchId = newId("imp");

  await context.env.DB
    .prepare(
      `INSERT INTO import_batches (
         id, organization_id, actor_type, actor_id, source_type, target_type,
         field_mapping_json, dedupe_strategy, status, rows_total, rows_succeeded,
         rows_failed, failure_summary_json, started_at
       ) VALUES (?,?,?,?,?,?,?,?, 'running', ?, 0, 0, '{}', ?)`,
    )
    .bind(
      batchId,
      context.organization_id,
      context.actor_type === "system" || context.actor_type === "webhook" || context.actor_type === "cron"
        ? "agent"
        : context.actor_type,
      context.actor_id || "unknown",
      input.source_type,
      targetType,
      JSON.stringify(input.field_mapping || {}),
      dedupeStrategy,
      rows.length,
      startedAt,
    )
    .run();

  await publish(context.env.DB, {
    organization_id: context.organization_id,
    event_type: "import.requested",
    actor_type: context.actor_type,
    actor_id: context.actor_id,
    resource_type: "import_batch",
    resource_id: batchId,
    payload: {
      batch_id: batchId,
      source_type: input.source_type,
      target_type: targetType,
      rows_total: rows.length,
    },
  }).catch(() => null);

  let succeeded = 0;
  let failed = 0;
  const failureSummary: Record<string, number> = {};

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 1;
    const rawRow = rows[i];
    try {
      const mapped = mapRow(rawRow, input.field_mapping || {});
      const outcome = await insertOrDedupe(
        context.env.DB,
        context.organization_id,
        targetType,
        mapped,
        dedupeStrategy,
      );
      await recordRow(context.env.DB, {
        batchId,
        organizationId: context.organization_id,
        rowNumber,
        status: "succeeded",
        rawData: rawRow,
        mappedData: mapped,
        targetRecordId: outcome.id,
        targetRecordType: outcome.recordType,
        dedupeMatch: outcome.matched ? outcome.id : null,
        failureReason: null,
        failureDetail: null,
      });
      await publish(context.env.DB, {
        organization_id: context.organization_id,
        event_type: "import.row_succeeded",
        actor_type: context.actor_type,
        actor_id: context.actor_id,
        resource_type: "import_batch",
        resource_id: batchId,
        payload: {
          batch_id: batchId,
          row_number: rowNumber,
          target_record_id: outcome.id,
          dedupe_match: outcome.matched ? outcome.id : null,
        },
      }).catch(() => null);
      succeeded++;
    } catch (err) {
      const reason = err instanceof RowError ? err.reason : "unknown";
      const detail = err instanceof Error ? err.message : String(err);
      failureSummary[reason] = (failureSummary[reason] ?? 0) + 1;
      failed++;
      await recordRow(context.env.DB, {
        batchId,
        organizationId: context.organization_id,
        rowNumber,
        status: "failed",
        rawData: rawRow,
        mappedData: null,
        targetRecordId: null,
        targetRecordType: null,
        dedupeMatch: null,
        failureReason: reason,
        failureDetail: detail,
      });
      await publish(context.env.DB, {
        organization_id: context.organization_id,
        event_type: "import.row_failed",
        actor_type: context.actor_type,
        actor_id: context.actor_id,
        resource_type: "import_batch",
        resource_id: batchId,
        payload: {
          batch_id: batchId,
          row_number: rowNumber,
          failure_reason: reason,
          // SECURITY: scrub raw cell values before they land in append-only events.
          failure_detail: redactPII(detail),
        },
      }).catch(() => null);
    }
  }

  const completedAt = nowIso();
  const durationMs = Date.now() - startedTs;
  const finalStatus = failed === 0 ? "completed" : "completed_with_failures";

  await context.env.DB
    .prepare(
      `UPDATE import_batches
          SET status = ?, rows_succeeded = ?, rows_failed = ?,
              failure_summary_json = ?, duration_ms = ?, completed_at = ?
        WHERE id = ? AND organization_id = ?`,
    )
    .bind(
      finalStatus,
      succeeded,
      failed,
      JSON.stringify(failureSummary),
      durationMs,
      completedAt,
      batchId,
      context.organization_id,
    )
    .run();

  await publish(context.env.DB, {
    organization_id: context.organization_id,
    event_type: "import.completed",
    actor_type: context.actor_type,
    actor_id: context.actor_id,
    resource_type: "import_batch",
    resource_id: batchId,
    payload: {
      batch_id: batchId,
      target_type: targetType,
      rows_total: rows.length,
      rows_succeeded: succeeded,
      rows_failed: failed,
      duration_ms: durationMs,
    },
  }).catch(() => null);

  return {
    batch_id: batchId,
    rows_total: rows.length,
    rows_succeeded: succeeded,
    rows_failed: failed,
    failure_summary: failureSummary,
    status: finalStatus,
    duration_ms: durationMs,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function ensureImportTables(env: CloudflareEnv): Promise<void> {
  if (!env.DB) return;
  await env.DB
    .prepare(
      `CREATE TABLE IF NOT EXISTS import_batches (
         id TEXT PRIMARY KEY,
         organization_id TEXT NOT NULL,
         actor_type TEXT NOT NULL,
         actor_id TEXT NOT NULL,
         source_type TEXT NOT NULL,
         source_file_url TEXT,
         source_reference TEXT,
         target_type TEXT NOT NULL,
         field_mapping_json TEXT NOT NULL DEFAULT '{}',
         dedupe_strategy TEXT NOT NULL DEFAULT 'email',
         status TEXT NOT NULL DEFAULT 'queued',
         rows_total INTEGER NOT NULL DEFAULT 0,
         rows_succeeded INTEGER NOT NULL DEFAULT 0,
         rows_failed INTEGER NOT NULL DEFAULT 0,
         failure_summary_json TEXT NOT NULL DEFAULT '{}',
         size_bytes INTEGER,
         duration_ms INTEGER,
         started_at TEXT NOT NULL,
         completed_at TEXT,
         error TEXT
       )`,
    )
    .run();
  await env.DB
    .prepare(
      `CREATE TABLE IF NOT EXISTS import_batch_rows (
         id TEXT PRIMARY KEY,
         batch_id TEXT NOT NULL,
         organization_id TEXT NOT NULL,
         row_number INTEGER NOT NULL,
         status TEXT NOT NULL,
         raw_data_json TEXT NOT NULL DEFAULT '{}',
         mapped_data_json TEXT,
         target_record_id TEXT,
         target_record_type TEXT,
         dedupe_match TEXT,
         failure_reason TEXT,
         failure_detail TEXT,
         created_at TEXT NOT NULL
       )`,
    )
    .run();
}

/** Parse a CSV string into rows. Minimal RFC4180 — quoted cells, embedded quotes via "". */
function parseCsv(content: string, hasHeader: boolean): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (inQuotes) {
      if (c === '"') {
        if (content[i + 1] === '"') { cell += '"'; i++; }
        else { inQuotes = false; }
      } else {
        cell += c;
      }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else if (c === "\r") { /* skip */ }
      else { cell += c; }
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }

  if (rows.length === 0) return [];
  const headers = hasHeader ? rows[0].map(normalizeHeader) : rows[0].map((_, idx) => `col_${idx + 1}`);
  const dataRows = hasHeader ? rows.slice(1) : rows;
  return [headers, ...dataRows];
}

function normalizeHeader(s: string): string {
  return String(s || "").replace(/^﻿/, "").trim().toLowerCase().replace(/\s+/g, "_");
}

async function parseRows(input: CsvImportInput): Promise<Array<Record<string, string>>> {
  if (input.source_type === "csv") {
    const csv = input.payload?.csv;
    if (!csv?.content) throw new RowError("missing_required_field", "payload.csv.content required for csv source");
    const parsed = parseCsv(csv.content, csv.has_header !== false);
    if (parsed.length < 2) return [];
    const headers = parsed[0];
    return parsed.slice(1).map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = row[i] ?? ""; });
      return obj;
    });
  }
  if (input.source_type === "paste") {
    const paste = input.payload?.paste;
    if (!paste?.rows) throw new RowError("missing_required_field", "payload.paste.rows required for paste source");
    const hasHeader = paste.has_header !== false;
    const headers = hasHeader
      ? paste.rows[0].map(normalizeHeader)
      : paste.rows[0].map((_, idx) => `col_${idx + 1}`);
    const dataRows = hasHeader ? paste.rows.slice(1) : paste.rows;
    return dataRows.map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = row[i] ?? ""; });
      return obj;
    });
  }
  return [];
}

function mapRow(raw: Record<string, string>, mapping: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [src, target] of Object.entries(mapping)) {
    const v = raw[normalizeHeader(src)] ?? raw[src] ?? "";
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      out[target] = String(v).trim();
    }
  }
  return out;
}

interface InsertOutcome {
  id: string;
  recordType: "contact" | "lead" | "deal" | "organization";
  matched: boolean;
}

async function insertOrDedupe(
  db: D1Database,
  organizationId: string,
  targetType: "contacts" | "leads" | "deals" | "organizations",
  mapped: Record<string, string>,
  dedupeStrategy: string,
): Promise<InsertOutcome> {
  switch (targetType) {
    case "contacts":   return insertContact(db, organizationId, mapped, dedupeStrategy);
    case "leads":      return insertLead(db, organizationId, mapped, dedupeStrategy);
    case "deals":      return insertDeal(db, organizationId, mapped, dedupeStrategy);
    case "organizations": return insertOrganization(db, organizationId, mapped, dedupeStrategy);
  }
}

async function insertContact(
  db: D1Database,
  orgId: string,
  m: Record<string, string>,
  dedupe: string,
): Promise<InsertOutcome> {
  // contacts requires first_name + last_name. If full_name given, split.
  if (!m.first_name && !m.last_name && m.full_name) {
    const parts = m.full_name.split(/\s+/);
    m.first_name = parts[0] || "";
    m.last_name = parts.slice(1).join(" ") || parts[0] || "";
  }
  if (!m.first_name) throw new RowError("missing_required_field", "contact requires first_name");
  if (!m.last_name) m.last_name = m.first_name; // permissive: single-name contacts allowed
  if (m.email && !isValidEmail(m.email)) throw new RowError("invalid_email", `invalid email: ${m.email}`);

  if (dedupe === "email" && m.email) {
    const existing = await db
      .prepare(`SELECT id FROM contacts WHERE organization_id = ? AND lower(email) = lower(?) LIMIT 1`)
      .bind(orgId, m.email)
      .first<{ id: string }>();
    if (existing?.id) {
      await db
        .prepare(`UPDATE contacts SET first_name = COALESCE(NULLIF(?, ''), first_name), last_name = COALESCE(NULLIF(?, ''), last_name), phone = COALESCE(NULLIF(?, ''), phone), company = COALESCE(NULLIF(?, ''), company), title = COALESCE(NULLIF(?, ''), title), updated_at = ? WHERE id = ?`)
        .bind(m.first_name, m.last_name, m.phone || "", m.company || "", m.title || "", nowIso(), existing.id)
        .run();
      return { id: existing.id, recordType: "contact", matched: true };
    }
  }

  const id = newId("ctc");
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO contacts (id, organization_id, first_name, last_name, email, phone, company, title, status, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .bind(id, orgId, m.first_name, m.last_name, m.email || null, m.phone || null, m.company || null, m.title || null, m.status || "lead", now, now)
    .run();
  return { id, recordType: "contact", matched: false };
}

async function insertLead(
  db: D1Database,
  orgId: string,
  m: Record<string, string>,
  dedupe: string,
): Promise<InsertOutcome> {
  if (!m.full_name && (m.first_name || m.last_name)) {
    m.full_name = [m.first_name, m.last_name].filter(Boolean).join(" ");
  }
  if (!m.full_name) throw new RowError("missing_required_field", "lead requires full_name");
  if (!m.email) throw new RowError("missing_required_field", "lead requires email");
  if (!isValidEmail(m.email)) throw new RowError("invalid_email", `invalid email: ${m.email}`);
  if (!m.company) m.company = "Unknown";

  if (dedupe === "email") {
    const existing = await db
      .prepare(`SELECT id FROM leads WHERE organization_id = ? AND lower(email) = lower(?) LIMIT 1`)
      .bind(orgId, m.email)
      .first<{ id: string }>();
    if (existing?.id) {
      await db
        .prepare(`UPDATE leads SET full_name = ?, company = ?, job_title = COALESCE(NULLIF(?, ''), job_title), notes = COALESCE(NULLIF(?, ''), notes), updated_at = ? WHERE id = ?`)
        .bind(m.full_name, m.company, m.job_title || "", m.notes || "", nowIso(), existing.id)
        .run();
      return { id: existing.id, recordType: "lead", matched: true };
    }
  }

  const id = newId("lead");
  const now = nowIso();
  const score = m.score ? parseInt(m.score, 10) : 50;
  await db
    .prepare(
      `INSERT INTO leads (id, organization_id, full_name, email, company, job_title, source, status, score, next_action, notes, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .bind(id, orgId, m.full_name, m.email, m.company, m.job_title || null, m.source || "import", m.status || "Warm", isFinite(score) ? score : 50, m.next_action || null, m.notes || null, now, now)
    .run();
  return { id, recordType: "lead", matched: false };
}

async function insertDeal(
  db: D1Database,
  orgId: string,
  m: Record<string, string>,
  dedupe: string,
): Promise<InsertOutcome> {
  if (!m.name) throw new RowError("missing_required_field", "deal requires name");
  const valueCents = parseValueCents(m.value_cents || m.value || m.amount);

  if (dedupe === "name_plus_company") {
    const existing = await db
      .prepare(`SELECT id FROM deals WHERE organization_id = ? AND lower(name) = lower(?) AND COALESCE(lower(company), '') = COALESCE(lower(?), '') LIMIT 1`)
      .bind(orgId, m.name, m.company || "")
      .first<{ id: string }>();
    if (existing?.id) {
      await db
        .prepare(`UPDATE deals SET name = ?, company = COALESCE(NULLIF(?, ''), company), value_cents = CASE WHEN ? > 0 THEN ? ELSE value_cents END, stage = COALESCE(NULLIF(?, ''), stage), updated_at = ? WHERE id = ?`)
        .bind(m.name, m.company || "", valueCents, valueCents, m.stage || "", nowIso(), existing.id)
        .run();
      return { id: existing.id, recordType: "deal", matched: true };
    }
  }

  const id = newId("deal");
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO deals (id, organization_id, name, company, value_cents, stage, probability, expected_close_at, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    )
    .bind(id, orgId, m.name, m.company || null, valueCents, m.stage || "Prospect", parseProbability(m.probability), m.expected_close_at || null, now, now)
    .run();
  return { id, recordType: "deal", matched: false };
}

async function insertOrganization(
  db: D1Database,
  orgId: string,
  m: Record<string, string>,
  dedupe: string,
): Promise<InsertOutcome> {
  if (!m.name) throw new RowError("missing_required_field", "organization requires name");
  // ADGA's organizations table is workspace-tenancy. Imported orgs become contacts.company strings,
  // not organization records. Treat as a no-op insert into a side dimension by upserting into contacts.
  // To remain honest: when a customer truly needs an Organizations record-type, custom-object skill
  // covers it. For v1 we map organization rows to a contact stub flagged as company-only.
  const existing = await db
    .prepare(`SELECT id FROM contacts WHERE organization_id = ? AND lower(company) = lower(?) AND lower(COALESCE(first_name,'')) = '' LIMIT 1`)
    .bind(orgId, m.name)
    .first<{ id: string }>();
  if (existing?.id) {
    return { id: existing.id, recordType: "contact", matched: true };
  }
  const id = newId("org");
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO contacts (id, organization_id, first_name, last_name, email, phone, company, title, status, created_at, updated_at)
       VALUES (?,?,'', '', ?,?,?,?, 'company', ?, ?)`,
    )
    .bind(id, orgId, m.email || null, m.phone || null, m.name, m.domain || null, now, now)
    .run();
  return { id, recordType: "organization", matched: false };
}

function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  // Reject embedded whitespace (newlines / tabs / spaces) that would otherwise
  // permit header-injection downstream.
  if (/[\s\r\n]/.test(email)) return false;
  // Local + @ + domain + TLD (≥2 chars).
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);
}

function parseValueCents(v: string | undefined): number {
  if (!v) return 0;
  const cleaned = String(v).replace(/[^0-9.\-]/g, "");
  if (!cleaned) return 0;
  const n = parseFloat(cleaned);
  if (!isFinite(n)) return 0;
  // If the value already looks like cents (integer with no decimal), keep as-is;
  // otherwise multiply by 100 (treat as dollars).
  return cleaned.includes(".") ? Math.round(n * 100) : Math.round(n);
}

function parseProbability(v: string | undefined): number {
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  if (!isFinite(n)) return 0;
  if (n > 1 && n <= 100) return Math.round(n);
  if (n >= 0 && n <= 1) return Math.round(n * 100);
  return 0;
}

interface RecordRowParams {
  batchId: string;
  organizationId: string;
  rowNumber: number;
  status: "succeeded" | "failed" | "skipped" | "retried";
  rawData: Record<string, unknown>;
  mappedData: Record<string, unknown> | null;
  targetRecordId: string | null;
  targetRecordType: string | null;
  dedupeMatch: string | null;
  failureReason: string | null;
  failureDetail: string | null;
}

async function recordRow(db: D1Database, params: RecordRowParams): Promise<void> {
  await db
    .prepare(
      `INSERT INTO import_batch_rows (
         id, batch_id, organization_id, row_number, status,
         raw_data_json, mapped_data_json, target_record_id, target_record_type,
         dedupe_match, failure_reason, failure_detail, created_at
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .bind(
      newId("impr"),
      params.batchId,
      params.organizationId,
      params.rowNumber,
      params.status,
      JSON.stringify(params.rawData),
      params.mappedData ? JSON.stringify(params.mappedData) : null,
      params.targetRecordId,
      params.targetRecordType,
      params.dedupeMatch,
      params.failureReason,
      params.failureDetail,
      nowIso(),
    )
    .run();
}
