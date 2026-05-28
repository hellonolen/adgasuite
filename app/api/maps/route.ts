import { z } from "zod";
import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import {
  createDealFlow,
  createDealFlowEdge,
  createDealFlowNode,
  listDealFlows,
} from "@/lib/server/repository";
import { readStoredJsonPayload, storeJsonPayload } from "@/lib/server/payload-storage";
import { organizationIdForSession } from "@/lib/server/tenant";

const CENTER_X = 480;
const CENTER_Y = 320;
const RING_INNER = 280;
const RING_OUTER = 460;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// Mirror buildInitial() in components/suite/DealFlow.tsx so a new dealflow
// renders with the same ring layout as the hero on first open.
const STARTER_NODES: Array<{
  suffix: string;
  kind: "company" | "contact" | "bank" | "document" | "task" | "meeting" | "group" | "action";
  label: string;
  sublabel: string;
  status: "neutral" | "active" | "warning";
  ring: "inner" | "outer";
}> = [
  { suffix: "company",  kind: "company",  label: "Add company name",   sublabel: "Counterparty",   status: "neutral", ring: "inner" },
  { suffix: "contact",  kind: "contact",  label: "Add primary contact", sublabel: "Decision maker", status: "neutral", ring: "inner" },
  { suffix: "bank",     kind: "bank",     label: "Add capital source",  sublabel: "Lender / source",status: "neutral", ring: "inner" },
  { suffix: "people",   kind: "group",    label: "People",              sublabel: "Add contacts",   status: "neutral", ring: "inner" },
  { suffix: "document", kind: "document", label: "First document",      sublabel: "Add LOI / IOI",  status: "warning", ring: "outer" },
  { suffix: "task",     kind: "task",     label: "Next action",         sublabel: "Define step",    status: "active",  ring: "outer" },
  { suffix: "meeting",  kind: "meeting",  label: "First meeting",       sublabel: "Schedule",       status: "neutral", ring: "outer" },
];

async function seedStarterNodes(db: D1Database | undefined, mapId: string) {
  if (!db) return;
  const inner = STARTER_NODES.filter((n) => n.ring === "inner");
  const outer = STARTER_NODES.filter((n) => n.ring === "outer");

  const place = async (list: typeof STARTER_NODES, radius: number, offsetDeg: number) => {
    if (list.length === 0) return;
    const step = 360 / list.length;
    for (let i = 0; i < list.length; i += 1) {
      const node = list[i];
      const angle = offsetDeg + i * step;
      const pos = polar(CENTER_X, CENTER_Y, radius, angle);
      const nodeId = `${mapId}__${node.suffix}`;
      await createDealFlowNode(db, mapId, {
        id: nodeId,
        kind: node.kind,
        label: node.label,
        sublabel: node.sublabel,
        status: node.status,
        position_x: pos.x - 100,
        position_y: pos.y - 30,
      });
      const edgeSourceIsInner = node.ring === "inner";
      await createDealFlowEdge(db, mapId, {
        id: `${mapId}__edge_${node.suffix}`,
        source_node_id: edgeSourceIsInner ? nodeId : mapId,
        target_node_id: edgeSourceIsInner ? mapId : nodeId,
      });
    }
  };

  await place(inner, RING_INNER, 30);
  await place(outer, RING_OUTER, 0);
}

async function requireSession(request: Request) {
  const context = getRuntimeContext(request);
  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));
  if (!sessionUser && !context.user.isLocalAdminBypass) {
    return { context, sessionUser: null, unauthorized: true as const };
  }
  return { context, sessionUser, unauthorized: false as const };
}

export async function GET(request: Request) {
  const auth = await requireSession(request);
  if (auth.unauthorized) return errorJson("Authentication required.", 401);

  const organizationId = organizationIdForSession(auth.sessionUser);
  const rows = await listDealFlows(auth.context.env.DB, organizationId);
  const dealFlows = await Promise.all(rows.map(async (row) => {
    const payload = await readStoredJsonPayload<Record<string, unknown>>(
      auth.context.env,
      auth.context.env.DB,
      row.payload_r2_key,
      row.storage_object_id,
    );
    return payload ? { ...row, ...payload, id: row.id, organization_id: row.organization_id } : row;
  }));
  return json({ ok: true, dealFlows, maps: dealFlows });
}

const createSchema = z.object({
  name: z.string().min(1, "name is required").max(200),
  deal_id: z.string().min(1).max(200).optional().nullable(),
  template: z.string().min(1).max(80).optional().nullable(),
});

export async function POST(request: Request) {
  const auth = await requireSession(request);
  if (auth.unauthorized) return errorJson("Authentication required.", 401);
  const organizationId = organizationIdForSession(auth.sessionUser);

  const body = await readJson(request);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson("Invalid payload.", 400, parsed.error.flatten());
  }

  const record = await createDealFlow(auth.context.env.DB, {
    organization_id: organizationId,
    name: "DealFlow payload in R2",
    deal_id: parsed.data.deal_id ?? null,
    template: parsed.data.template ?? null,
    created_by_user_id: auth.sessionUser?.user_id || auth.context.user.email || null,
  });
  const payload = { ...record, name: parsed.data.name, deal_id: parsed.data.deal_id ?? null, template: parsed.data.template ?? null };
  const stored = auth.context.env.DB
    ? await storeJsonPayload({
        env: auth.context.env,
        db: auth.context.env.DB,
        organization_id: organizationId,
        resource_type: "dealflow",
        resource_id: record.id,
        payload,
        created_by: auth.sessionUser?.email || auth.context.user.email || null,
      })
    : null;
  if (auth.context.env.DB && stored) {
    await auth.context.env.DB.prepare("UPDATE maps SET payload_r2_key = ?, storage_object_id = ? WHERE id = ?")
      .bind(stored.r2_key, stored.storage_object_id, record.id)
      .run();
  }

  // Seed a populated starter canvas so the operator never sees an empty page.
  // Mirrors buildInitial() rings in components/suite/DealFlow.tsx.
  await seedStarterNodes(auth.context.env.DB, record.id);

  const dealFlow = { ...record, ...payload, payload_r2_key: stored?.r2_key || null, storage_object_id: stored?.storage_object_id || null };
  return json({ ok: true, dealFlow, map: dealFlow }, { status: 201 });
}
