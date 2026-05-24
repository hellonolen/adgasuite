import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { organizationIdForSession } from "@/lib/server/tenant";

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));
  if (!sessionUser && !context.user.isLocalAdminBypass) {
    return errorJson("Authentication required.", 401);
  }

  const body = await readJson<{ panel?: string; values?: Record<string, unknown> }>(request);
  if (!body || typeof body.panel !== "string") {
    return errorJson("panel is required.", 422);
  }
  if (!/^[a-z0-9_.-]{1,80}$/i.test(body.panel)) {
    return errorJson("panel contains unsupported characters.", 422);
  }

  const organizationId = organizationIdForSession(sessionUser);
  const savedAt = new Date().toISOString();

  if (context.env.DB) {
    await context.env.DB
      .prepare(
        `INSERT INTO organization_settings (organization_id, panel, values_json, updated_by, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(organization_id, panel) DO UPDATE SET
           values_json = excluded.values_json,
           updated_by = excluded.updated_by,
           updated_at = excluded.updated_at`,
      )
      .bind(
        organizationId,
        body.panel,
        JSON.stringify(body.values ?? {}),
        sessionUser?.email || context.user.email,
        savedAt,
      )
      .run();
  }

  return json({
    ok: true,
    persisted: Boolean(context.env.DB),
    panel: body.panel,
    saved_at: savedAt,
    values: body.values ?? {},
  });
}

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));
  if (!sessionUser && !context.user.isLocalAdminBypass) {
    return errorJson("Authentication required.", 401);
  }
  if (!context.env.DB) return json({ ok: true, settings: [] });

  const organizationId = organizationIdForSession(sessionUser);
  const result = await context.env.DB
    .prepare("SELECT panel, values_json, updated_by, updated_at FROM organization_settings WHERE organization_id = ? ORDER BY panel ASC")
    .bind(organizationId)
    .all<{ panel: string; values_json: string; updated_by: string | null; updated_at: string }>();

  return json({
    ok: true,
    settings: (result.results || []).map((row) => ({
      panel: row.panel,
      values: safeJson(row.values_json),
      updated_by: row.updated_by,
      updated_at: row.updated_at,
    })),
  });
}

function safeJson(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}
