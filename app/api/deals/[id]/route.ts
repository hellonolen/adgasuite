import { z } from "zod";

import { errorJson, json, readJson } from "@/lib/server/http";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { readJsonPayload, storeJsonPayload } from "@/lib/server/payload-storage";
import { getRuntimeContext } from "@/lib/server/runtime";
import { DEFAULT_ORG_ID } from "@/lib/server/tenant";

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  stage: z.string().min(1).max(80).optional(),
});

interface DealRow {
  id: string;
  organization_id: string;
  name: string | null;
  company: string | null;
  stage: string | null;
  payload_r2_key: string | null;
  storage_object_id: string | null;
  updated_at: string | null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = getRuntimeContext(request);
  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));
  if (!sessionUser && !context.user.isLocalAdminBypass) {
    return errorJson("Authentication required.", 401);
  }
  if (!context.env.DB) return errorJson("Database not configured.", 503);

  const body = await readJson(request);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return errorJson("Invalid payload.", 400, parsed.error.flatten());

  const existing = await context.env.DB
    .prepare("SELECT id, organization_id, name, company, stage, payload_r2_key, storage_object_id, updated_at FROM deals WHERE id = ? AND organization_id = ? LIMIT 1")
    .bind(id, DEFAULT_ORG_ID)
    .first<DealRow>();
  if (!existing) return errorJson("Deal not found.", 404);

  const existingPayload = await readJsonPayload<Record<string, unknown>>(context.env, existing.payload_r2_key);
  const timestamp = new Date().toISOString();
  const nextPayload = {
    ...(existingPayload || {}),
    id,
    organization_id: DEFAULT_ORG_ID,
    name: parsed.data.name ?? existingPayload?.name ?? existing.name ?? id,
    company: existingPayload?.company ?? existing.company ?? null,
    stage: parsed.data.stage ?? existingPayload?.stage ?? existing.stage ?? "lead",
    updated_at: timestamp,
  };

  const stored = await storeJsonPayload({
    env: context.env,
    db: context.env.DB,
    organization_id: DEFAULT_ORG_ID,
    resource_type: "deal",
    resource_id: id,
    payload: nextPayload,
    created_by: sessionUser?.email || context.user.email || null,
  });

  await context.env.DB
    .prepare(
      `UPDATE deals
       SET name = ?, stage = ?, payload_r2_key = ?, storage_object_id = ?, updated_at = ?
       WHERE id = ? AND organization_id = ?`,
    )
    .bind(
      `Deal ${id.slice(-8)}`,
      String(nextPayload.stage),
      stored.r2_key,
      stored.storage_object_id,
      timestamp,
      id,
      DEFAULT_ORG_ID,
    )
    .run();

  return json({
    ok: true,
    deal: {
      ...existing,
      ...nextPayload,
      payload_r2_key: stored.r2_key,
      storage_object_id: stored.storage_object_id,
    },
  });
}
