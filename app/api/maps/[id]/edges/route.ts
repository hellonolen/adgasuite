import { z } from "zod";
import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { createMapEdge, deleteMapEdge, getMap } from "@/lib/server/repository";

const DEFAULT_ORG_ID = "org_adga_primary";

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

const createEdgeSchema = z.object({
  id: z.string().min(1).max(120).optional(),
  source_node_id: z.string().min(1).max(120),
  target_node_id: z.string().min(1).max(120),
  label: z.string().max(200).nullable().optional(),
  style: z.record(z.string(), z.unknown()).nullable().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSessionAndMap(request, id);
  if ("unauthorized" in auth) return errorJson("Authentication required.", 401);
  if ("notFound" in auth) return errorJson("Map not found.", 404);

  const body = await readJson(request);
  const parsed = createEdgeSchema.safeParse(body);
  if (!parsed.success) return errorJson("Invalid payload.", 400, parsed.error.flatten());

  if (parsed.data.source_node_id === parsed.data.target_node_id) {
    return errorJson("source_node_id and target_node_id must differ.", 400);
  }

  const edge = await createMapEdge(auth.context.env.DB, id, parsed.data);
  return json({ ok: true, edge }, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSessionAndMap(request, id);
  if ("unauthorized" in auth) return errorJson("Authentication required.", 401);
  if ("notFound" in auth) return errorJson("Map not found.", 404);

  const url = new URL(request.url);
  const edgeId = url.searchParams.get("edgeId");
  if (!edgeId) return errorJson("edgeId query param is required.", 400);

  const removed = await deleteMapEdge(auth.context.env.DB, id, edgeId);
  if (!removed) return errorJson("Edge not found.", 404);
  return json({ ok: true });
}
