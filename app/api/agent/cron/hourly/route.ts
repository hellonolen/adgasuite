import { json, errorJson } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { runHourlyMaintenance } from "@/lib/server/scheduler";

export const dynamic = "force-dynamic";

// Hourly maintenance endpoint hit by scheduled().
// Auth: shared-secret header injected by the worker's scheduled handler.
export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  const expected = context.env.SESSION_SECRET;
  const provided = request.headers.get("x-cron-secret");

  if (!expected || !provided || provided !== expected) {
    return errorJson("Forbidden", 403);
  }

  try {
    const result = await runHourlyMaintenance(context.env);
    return json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "scheduler error";
    return errorJson(message, 500);
  }
}
