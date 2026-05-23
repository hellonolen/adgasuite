import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";

// Stub settings persistence — Phase 10 demo. Accepts any panel payload and
// responds ok so the UI can wire up real save state without committing to a
// schema yet. Real persistence is tracked separately.
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

  return json({
    ok: true,
    panel: body.panel,
    saved_at: new Date().toISOString(),
    values: body.values ?? {},
  });
}

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));
  if (!sessionUser && !context.user.isLocalAdminBypass) {
    return errorJson("Authentication required.", 401);
  }
  return json({ ok: true, message: "Settings stub. POST { panel, values } to save." });
}
