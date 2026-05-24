import { z } from "zod";
import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { deleteMap, getMap, getMapEdges, getMapNodes, updateMap } from "@/lib/server/repository";
import { readJsonPayload, storeJsonPayload } from "@/lib/server/payload-storage";

const DEFAULT_ORG_ID = "org_adga_primary";

async function requireSession(request: Request) {
  const context = getRuntimeContext(request);
  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));
  if (!sessionUser && !context.user.isLocalAdminBypass) {
    return { context, sessionUser: null, unauthorized: true as const };
  }
  return { context, sessionUser, unauthorized: false as const };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(request);
  if (auth.unauthorized) return errorJson("Authentication required.", 401);

  const { id } = await params;
  const map = await getMap(auth.context.env.DB, id, DEFAULT_ORG_ID);
  if (!map) return errorJson("Map not found.", 404);

  const [nodes, edges] = await Promise.all([
    getMapNodes(auth.context.env.DB, id),
    getMapEdges(auth.context.env.DB, id),
  ]);

  const [mapPayload, hydratedNodes, hydratedEdges] = await Promise.all([
    readJsonPayload<Record<string, unknown>>(auth.context.env, map.payload_r2_key),
    Promise.all(nodes.map(async (node) => {
      const payload = await readJsonPayload<Record<string, unknown>>(auth.context.env, node.payload_r2_key);
      return payload ? { ...node, ...payload, id: node.id, map_id: node.map_id } : node;
    })),
    Promise.all(edges.map(async (edge) => {
      const payload = await readJsonPayload<Record<string, unknown>>(auth.context.env, edge.payload_r2_key);
      return payload ? { ...edge, ...payload, id: edge.id, map_id: edge.map_id } : edge;
    })),
  ]);

  return json({ ok: true, map: mapPayload ? { ...map, ...mapPayload, id: map.id, organization_id: map.organization_id } : map, nodes: hydratedNodes, edges: hydratedEdges });
}

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  deal_id: z.string().min(1).max(200).nullable().optional(),
  template: z.string().min(1).max(80).nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(request);
  if (auth.unauthorized) return errorJson("Authentication required.", 401);

  const { id } = await params;
  const body = await readJson(request);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return errorJson("Invalid payload.", 400, parsed.error.flatten());

  const existing = await getMap(auth.context.env.DB, id, DEFAULT_ORG_ID);
  if (!existing) return errorJson("Map not found.", 404);
  const existingPayload = await readJsonPayload<Record<string, unknown>>(auth.context.env, existing.payload_r2_key);
  const nextPayload = { ...(existingPayload || existing), ...parsed.data, id, organization_id: DEFAULT_ORG_ID };
  const stored = auth.context.env.DB
    ? await storeJsonPayload({
        env: auth.context.env,
        db: auth.context.env.DB,
        organization_id: DEFAULT_ORG_ID,
        resource_type: "map",
        resource_id: id,
        payload: nextPayload,
        created_by: auth.sessionUser?.email || auth.context.user.email || null,
      })
    : null;
  const updated = await updateMap(auth.context.env.DB, id, DEFAULT_ORG_ID, {
    name: parsed.data.name ? "Map payload in R2" : undefined,
    deal_id: parsed.data.deal_id,
    template: parsed.data.template,
  });
  if (!updated) return errorJson("Map not found.", 404);
  if (auth.context.env.DB && stored) {
    await auth.context.env.DB.prepare("UPDATE maps SET payload_r2_key = ?, storage_object_id = ? WHERE id = ?")
      .bind(stored.r2_key, stored.storage_object_id, id)
      .run();
  }
  return json({ ok: true, map: { ...updated, ...nextPayload, payload_r2_key: stored?.r2_key || updated.payload_r2_key, storage_object_id: stored?.storage_object_id || updated.storage_object_id } });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(request);
  if (auth.unauthorized) return errorJson("Authentication required.", 401);

  const { id } = await params;
  const removed = await deleteMap(auth.context.env.DB, id, DEFAULT_ORG_ID);
  if (!removed) return errorJson("Map not found.", 404);
  return json({ ok: true });
}
