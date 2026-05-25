import { z } from "zod";
import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { archiveDealFlow, getDealFlow, getDealFlowEdges, getDealFlowNodes, updateDealFlow } from "@/lib/server/repository";
import { readStoredJsonPayload, storeJsonPayload } from "@/lib/server/payload-storage";
import { organizationIdForSession } from "@/lib/server/tenant";

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
  const organizationId = organizationIdForSession(auth.sessionUser);

  const { id } = await params;
  const dealFlow = await getDealFlow(auth.context.env.DB, id, organizationId);
  if (!dealFlow) return errorJson("DealFlow not found.", 404);

  const [nodes, edges] = await Promise.all([
    getDealFlowNodes(auth.context.env.DB, id),
    getDealFlowEdges(auth.context.env.DB, id),
  ]);

  const [mapPayload, hydratedNodes, hydratedEdges] = await Promise.all([
    readStoredJsonPayload<Record<string, unknown>>(auth.context.env, auth.context.env.DB, dealFlow.payload_r2_key, dealFlow.storage_object_id),
    Promise.all(nodes.map(async (node) => {
      const payload = await readStoredJsonPayload<Record<string, unknown>>(auth.context.env, auth.context.env.DB, node.payload_r2_key, node.storage_object_id);
      return payload ? { ...node, ...payload, id: node.id, map_id: node.map_id } : node;
    })),
    Promise.all(edges.map(async (edge) => {
      const payload = await readStoredJsonPayload<Record<string, unknown>>(auth.context.env, auth.context.env.DB, edge.payload_r2_key, edge.storage_object_id);
      return payload ? { ...edge, ...payload, id: edge.id, map_id: edge.map_id } : edge;
    })),
  ]);

  const hydratedDealFlow = mapPayload ? { ...dealFlow, ...mapPayload, id: dealFlow.id, organization_id: dealFlow.organization_id } : dealFlow;
  return json({ ok: true, dealFlow: hydratedDealFlow, map: hydratedDealFlow, nodes: hydratedNodes, edges: hydratedEdges });
}

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  deal_id: z.string().min(1).max(200).nullable().optional(),
  template: z.string().min(1).max(80).nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(request);
  if (auth.unauthorized) return errorJson("Authentication required.", 401);
  const organizationId = organizationIdForSession(auth.sessionUser);

  const { id } = await params;
  const body = await readJson(request);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return errorJson("Invalid payload.", 400, parsed.error.flatten());

  const existing = await getDealFlow(auth.context.env.DB, id, organizationId);
  if (!existing) return errorJson("DealFlow not found.", 404);
  const existingPayload = await readStoredJsonPayload<Record<string, unknown>>(auth.context.env, auth.context.env.DB, existing.payload_r2_key, existing.storage_object_id);
  const nextPayload = { ...(existingPayload || existing), ...parsed.data, id, organization_id: organizationId };
  const stored = auth.context.env.DB
    ? await storeJsonPayload({
        env: auth.context.env,
        db: auth.context.env.DB,
        organization_id: organizationId,
        resource_type: "dealflow",
        resource_id: id,
        payload: nextPayload,
        created_by: auth.sessionUser?.email || auth.context.user.email || null,
      })
    : null;
  const updated = await updateDealFlow(auth.context.env.DB, id, organizationId, {
    name: parsed.data.name,
    deal_id: parsed.data.deal_id,
    template: parsed.data.template,
  });
  if (!updated) return errorJson("DealFlow not found.", 404);
  if (auth.context.env.DB && stored) {
    await auth.context.env.DB.prepare("UPDATE maps SET payload_r2_key = ?, storage_object_id = ? WHERE id = ?")
      .bind(stored.r2_key, stored.storage_object_id, id)
      .run();
  }
  const dealFlow = { ...updated, ...nextPayload, payload_r2_key: stored?.r2_key || updated.payload_r2_key, storage_object_id: stored?.storage_object_id || updated.storage_object_id };
  return json({ ok: true, dealFlow, map: dealFlow });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(request);
  if (auth.unauthorized) return errorJson("Authentication required.", 401);
  const organizationId = organizationIdForSession(auth.sessionUser);

  const { id } = await params;
  const archived = await archiveDealFlow(auth.context.env.DB, id, organizationId);
  if (!archived) return errorJson("DealFlow not found.", 404);
  return json({ ok: true, archived: true });
}
