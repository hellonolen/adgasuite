import { json } from "@/lib/server/http";
import { getRuntimeContext, requireAdmin } from "@/lib/server/runtime";
import { readJsonPayload } from "@/lib/server/payload-storage";

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  requireAdmin(context);

  if (!context.env.DB) return json({ ok: true, leads: [] });

  try {
    const result = await context.env.DB.prepare(
      `SELECT * FROM leads
       WHERE organization_id = ? AND archived_at IS NULL
       ORDER BY COALESCE(received_at, created_at) DESC
       LIMIT 250`,
    )
      .bind("org_adga_primary")
      .all();

    const leads = await Promise.all((result.results || []).map(async (row: Record<string, unknown>) => {
      const payload = await readJsonPayload<Record<string, unknown>>(context.env, String(row.payload_r2_key || ""));
      return payload ? { ...row, ...payload, id: row.id, organization_id: row.organization_id } : row;
    }));

    return json({ ok: true, leads });
  } catch {
    return json({ ok: true, leads: [] });
  }
}
