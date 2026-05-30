// GET /api/import/batches — list the caller's import batches.

import { errorJson, json } from "@/lib/server/http";
import { getRuntimeContext, hydrateUserFromSession, requireUser } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { DEFAULT_ORG_ID, organizationIdForSession } from "@/lib/server/tenant";

interface BatchRow {
  id: string;
  source_type: string;
  target_type: string;
  status: string;
  rows_total: number;
  rows_succeeded: number;
  rows_failed: number;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  actor_id: string;
}

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  await hydrateUserFromSession(context, request);
  try {
    requireUser(context);
  } catch (response) {
    if (response instanceof Response) return response;
    return errorJson("Unauthorized", 401);
  }
  if (!context.env.DB) return json({ ok: true, batches: [] });

  const session = await validateSession(context.env.DB, readSessionCookie(request));
  const organizationId = organizationIdForSession(session, DEFAULT_ORG_ID);

  const rows = await context.env.DB
    .prepare(
      `SELECT id, source_type, target_type, status, rows_total, rows_succeeded,
              rows_failed, started_at, completed_at, duration_ms, actor_id
         FROM import_batches
        WHERE organization_id = ?
        ORDER BY started_at DESC
        LIMIT 50`,
    )
    .bind(organizationId)
    .all<BatchRow>()
    .catch(() => ({ results: [] as BatchRow[] }));

  return json({ ok: true, batches: rows.results || [] });
}
