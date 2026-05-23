import { z } from "zod";
import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { bulkUpdateMapNodePositions, createMapNode, getMap } from "@/lib/server/repository";

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

const createNodeSchema = z.object({
  id: z.string().min(1).max(120).optional(),
  kind: z.enum(NODE_KINDS),
  label: z.string().min(1).max(200),
  sublabel: z.string().max(400).nullable().optional(),
  status: z.enum(NODE_STATUSES).nullable().optional(),
  position_x: z.number().finite(),
  position_y: z.number().finite(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSessionAndMap(request, id);
  if ("unauthorized" in auth) return errorJson("Authentication required.", 401);
  if ("notFound" in auth) return errorJson("Map not found.", 404);

  const body = await readJson(request);
  const parsed = createNodeSchema.safeParse(body);
  if (!parsed.success) return errorJson("Invalid payload.", 400, parsed.error.flatten());

  const node = await createMapNode(auth.context.env.DB, id, {
    id: parsed.data.id,
    kind: parsed.data.kind,
    label: parsed.data.label,
    sublabel: parsed.data.sublabel ?? null,
    status: parsed.data.status ?? null,
    position_x: parsed.data.position_x,
    position_y: parsed.data.position_y,
    data: parsed.data.data,
  });

  return json({ ok: true, node }, { status: 201 });
}

const bulkPositionsSchema = z.object({
  positions: z
    .array(
      z.object({
        id: z.string().min(1),
        position_x: z.number().finite(),
        position_y: z.number().finite(),
      }),
    )
    .min(1)
    .max(500),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSessionAndMap(request, id);
  if ("unauthorized" in auth) return errorJson("Authentication required.", 401);
  if ("notFound" in auth) return errorJson("Map not found.", 404);

  const body = await readJson(request);
  const parsed = bulkPositionsSchema.safeParse(body);
  if (!parsed.success) return errorJson("Invalid payload.", 400, parsed.error.flatten());

  const updated = await bulkUpdateMapNodePositions(auth.context.env.DB, id, parsed.data.positions);
  return json({ ok: true, updated });
}
