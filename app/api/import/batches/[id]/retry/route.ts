// POST /api/import/batches/[id]/retry
//
// Re-runs the failed rows of an existing import batch via the csv-import skill.
// Strategy:
//   1. Load the original batch (target_type, field_mapping, dedupe_strategy).
//   2. Load the failed rows (raw_data_json).
//   3. Reconstruct a paste-style payload using the original raw_data headers.
//   4. Call csv-import skill with retry_of_batch_id reference.
//   5. Mark the original failed rows status='retried' so the dead-letter shrinks.
//
// Idempotent: re-running multiple times keeps marking the same source rows
// as 'retried' (no double-write to target records because dedupe_strategy
// is preserved).

import { errorJson, json } from "@/lib/server/http";
import { getRuntimeContext, hydrateUserFromSession, requireUser } from "@/lib/server/runtime";
import { DEFAULT_ORG_ID, organizationIdForSession, resolveTenantSession } from "@/lib/server/tenant";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { callSkill } from "@/lib/agents/skill-registry";
import "@/lib/agents/handlers"; // ensure registry is hydrated before dispatch
import { nowIso } from "@/lib/server/id";
import type { CsvImportInput, CsvImportOutput } from "@/lib/agents/handlers/csv-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface BatchRow {
  id: string;
  target_type: "contacts" | "leads" | "deals" | "organizations";
  source_type: "csv" | "paste" | "hubspot" | "pipedrive" | "salesforce" | "notion" | "airtable";
  field_mapping_json: string | null;
  dedupe_strategy: CsvImportInput["dedupe_strategy"];
}

interface FailedRow {
  id: string;
  raw_data_json: string | null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = getRuntimeContext(request);
  await hydrateUserFromSession(context, request);
  try {
    requireUser(context);
  } catch (response) {
    if (response instanceof Response) return response;
    return errorJson("Unauthorized", 401);
  }

  if (!context.env.DB) return errorJson("Database not configured.", 503);

  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));
  const organizationId = organizationIdForSession(sessionUser, DEFAULT_ORG_ID);
  const tenant = await resolveTenantSession(context, request);

  try {
    const batch = await context.env.DB
      .prepare(
        `SELECT id, target_type, source_type, field_mapping_json, dedupe_strategy
           FROM import_batches
          WHERE id = ? AND organization_id = ?
          LIMIT 1`,
      )
      .bind(id, organizationId)
      .first<BatchRow>();

    if (!batch) return errorJson("Batch not found.", 404);

    const failedRowsResult = await context.env.DB
      .prepare(
        `SELECT id, raw_data_json
           FROM import_batch_rows
          WHERE batch_id = ? AND organization_id = ? AND status = 'failed'
          ORDER BY row_number ASC
          LIMIT 5000`,
      )
      .bind(id, organizationId)
      .all<FailedRow>();

    const failedRows = failedRowsResult.results || [];
    if (failedRows.length === 0) {
      return errorJson("No failed rows to retry.", 400);
    }

    const fieldMapping = safeJson<Record<string, string>>(batch.field_mapping_json, {});
    const { headers, rows: rawRows } = rebuildPastePayload(failedRows);

    if (headers.length === 0 || rawRows.length === 0) {
      return errorJson("Failed rows have no recoverable raw data.", 400);
    }

    const callerEmail = tenant?.email || context.user.email || "system";
    const result = await callSkill<CsvImportInput, CsvImportOutput>(
      {
        env: context.env,
        organization_id: organizationId,
        actor_type: "user",
        actor_id: callerEmail,
      },
      "csv-import",
      {
        source_type: "paste",
        target_type: batch.target_type,
        payload: { paste: { rows: [headers, ...rawRows], has_header: true } },
        field_mapping: fieldMapping,
        dedupe_strategy: batch.dedupe_strategy,
      },
    );

    if (!result.ok || !result.data) {
      return errorJson(result.error || "Retry failed.", 500);
    }

    // Mark original failed rows as 'retried' so the dead-letter shrinks. We do
    // this for ALL failed rows we just tried — the new batch's row outcomes are
    // the source of truth for whether each retry actually succeeded.
    const updatedAt = nowIso();
    for (const row of failedRows) {
      await context.env.DB
        .prepare(
          `UPDATE import_batch_rows
              SET status = 'retried', failure_detail = COALESCE(failure_detail, '') || ' | retried_in:' || ?, created_at = ?
            WHERE id = ? AND organization_id = ?`,
        )
        .bind(result.data.batch_id, updatedAt, row.id, organizationId)
        .run()
        .catch(() => null);
    }

    return json({ ok: true, batch: result.data, retried_row_count: failedRows.length });
  } catch (error) {
    if (error instanceof Error && /no such table/i.test(error.message)) {
      return errorJson("Import tables not yet provisioned. Run migration 0025.", 503);
    }
    return errorJson(error instanceof Error ? error.message : "Retry failed.", 500);
  }
}

function rebuildPastePayload(failedRows: FailedRow[]): { headers: string[]; rows: string[][] } {
  // Use the first non-empty raw_data row to derive headers (all rows share the
  // same source columns within a batch). Then reconstruct each row in the
  // header column order.
  let headers: string[] = [];
  const parsedRows: Array<Record<string, string>> = [];
  for (const row of failedRows) {
    const raw = safeJson<Record<string, string>>(row.raw_data_json, {});
    parsedRows.push(raw);
    if (headers.length === 0) headers = Object.keys(raw);
  }
  const rows = parsedRows.map((raw) => headers.map((header) => raw[header] ?? ""));
  return { headers, rows };
}

function safeJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
