import { z } from "zod";
import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { deleteMapNode, getMap, updateMapNode } from "@/lib/server/repository";
import { readJsonPayload, storeJsonPayload } from "@/lib/server/payload-storage";

const DEFAULT_ORG_ID = "org_adga_primary";

const NODE_KINDS = ["deal", "group", "contact", "company", "document", "task", "call", "meeting", "action"] as const;
const NODE_STATUSES = ["neutral", "active", "warning", "overdue", "done"] as const;

async function requireSessionAndMap(request: Request, mapId: string) {
  const context = getRuntimeContext(request);
  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));
  if (!sessionUser && !context.user.isLocalAdminBypass) {
    return { unauthorized: true as const };
  }
  const map = await getMap(context.env.DB, mapId, DEFAULT_ORG_ID);
  if (!map) return { notFound: true as const, context };
  return { context, sessionUser, map };
}

const patchSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  sublabel: z.string().max(400).nullable().optional(),
  status: z.enum(NODE_STATUSES).nullable().optional(),
  position_x: z.number().finite().optional(),
  position_y: z.number().finite().optional(),
  kind: z.enum(NODE_KINDS).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; nodeId: string }> },
) {
  const { id, nodeId } = await params;
  const auth = await requireSessionAndMap(request, id);
  if ("unauthorized" in auth) return errorJson("Authentication required.", 401);
  if ("notFound" in auth) return errorJson("Map not found.", 404);

  const body = await readJson(request);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return errorJson("Invalid payload.", 400, parsed.error.flatten());

  const current = auth.map;
  void current;
  const existingRows = auth.context.env.DB
    ? await auth.context.env.DB.prepare("SELECT * FROM map_nodes WHERE id = ? AND map_id = ? LIMIT 1").bind(nodeId, id).first<Record<string, unknown>>()
    : null;
  const existingPayload = await readJsonPayload<Record<string, unknown>>(auth.context.env, String(existingRows?.payload_r2_key || ""));
  const nextPayload = { ...(existingPayload || existingRows || {}), ...parsed.data, id: nodeId, map_id: id };
  const stored = auth.context.env.DB
    ? await storeJsonPayload({
        env: auth.context.env,
        db: auth.context.env.DB,
        organization_id: DEFAULT_ORG_ID,
        resource_type: "map_node",
        resource_id: nodeId,
        payload: nextPayload,
        created_by: auth.sessionUser?.email || auth.context.user.email || null,
      })
    : null;
  const node = await updateMapNode(auth.context.env.DB, id, nodeId, {
    ...parsed.data,
    label: parsed.data.label ? "Node payload in R2" : undefined,
    sublabel: parsed.data.sublabel === undefined ? undefined : null,
    data: parsed.data.data ? {} : undefined,
  });
  if (!node) return errorJson("Node not found.", 404);
  if (auth.context.env.DB && stored) {
    await auth.context.env.DB.prepare("UPDATE map_nodes SET payload_r2_key = ?, storage_object_id = ? WHERE id = ? AND map_id = ?")
      .bind(stored.r2_key, stored.storage_object_id, nodeId, id)
      .run();
  }
  return json({ ok: true, node: { ...node, ...nextPayload, payload_r2_key: stored?.r2_key || node.payload_r2_key, storage_object_id: stored?.storage_object_id || node.storage_object_id } });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; nodeId: string }> },
) {
  const { id, nodeId } = await params;
  const auth = await requireSessionAndMap(request, id);
  if ("unauthorized" in auth) return errorJson("Authentication required.", 401);
  if ("notFound" in auth) return errorJson("Map not found.", 404);

  const removed = await deleteMapNode(auth.context.env.DB, id, nodeId);
  if (!removed) return errorJson("Node not found.", 404);
  return json({ ok: true });
}
