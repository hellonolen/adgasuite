import { z } from "zod";
import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { archiveDealFlowEdge, createDealFlowEdge, getDealFlow } from "@/lib/server/repository";
import { storeJsonPayload } from "@/lib/server/payload-storage";
import { organizationIdForSession } from "@/lib/server/tenant";

async function requireSessionAndDealFlow(request: Request, dealFlowId: string) {
  const context = getRuntimeContext(request);
  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));
  if (!sessionUser && !context.user.isLocalAdminBypass) {
    return { unauthorized: true as const };
  }
  const organizationId = organizationIdForSession(sessionUser);
  const map = await getDealFlow(context.env.DB, dealFlowId, organizationId);
  if (!map) return { notFound: true as const, context };
  return { context, sessionUser, map, organizationId };
}

const createEdgeSchema = z.object({
  id: z.string().min(1).max(120).optional(),
  source_node_id: z.string().min(1).max(120),
  target_node_id: z.string().min(1).max(120),
  label: z.string().max(200).nullable().optional(),
  style: z.record(z.string(), z.unknown()).nullable().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSessionAndDealFlow(request, id);
  if ("unauthorized" in auth) return errorJson("Authentication required.", 401);
  if ("notFound" in auth) return errorJson("DealFlow not found.", 404);

  const body = await readJson(request);
  const parsed = createEdgeSchema.safeParse(body);
  if (!parsed.success) return errorJson("Invalid payload.", 400, parsed.error.flatten());

  if (parsed.data.source_node_id === parsed.data.target_node_id) {
    return errorJson("source_node_id and target_node_id must differ.", 400);
  }

  const edge = await createDealFlowEdge(auth.context.env.DB, id, {
    id: parsed.data.id,
    source_node_id: parsed.data.source_node_id,
    target_node_id: parsed.data.target_node_id,
    label: null,
    style: null,
  });
  const payload = { ...edge, label: parsed.data.label ?? null, style: parsed.data.style ?? null };
  const stored = auth.context.env.DB
    ? await storeJsonPayload({
        env: auth.context.env,
        db: auth.context.env.DB,
        organization_id: auth.organizationId,
        resource_type: "dealflow_edge",
        resource_id: edge.id,
        payload,
        created_by: auth.sessionUser?.email || auth.context.user.email || null,
      })
    : null;
  if (auth.context.env.DB && stored) {
    await auth.context.env.DB.prepare("UPDATE map_edges SET payload_r2_key = ?, storage_object_id = ? WHERE id = ? AND map_id = ?")
      .bind(stored.r2_key, stored.storage_object_id, edge.id, id)
      .run();
  }
  return json({ ok: true, edge: { ...edge, ...payload, payload_r2_key: stored?.r2_key || null, storage_object_id: stored?.storage_object_id || null } }, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSessionAndDealFlow(request, id);
  if ("unauthorized" in auth) return errorJson("Authentication required.", 401);
  if ("notFound" in auth) return errorJson("DealFlow not found.", 404);

  const url = new URL(request.url);
  const edgeId = url.searchParams.get("edgeId");
  if (!edgeId) return errorJson("edgeId query param is required.", 400);

  const archived = await archiveDealFlowEdge(auth.context.env.DB, id, edgeId);
  if (!archived) return errorJson("Edge not found.", 404);
  return json({ ok: true, archived: true });
}
