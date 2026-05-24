import { z } from "zod";
import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { bulkUpdateDealFlowNodePositions, createDealFlowNode, getDealFlow } from "@/lib/server/repository";
import { storeJsonPayload } from "@/lib/server/payload-storage";

const DEFAULT_ORG_ID = "org_adga_primary";

const NODE_KINDS = ["deal", "group", "contact", "company", "bank", "document", "email", "website", "audio", "video", "task", "call", "call_step", "meeting", "journey_step", "invoice", "financial", "action"] as const;
const NODE_STATUSES = ["neutral", "active", "warning", "overdue", "done"] as const;

async function requireSessionAndDealFlow(request: Request, dealFlowId: string) {
  const context = getRuntimeContext(request);
  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));
  if (!sessionUser && !context.user.isLocalAdminBypass) {
    return { unauthorized: true as const };
  }
  const map = await getDealFlow(context.env.DB, dealFlowId, DEFAULT_ORG_ID);
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
  const auth = await requireSessionAndDealFlow(request, id);
  if ("unauthorized" in auth) return errorJson("Authentication required.", 401);
  if ("notFound" in auth) return errorJson("DealFlow not found.", 404);

  const body = await readJson(request);
  const parsed = createNodeSchema.safeParse(body);
  if (!parsed.success) return errorJson("Invalid payload.", 400, parsed.error.flatten());

  const node = await createDealFlowNode(auth.context.env.DB, id, {
    id: parsed.data.id,
    kind: parsed.data.kind,
    label: "DealFlow node payload in R2",
    sublabel: null,
    status: parsed.data.status ?? null,
    position_x: parsed.data.position_x,
    position_y: parsed.data.position_y,
    data: {},
  });
  const payload = { ...node, label: parsed.data.label, sublabel: parsed.data.sublabel ?? null, data: parsed.data.data || {} };
  const stored = auth.context.env.DB
    ? await storeJsonPayload({
        env: auth.context.env,
        db: auth.context.env.DB,
        organization_id: DEFAULT_ORG_ID,
        resource_type: "dealflow_node",
        resource_id: node.id,
        payload,
        created_by: auth.sessionUser?.email || auth.context.user.email || null,
      })
    : null;
  if (auth.context.env.DB && stored) {
    await auth.context.env.DB.prepare("UPDATE map_nodes SET payload_r2_key = ?, storage_object_id = ? WHERE id = ? AND map_id = ?")
      .bind(stored.r2_key, stored.storage_object_id, node.id, id)
      .run();
  }

  return json({ ok: true, node: { ...node, ...payload, payload_r2_key: stored?.r2_key || null, storage_object_id: stored?.storage_object_id || null } }, { status: 201 });
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
  const auth = await requireSessionAndDealFlow(request, id);
  if ("unauthorized" in auth) return errorJson("Authentication required.", 401);
  if ("notFound" in auth) return errorJson("DealFlow not found.", 404);

  const body = await readJson(request);
  const parsed = bulkPositionsSchema.safeParse(body);
  if (!parsed.success) return errorJson("Invalid payload.", 400, parsed.error.flatten());

  const updated = await bulkUpdateDealFlowNodePositions(auth.context.env.DB, id, parsed.data.positions);
  return json({ ok: true, updated });
}
