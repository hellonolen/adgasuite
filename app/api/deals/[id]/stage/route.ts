import { z } from "zod";
import { errorJson, json, readJson } from "@/lib/server/http";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { getRuntimeContext } from "@/lib/server/runtime";
import { DEFAULT_ORG_ID } from "@/lib/server/tenant";
import { publish } from "@/lib/events/bus";

const PIPELINE_STAGES = ["lead", "qualify", "discover", "scope", "design", "close", "sign", "deliver", "expand", "won", "lost"] as const;

const stageSchema = z.object({
  stage: z.enum(PIPELINE_STAGES),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = getRuntimeContext(request);
  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));
  if (!sessionUser && !context.user.isLocalAdminBypass) {
    return errorJson("Authentication required.", 401);
  }
  if (!context.env.DB) return errorJson("Database not configured.", 503);

  const body = await readJson(request);
  const parsed = stageSchema.safeParse(body);
  if (!parsed.success) return errorJson("Invalid payload.", 400, parsed.error.flatten());

  const existing = await context.env.DB
    .prepare("SELECT stage FROM deals WHERE id = ? AND organization_id = ? LIMIT 1")
    .bind(id, DEFAULT_ORG_ID)
    .first<{ stage: string | null }>();
  if (!existing) return errorJson("Deal not found.", 404);

  const timestamp = new Date().toISOString();
  const result = await context.env.DB
    .prepare("UPDATE deals SET stage = ?, updated_at = ? WHERE id = ? AND organization_id = ?")
    .bind(parsed.data.stage, timestamp, id, DEFAULT_ORG_ID)
    .run();

  const changes = typeof result.meta === "object" && result.meta && "changes" in result.meta
    ? Number((result.meta as { changes?: unknown }).changes || 0)
    : 0;
  if (!changes) return errorJson("Deal not found.", 404);

  const previousStage = existing.stage || "";
  if (previousStage !== parsed.data.stage) {
    await publish(context.env.DB, {
      organization_id: DEFAULT_ORG_ID,
      event_type: "deal.stage_changed",
      actor_type: "user",
      actor_id: sessionUser?.email || context.user.email || null,
      resource_type: "deal",
      resource_id: id,
      payload: { deal_id: id, from: previousStage, to: parsed.data.stage },
    });
  }

  return json({ ok: true, deal: { id, stage: parsed.data.stage, updated_at: timestamp } });
}
