// Intelligence handler: skills/import-enrichment.skill.md
//
// Post-import cleanup pass that fires after `import.completed`:
//   - normalize_names              — title-case ALL-CAPS / lower-case name fields
//   - derive_company_from_email    — set company from email domain when missing
//   - dedupe_near_matches          — declared in contract; skipped in v1
//   - score_leads                  — declared in contract; skipped in v1
//   - summarize_imported           — declared in contract; skipped in v1
//
// Idempotent: a content hash over (batch_id, succeeded row ids, operations)
// is stored in `import_enrichments`. Re-running the same operation set on a
// batch whose rows haven't changed is a no-op.
//
// Recovery: a single failing operation logs to skipped_operations and the
// enrichment continues. Only a top-level failure (DB unreachable, batch not
// found) emits `enrichment.failed`.

import { publish } from "@/lib/events/bus";
import { newId, nowIso } from "@/lib/server/id";
import type { SkillContext } from "@/lib/agents/skill-registry";

// ─── public types (mirror skills/import-enrichment.skill.md) ─────────────────

export type EnrichmentOperation =
  | "normalize_names"
  | "derive_company_from_email"
  | "dedupe_near_matches"
  | "score_leads"
  | "summarize_imported";

export interface ImportEnrichmentInput {
  batch_id: string;
  operations: EnrichmentOperation[];
}

export interface OperationOutcome {
  operation: EnrichmentOperation;
  rows_touched: number;
  rows_changed: number;
}

export interface ImportEnrichmentOutput {
  enrichment_id: string;
  operations_applied: OperationOutcome[];
  duration_ms: number;
}

const IMPLEMENTED_OPERATIONS: ReadonlySet<EnrichmentOperation> = new Set<EnrichmentOperation>([
  "normalize_names",
  "derive_company_from_email",
]);

// ─── schema bootstrap (defensive — migration 0026 ships the canonical DDL) ───

async function ensureEnrichmentTable(env: CloudflareEnv): Promise<void> {
  if (!env.DB) return;
  await env.DB
    .prepare(
      `CREATE TABLE IF NOT EXISTS import_enrichments (
         id TEXT PRIMARY KEY,
         batch_id TEXT NOT NULL,
         organization_id TEXT NOT NULL,
         content_hash TEXT NOT NULL,
         operations_json TEXT NOT NULL,
         operations_applied_json TEXT NOT NULL,
         skipped_operations_json TEXT NOT NULL DEFAULT '[]',
         duration_ms INTEGER NOT NULL DEFAULT 0,
         status TEXT NOT NULL DEFAULT 'completed',
         error TEXT,
         created_at TEXT NOT NULL
       )`,
    )
    .run()
    .catch(() => null);
  await env.DB
    .prepare(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_import_enrichments_batch_hash
         ON import_enrichments (batch_id, content_hash)`,
    )
    .run()
    .catch(() => null);
}

// import_batches / import_batch_rows tables are owned by csv-import (still a
// stub). Create defensively so this handler doesn't crash when invoked before
// the import handler lands. Schema follows cloudflare/state/import-*.schema.json.
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
         dedupe_strategy TEXT NOT NULL,
         status TEXT NOT NULL,
         rows_total INTEGER NOT NULL DEFAULT 0,
         rows_succeeded INTEGER NOT NULL DEFAULT 0,
         rows_failed INTEGER NOT NULL DEFAULT 0,
         failure_summary_json TEXT,
         size_bytes INTEGER,
         duration_ms INTEGER,
         started_at TEXT NOT NULL,
         completed_at TEXT,
         error TEXT
       )`,
    )
    .run()
    .catch(() => null);
  await env.DB
    .prepare(
      `CREATE TABLE IF NOT EXISTS import_batch_rows (
         id TEXT PRIMARY KEY,
         batch_id TEXT NOT NULL,
         organization_id TEXT NOT NULL,
         row_number INTEGER NOT NULL,
         status TEXT NOT NULL,
         raw_data_json TEXT NOT NULL,
         mapped_data_json TEXT,
         target_record_id TEXT,
         target_record_type TEXT,
         dedupe_match TEXT,
         failure_reason TEXT,
         failure_detail TEXT,
         created_at TEXT NOT NULL
       )`,
    )
    .run()
    .catch(() => null);
}

// ─── row shapes (DB) ─────────────────────────────────────────────────────────

interface BatchRow {
  id: string;
  organization_id: string;
  target_type: "contacts" | "leads" | "deals" | "organizations";
}

interface SucceededImportRow {
  id: string;
  target_record_id: string;
  target_record_type: "contact" | "lead" | "deal" | "organization";
}

interface ContactRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company: string | null;
}

interface LeadRow {
  id: string;
  full_name: string | null;
  email: string | null;
  company: string | null;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function looksLikeAllCaps(s: string): boolean {
  // Treat as ALL-CAPS only when there is at least one letter and no lowercase.
  return /[A-Z]/.test(s) && !/[a-z]/.test(s);
}

function looksLikeAllLower(s: string): boolean {
  return /[a-z]/.test(s) && !/[A-Z]/.test(s);
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/(\s+|-)/) // preserve whitespace + hyphens as separators
    .map((part) => {
      if (!part || /^\s+$/.test(part) || part === "-") return part;
      // Handle quoted/contracted segments like "o'brien" → "O'Brien"
      return part.replace(/([a-z])([a-z']*)/i, (_, first: string, rest: string) => {
        return first.toUpperCase() + rest.toLowerCase();
      });
    })
    .join("");
}

function maybeNormalizeName(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!looksLikeAllCaps(trimmed) && !looksLikeAllLower(trimmed)) return null;
  const next = titleCase(trimmed);
  return next === trimmed ? null : next;
}

function companyFromEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.indexOf("@");
  if (at < 0 || at === email.length - 1) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain || !domain.includes(".")) return null;
  // Skip obvious freemail providers — they're not the contact's company.
  const freemail = new Set([
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "icloud.com",
    "me.com",
    "aol.com",
    "proton.me",
    "protonmail.com",
    "msn.com",
    "live.com",
  ]);
  if (freemail.has(domain)) return null;
  const root = domain.split(".")[0];
  if (!root) return null;
  return titleCase(root);
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

// ─── operation: normalize_names ──────────────────────────────────────────────

async function runNormalizeNames(
  env: CloudflareEnv,
  rows: SucceededImportRow[],
  organizationId: string,
): Promise<OperationOutcome> {
  const db = env.DB;
  if (!db) return { operation: "normalize_names", rows_touched: 0, rows_changed: 0 };

  let touched = 0;
  let changed = 0;
  const now = nowIso();

  for (const r of rows) {
    if (r.target_record_type !== "contact" && r.target_record_type !== "lead") continue;
    touched += 1;

    if (r.target_record_type === "contact") {
      const contact = await db
        .prepare(
          `SELECT id, first_name, last_name, email, company
             FROM contacts
            WHERE id = ? AND organization_id = ?`,
        )
        .bind(r.target_record_id, organizationId)
        .first<ContactRow>()
        .catch(() => null);
      if (!contact) continue;

      const nextFirst = maybeNormalizeName(contact.first_name);
      const nextLast = maybeNormalizeName(contact.last_name);
      if (nextFirst == null && nextLast == null) continue;

      await db
        .prepare(
          `UPDATE contacts
              SET first_name = COALESCE(?, first_name),
                  last_name  = COALESCE(?, last_name),
                  updated_at = ?
            WHERE id = ? AND organization_id = ?`,
        )
        .bind(nextFirst, nextLast, now, contact.id, organizationId)
        .run()
        .catch(() => null);
      changed += 1;
    } else {
      const lead = await db
        .prepare(
          `SELECT id, full_name, email, company
             FROM leads
            WHERE id = ? AND organization_id = ?`,
        )
        .bind(r.target_record_id, organizationId)
        .first<LeadRow>()
        .catch(() => null);
      if (!lead) continue;

      const nextFullName = maybeNormalizeName(lead.full_name);
      if (nextFullName == null) continue;

      await db
        .prepare(
          `UPDATE leads
              SET full_name = ?,
                  updated_at = ?
            WHERE id = ? AND organization_id = ?`,
        )
        .bind(nextFullName, now, lead.id, organizationId)
        .run()
        .catch(() => null);
      changed += 1;
    }
  }

  return { operation: "normalize_names", rows_touched: touched, rows_changed: changed };
}

// ─── operation: derive_company_from_email ────────────────────────────────────

async function runDeriveCompanyFromEmail(
  env: CloudflareEnv,
  rows: SucceededImportRow[],
  organizationId: string,
): Promise<OperationOutcome> {
  const db = env.DB;
  if (!db) return { operation: "derive_company_from_email", rows_touched: 0, rows_changed: 0 };

  let touched = 0;
  let changed = 0;
  const now = nowIso();

  for (const r of rows) {
    if (r.target_record_type !== "contact" && r.target_record_type !== "lead") continue;
    touched += 1;

    if (r.target_record_type === "contact") {
      const contact = await db
        .prepare(
          `SELECT id, first_name, last_name, email, company
             FROM contacts
            WHERE id = ? AND organization_id = ?`,
        )
        .bind(r.target_record_id, organizationId)
        .first<ContactRow>()
        .catch(() => null);
      if (!contact) continue;
      if (contact.company && contact.company.trim().length > 0) continue;
      const derived = companyFromEmail(contact.email);
      if (!derived) continue;

      await db
        .prepare(
          `UPDATE contacts
              SET company = ?,
                  updated_at = ?
            WHERE id = ? AND organization_id = ?
              AND (company IS NULL OR company = '')`,
        )
        .bind(derived, now, contact.id, organizationId)
        .run()
        .catch(() => null);
      changed += 1;
    } else {
      const lead = await db
        .prepare(
          `SELECT id, full_name, email, company
             FROM leads
            WHERE id = ? AND organization_id = ?`,
        )
        .bind(r.target_record_id, organizationId)
        .first<LeadRow>()
        .catch(() => null);
      if (!lead) continue;
      if (lead.company && lead.company.trim().length > 0) continue;
      const derived = companyFromEmail(lead.email);
      if (!derived) continue;

      await db
        .prepare(
          `UPDATE leads
              SET company = ?,
                  updated_at = ?
            WHERE id = ? AND organization_id = ?
              AND (company IS NULL OR company = '')`,
        )
        .bind(derived, now, lead.id, organizationId)
        .run()
        .catch(() => null);
      changed += 1;
    }
  }

  return { operation: "derive_company_from_email", rows_touched: touched, rows_changed: changed };
}

// ─── main handler ────────────────────────────────────────────────────────────

export async function importEnrichmentHandler(
  context: SkillContext,
  input: ImportEnrichmentInput,
): Promise<ImportEnrichmentOutput> {
  if (!context.env.DB) throw new Error("import-enrichment requires D1.");
  if (!input.batch_id || typeof input.batch_id !== "string") {
    throw new Error("batch_id is required.");
  }
  if (!Array.isArray(input.operations) || input.operations.length === 0) {
    throw new Error("operations[] is required and must be non-empty.");
  }

  await ensureImportTables(context.env);
  await ensureEnrichmentTable(context.env);

  const startedAtMs = Date.now();
  const enrichmentId = newId("enr");
  const db = context.env.DB;

  // 1. Resolve batch + scope.
  const batch = await db
    .prepare(
      `SELECT id, organization_id, target_type
         FROM import_batches
        WHERE id = ?`,
    )
    .bind(input.batch_id)
    .first<BatchRow>()
    .catch(() => null);

  if (!batch) {
    await publish(context.env.DB, {
      organization_id: context.organization_id,
      event_type: "enrichment.failed",
      actor_type: context.actor_type,
      actor_id: context.actor_id,
      resource_type: "import_enrichment",
      resource_id: enrichmentId,
      payload: { enrichment_id: enrichmentId, batch_id: input.batch_id, error: "batch_not_found" },
    }).catch(() => null);
    throw new Error(`import-enrichment: batch ${input.batch_id} not found.`);
  }

  // Operations whose target_type isn't contact/lead can't be enriched in v1 —
  // record an empty completion and exit cleanly rather than failing.
  const orgScope = batch.organization_id;
  const succeededRows = (
    await db
      .prepare(
        `SELECT id, target_record_id, target_record_type
           FROM import_batch_rows
          WHERE batch_id = ?
            AND organization_id = ?
            AND status = 'succeeded'
            AND target_record_id IS NOT NULL
            AND target_record_type IN ('contact','lead')`,
      )
      .bind(input.batch_id, orgScope)
      .all<SucceededImportRow>()
      .catch(() => ({ results: [] as SucceededImportRow[] }))
  ).results || [];

  // Partition requested operations into implemented vs skipped.
  const operationsRequested = Array.from(new Set(input.operations));
  const operationsToRun = operationsRequested.filter((op) => IMPLEMENTED_OPERATIONS.has(op));
  const skippedOperations: Array<{ operation: EnrichmentOperation; reason: string }> = operationsRequested
    .filter((op) => !IMPLEMENTED_OPERATIONS.has(op))
    .map((op) => ({ operation: op, reason: "not_implemented_in_v1" }));

  // 2. Idempotency check.
  const rowIdSig = succeededRows.map((r) => r.id).sort().join(",");
  const opsSig = operationsToRun.slice().sort().join(",");
  const contentHash = await sha256Hex(`${input.batch_id}|${opsSig}|${rowIdSig}`);

  const priorRun = await db
    .prepare(
      `SELECT id, operations_applied_json, duration_ms
         FROM import_enrichments
        WHERE batch_id = ? AND content_hash = ?
        LIMIT 1`,
    )
    .bind(input.batch_id, contentHash)
    .first<{ id: string; operations_applied_json: string; duration_ms: number }>()
    .catch(() => null);

  if (priorRun) {
    let priorApplied: OperationOutcome[] = [];
    try {
      const parsed = JSON.parse(priorRun.operations_applied_json) as unknown;
      if (Array.isArray(parsed)) priorApplied = parsed as OperationOutcome[];
    } catch {
      priorApplied = [];
    }
    return {
      enrichment_id: priorRun.id,
      operations_applied: priorApplied,
      duration_ms: priorRun.duration_ms || 0,
    };
  }

  // 3. Emit start event.
  await publish(context.env.DB, {
    organization_id: orgScope,
    event_type: "enrichment.requested",
    actor_type: context.actor_type,
    actor_id: context.actor_id,
    resource_type: "import_enrichment",
    resource_id: enrichmentId,
    payload: {
      enrichment_id: enrichmentId,
      batch_id: input.batch_id,
      operations: operationsRequested,
    },
  }).catch(() => null);

  // 4. Run each operation — failures of one op never abort the batch.
  const operationsApplied: OperationOutcome[] = [];
  for (const op of operationsToRun) {
    try {
      let outcome: OperationOutcome;
      switch (op) {
        case "normalize_names":
          outcome = await runNormalizeNames(context.env, succeededRows, orgScope);
          break;
        case "derive_company_from_email":
          outcome = await runDeriveCompanyFromEmail(context.env, succeededRows, orgScope);
          break;
        default:
          outcome = { operation: op, rows_touched: 0, rows_changed: 0 };
      }
      operationsApplied.push(outcome);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      skippedOperations.push({ operation: op, reason: `error: ${message}` });
    }
  }

  const durationMs = Date.now() - startedAtMs;

  // 5. Persist run row (idempotency anchor).
  await db
    .prepare(
      `INSERT OR IGNORE INTO import_enrichments
         (id, batch_id, organization_id, content_hash, operations_json,
          operations_applied_json, skipped_operations_json, duration_ms, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
    )
    .bind(
      enrichmentId,
      input.batch_id,
      orgScope,
      contentHash,
      JSON.stringify(operationsRequested),
      JSON.stringify(operationsApplied),
      JSON.stringify(skippedOperations),
      durationMs,
      nowIso(),
    )
    .run()
    .catch(() => null);

  // 6. Emit completion.
  await publish(context.env.DB, {
    organization_id: orgScope,
    event_type: "enrichment.completed",
    actor_type: context.actor_type,
    actor_id: context.actor_id,
    resource_type: "import_enrichment",
    resource_id: enrichmentId,
    payload: {
      enrichment_id: enrichmentId,
      batch_id: input.batch_id,
      operations_applied: operationsApplied,
      duration_ms: durationMs,
      skipped_operations: skippedOperations,
    },
  }).catch(() => null);

  return {
    enrichment_id: enrichmentId,
    operations_applied: operationsApplied,
    duration_ms: durationMs,
  };
}
