import { errorJson, json } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { readStoredJsonPayload } from "@/lib/server/payload-storage";
import { organizationIdForSession } from "@/lib/server/tenant";

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));
  if (!sessionUser && !context.user.isLocalAdminBypass) {
    return errorJson("Authentication required.", 401);
  }
  const organizationId = organizationIdForSession(sessionUser);

  if (!context.env.DB) return json({ ok: true, leads: [] });

  try {
    const result = await context.env.DB.prepare(
      `SELECT * FROM leads
       WHERE organization_id = ? AND archived_at IS NULL
       ORDER BY COALESCE(received_at, created_at) DESC
       LIMIT 250`,
    )
      .bind(organizationId)
      .all();

    const leads = await Promise.all((result.results || []).map(async (row: Record<string, unknown>) => {
      const payload = await readStoredJsonPayload<Record<string, unknown>>(
        context.env,
        context.env.DB,
        String(row.payload_r2_key || ""),
        row.storage_object_id ? String(row.storage_object_id) : null,
      );
      return payload ? { ...row, ...payload, id: row.id, organization_id: row.organization_id } : row;
    }));

    return json({ ok: true, leads });
  } catch {
    return json({ ok: true, leads: [] });
  }
}
