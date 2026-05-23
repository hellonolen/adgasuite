import { z } from "zod";
import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { deleteMapNode, getMap, updateMapNode } from "@/lib/server/repository";

const DEFAULT_ORG_ID = "org_adga_primary";

const NODE_KINDS = ["deal", "contact", "company", "document", "task", "call", "meeting", "action"] as const;
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

  const node = await updateMapNode(auth.context.env.DB, id, nodeId, parsed.data);
  if (!node) return errorJson("Node not found.", 404);
  return json({ ok: true, node });
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
