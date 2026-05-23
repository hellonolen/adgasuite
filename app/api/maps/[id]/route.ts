import { z } from "zod";
import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { deleteMap, getMap, getMapEdges, getMapNodes, updateMap } from "@/lib/server/repository";

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

  return json({ ok: true, map, nodes, edges });
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

  const updated = await updateMap(auth.context.env.DB, id, DEFAULT_ORG_ID, parsed.data);
  if (!updated) return errorJson("Map not found.", 404);
  return json({ ok: true, map: updated });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(request);
  if (auth.unauthorized) return errorJson("Authentication required.", 401);

  const { id } = await params;
  const removed = await deleteMap(auth.context.env.DB, id, DEFAULT_ORG_ID);
  if (!removed) return errorJson("Map not found.", 404);
  return json({ ok: true });
}
