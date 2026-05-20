import { json } from "@/lib/server/http";
import { getRuntimeContext, requireAdmin } from "@/lib/server/runtime";

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

    return json({ ok: true, leads: result.results || [] });
  } catch {
    return json({ ok: true, leads: [] });
  }
}
