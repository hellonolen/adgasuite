// GET /api/import/batches/[id]
//
// Returns a single import batch plus its rows (succeeded + failed + skipped + retried).
// Used by the import wizard's batch-detail drawer and by the retry route to
// build the failed-rows payload.

import { errorJson, json } from "@/lib/server/http";
import { getRuntimeContext, hydrateUserFromSession, requireUser } from "@/lib/server/runtime";
import { DEFAULT_ORG_ID, organizationIdForSession } from "@/lib/server/tenant";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface BatchRow {
  id: string;
  organization_id: string;
  actor_type: string;
  actor_id: string;
  source_type: string;
  source_file_url: string | null;
  source_reference: string | null;
  target_type: string;
  field_mapping_json: string | null;
  dedupe_strategy: string;
  status: string;
  rows_total: number;
  rows_succeeded: number;
  rows_failed: number;
  failure_summary_json: string | null;
  size_bytes: number | null;
  duration_ms: number | null;
  started_at: string;
  completed_at: string | null;
  error: string | null;
}

interface ImportBatchRowDb {
  id: string;
  batch_id: string;
  organization_id: string;
  row_number: number;
  status: string;
  raw_data_json: string | null;
  mapped_data_json: string | null;
  target_record_id: string | null;
  target_record_type: string | null;
  dedupe_match: string | null;
  failure_reason: string | null;
  failure_detail: string | null;
  created_at: string;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  try {
    const batch = await context.env.DB
      .prepare(
        `SELECT id, organization_id, actor_type, actor_id, source_type, source_file_url, source_reference,
                target_type, field_mapping_json, dedupe_strategy, status, rows_total, rows_succeeded,
                rows_failed, failure_summary_json, size_bytes, duration_ms, started_at, completed_at, error
           FROM import_batches
          WHERE id = ? AND organization_id = ?
          LIMIT 1`,
      )
      .bind(id, organizationId)
      .first<BatchRow>();

    if (!batch) return errorJson("Batch not found.", 404);

    const rowsResult = await context.env.DB
      .prepare(
        `SELECT id, batch_id, organization_id, row_number, status, raw_data_json, mapped_data_json,
                target_record_id, target_record_type, dedupe_match, failure_reason, failure_detail, created_at
           FROM import_batch_rows
          WHERE batch_id = ? AND organization_id = ?
          ORDER BY row_number ASC
          LIMIT 1000`,
      )
      .bind(id, organizationId)
      .all<ImportBatchRowDb>();

    return json({
      ok: true,
      batch: {
        ...batch,
        failure_summary: safeJson<Record<string, number>>(batch.failure_summary_json, {}),
        field_mapping: safeJson<Record<string, string>>(batch.field_mapping_json, {}),
      },
      rows: (rowsResult.results || []).map((row) => ({
        ...row,
        raw_data: safeJson<Record<string, string>>(row.raw_data_json, {}),
        mapped_data: safeJson<Record<string, string>>(row.mapped_data_json, {}),
      })),
    });
  } catch (error) {
    if (error instanceof Error && /no such table/i.test(error.message)) {
      return errorJson("Import tables not yet provisioned. Run migration 0025.", 503);
    }
    return errorJson(error instanceof Error ? error.message : "Failed to load batch.", 500);
  }
}

function safeJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
