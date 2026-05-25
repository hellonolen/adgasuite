import { notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  type DealFlowDeal,
  type DealFlowEntity,
  type DealFlowInitialEdge,
  type DealFlowInitialNode,
} from "@/components/suite/DealFlow";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { redirect } from "next/navigation";
import { createDealFlow, createDealFlowEdge, createDealFlowNode, getDealFlow, getDealFlowEdges, getDealFlowNodes } from "@/lib/server/repository";
import DealFlowClient from "@/components/suite/workspaces/DealFlowClient";
import { readJsonPayload, storeJsonPayload } from "@/lib/server/payload-storage";
import { organizationIdForSession } from "@/lib/server/tenant";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface DealRow {
  id: string;
  name: string;
  company: string | null;
  value_cents: number | null;
  stage: string | null;
  probability: number | null;
  expected_close_at: string | null;
  contact_id: string | null;
}

interface ContactRow {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  company: string | null;
}

interface DocumentRow {
  id: string;
  title: string | null;
  status: string | null;
  type: string | null;
}

interface TaskRow {
  id: string;
  title: string | null;
  status: string | null;
  priority: string | null;
  due_at: string | null;
}

interface CalendarRow {
  id: string;
  title: string | null;
  starts_at: string | null;
  status: string | null;
}

type LocalDemoDealFlow = {
  deal: DealFlowDeal;
  entities: DealFlowEntity[];
};

const LOCAL_DEMO_DEALFLOWS: Record<string, LocalDemoDealFlow> = {
  "DEAL-621810": {
    deal: {
      id: "DEAL-621810",
      name: "Meridian Cold Chain Acquisition",
      stage: "Closing",
      value: "$18.4M",
      nextAction: "Confirm seller counsel markups",
    },
    entities: [
      { id: "company:meridian", kind: "company", label: "Meridian Cold Chain", sublabel: "Seller · logistics platform", status: "active" },
      { id: "contact:ari", kind: "contact", label: "Ari Boone", sublabel: "Primary contact", status: "active" },
      { id: "bank:lender", kind: "bank", label: "Senior lender group", sublabel: "Debt package", status: "warning" },
      { id: "doc:counsel", kind: "document", label: "Seller counsel markups", sublabel: "Needs response", status: "overdue" },
      { id: "call:closing", kind: "call", label: "Closing call", sublabel: "Nine-step call prep", status: "active" },
      { id: "task:markups", kind: "task", label: "Confirm markups", sublabel: "Owner: legal", status: "warning" },
      { id: "invoice:success", kind: "invoice", label: "Success fee path", sublabel: "Ready after signature", status: "neutral" },
      { id: "group:people", kind: "group", label: "People", sublabel: "14 associated records", status: "neutral", childKind: "contact", childrenCount: 14 },
      { id: "group:diligence", kind: "group", label: "Files & diligence", sublabel: "Contracts, CIM, models", status: "active", childKind: "document", childrenCount: 9 },
    ],
  },
  "DEAL-847214": {
    deal: { id: "DEAL-847214", name: "Heliograph Series C Extension", stage: "Negotiation", value: "$7.2M", nextAction: "Send revised allocation" },
    entities: [
      { id: "company:heliograph", kind: "company", label: "Heliograph", sublabel: "Capital raise", status: "active" },
      { id: "contact:mira", kind: "contact", label: "Mira Sen", sublabel: "Investor relations", status: "active" },
      { id: "doc:allocation", kind: "document", label: "Revised allocation memo", sublabel: "Draft", status: "warning" },
      { id: "task:send", kind: "task", label: "Send revised allocation", status: "active" },
      { id: "group:investors", kind: "group", label: "Investor group", sublabel: "11 associated records", status: "neutral", childKind: "contact", childrenCount: 11 },
    ],
  },
  "DEAL-935672": {
    deal: { id: "DEAL-935672", name: "Tessellate Series B Participation", stage: "At Risk", value: "$3.5M", nextAction: "Recover sponsor response" },
    entities: [
      { id: "company:tessellate", kind: "company", label: "Tessellate", sublabel: "Series B", status: "warning" },
      { id: "contact:noah", kind: "contact", label: "Noah Rhee", sublabel: "Sponsor", status: "overdue" },
      { id: "email:sponsor", kind: "email", label: "Sponsor response thread", sublabel: "No response", status: "overdue" },
      { id: "task:recover", kind: "task", label: "Recover sponsor response", status: "overdue" },
      { id: "group:diligence", kind: "group", label: "Diligence", sublabel: "9 associated records", status: "warning", childKind: "document", childrenCount: 9 },
    ],
  },
  "DEAL-471906": {
    deal: { id: "DEAL-471906", name: "Quorum Energy Joint Venture", stage: "Proposal", value: "$11M", nextAction: "Align JV timeline" },
    entities: [
      { id: "company:quorum", kind: "company", label: "Quorum Energy", sublabel: "JV counterparty", status: "active" },
      { id: "contact:magnus", kind: "contact", label: "Magnus Bell", sublabel: "Commercial lead", status: "active" },
      { id: "doc:jv", kind: "document", label: "JV timeline proposal", status: "warning" },
      { id: "meeting:jv", kind: "meeting", label: "Timeline alignment call", status: "active" },
    ],
  },
  "DEAL-783540": {
    deal: { id: "DEAL-783540", name: "Kestrel Defense Procurement", stage: "Contract", value: "$2.8M", nextAction: "Route security exhibit" },
    entities: [
      { id: "company:kestrel", kind: "company", label: "Kestrel Defense", sublabel: "Procurement", status: "active" },
      { id: "contact:inez", kind: "contact", label: "Inez Park", sublabel: "Security review", status: "active" },
      { id: "doc:security", kind: "document", label: "Security exhibit", sublabel: "Routing", status: "warning" },
      { id: "task:route", kind: "task", label: "Route security exhibit", status: "active" },
    ],
  },
  "DEAL-659128": {
    deal: { id: "DEAL-659128", name: "Larkfield Capital Strategic Partnership", stage: "New", value: "$5.0M" },
    entities: [
      { id: "company:larkfield", kind: "company", label: "Larkfield Capital", sublabel: "Strategic partnership", status: "neutral" },
      { id: "contact:jon", kind: "contact", label: "Jon Ives", sublabel: "Partner", status: "neutral" },
      { id: "task:next", kind: "task", label: "Define next action", status: "warning" },
      { id: "group:workstream", kind: "group", label: "Workstreams", sublabel: "6 associated records", status: "neutral", childKind: "task", childrenCount: 6 },
    ],
  },
};

function formatCurrency(cents: number | null | undefined) {
  if (!cents || cents <= 0) return undefined;
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(0)}k`;
  return `$${dollars.toFixed(0)}`;
}

function formatContactName(row: ContactRow) {
  return row.full_name?.trim() || `${row.first_name || ""} ${row.last_name || ""}`.trim() || "Unnamed contact";
}

function statusForTask(row: TaskRow): "neutral" | "overdue" | "active" | "done" {
  if (row.status === "completed") return "done";
  if (row.due_at && new Date(row.due_at).getTime() < Date.now()) return "overdue";
  if (row.priority === "high") return "active";
  return "neutral";
}

function statusForDocument(row: DocumentRow): "neutral" | "done" | "active" {
  if (row.status === "signed" || row.status === "sent") return "done";
  if (row.status === "draft") return "active";
  return "neutral";
}

function statusForMeeting(row: CalendarRow): "neutral" | "active" | "warning" {
  if (!row.starts_at) return "neutral";
  const t = new Date(row.starts_at).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  if (t < Date.now()) return "neutral";
  if (t - Date.now() < dayMs) return "warning";
  return "active";
}

export default async function DealDetailPage({ params }: PageProps) {
  const { id } = await params;
  const headerList = await headers();
  const cookieHeader = headerList.get("cookie");
  const host = headerList.get("x-forwarded-host") || headerList.get("host") || "internal.local";
  const proto = headerList.get("x-forwarded-proto") || "https";
  const request = new Request(`${proto}://${host}/suite/dealflow/${encodeURIComponent(id)}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
  const context = getRuntimeContext(request);
  const db = context.env.DB;
  const isDev = process.env.NODE_ENV !== "production";

  if (!db) {
    if (isDev) {
      return renderLocalDemoOrUnavailable(id, "Demo data · no D1 binding configured locally.");
    }
    return (
      <main className="min-h-screen bg-[#f9f7f4] p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[var(--rule,#e8e4de)] bg-white p-8">
          <h1 className="text-xl font-semibold text-[#0d0c0a]">Database not configured</h1>
          <p className="mt-2 text-sm text-[#6b6760]">
            Deal detail pages require a Cloudflare D1 binding. Configure DB in your environment to view this deal.
          </p>
        </div>
      </main>
    );
  }

  const sessionUser = await validateSession(db, readSessionCookie(request));
  if (!sessionUser && !context.user.isLocalAdminBypass) {
    redirect(`/login?redirect=/suite/dealflow/${encodeURIComponent(id)}`);
  }
  const organizationId = organizationIdForSession(sessionUser);

  // 1. Try the persisted canvas path first. Storage IDs may still use the legacy `map_*` prefix.
  const mapRecord = await getDealFlow(db, id, organizationId);
  if (mapRecord) {
    const [mapPayload, nodeRows, edgeRows] = await Promise.all([
      readJsonPayload<Record<string, unknown>>(context.env, mapRecord.payload_r2_key),
      getDealFlowNodes(db, mapRecord.id),
      getDealFlowEdges(db, mapRecord.id),
    ]);

    const [hydratedNodes, hydratedEdges] = await Promise.all([
      Promise.all(
        nodeRows.map(async (node) => {
          const payload = await readJsonPayload<Record<string, unknown>>(context.env, node.payload_r2_key);
          return payload ? { ...node, ...payload, id: node.id, map_id: node.map_id } : node;
        }),
      ),
      Promise.all(
        edgeRows.map(async (edge) => {
          const payload = await readJsonPayload<Record<string, unknown>>(context.env, edge.payload_r2_key);
          return payload ? { ...edge, ...payload, id: edge.id, map_id: edge.map_id } : edge;
        }),
      ),
    ]);

    const hydratedMap = mapPayload
      ? { ...mapRecord, ...mapPayload, id: mapRecord.id, organization_id: mapRecord.organization_id }
      : mapRecord;

    const deal: DealFlowDeal = {
      id: mapRecord.id,
      name: String(hydratedMap.name || mapRecord.id),
      stage: String(hydratedMap.template || "Deal"),
    };

    const initialNodes: DealFlowInitialNode[] = hydratedNodes.map((node) => ({
      id: node.id,
      kind: node.kind === "deal" ? "action" : (node.kind as DealFlowEntity["kind"]),
      label: String(node.label || "Untitled"),
      sublabel: node.sublabel ? String(node.sublabel) : undefined,
      status: (node.status as DealFlowEntity["status"]) || "neutral",
      position: { x: Number(node.position_x || 0), y: Number(node.position_y || 0) },
    }));

    const initialEdges: DealFlowInitialEdge[] = hydratedEdges.map((edge) => ({
      id: edge.id,
      source: edge.source_node_id,
      target: edge.target_node_id,
      label: edge.label ? String(edge.label) : undefined,
    }));

    return renderMap(deal, initialNodes, initialEdges, mapRecord.id);
  }

  const dealLinkedMap = await db
    .prepare("SELECT * FROM maps WHERE deal_id = ? AND organization_id = ? AND archived_at IS NULL ORDER BY updated_at DESC LIMIT 1")
    .bind(id, organizationId)
    .first<Record<string, unknown>>()
    .catch(() => null);
  if (dealLinkedMap?.id) {
    const map = await getDealFlow(db, String(dealLinkedMap.id), organizationId);
    if (map) {
      const [mapPayload, nodeRows, edgeRows] = await Promise.all([
        readJsonPayload<Record<string, unknown>>(context.env, map.payload_r2_key),
        getDealFlowNodes(db, map.id),
        getDealFlowEdges(db, map.id),
      ]);
      const [hydratedNodes, hydratedEdges] = await Promise.all([
        Promise.all(
          nodeRows.map(async (node) => {
            const payload = await readJsonPayload<Record<string, unknown>>(context.env, node.payload_r2_key);
            return payload ? { ...node, ...payload, id: node.id, map_id: node.map_id } : node;
          }),
        ),
        Promise.all(
          edgeRows.map(async (edge) => {
            const payload = await readJsonPayload<Record<string, unknown>>(context.env, edge.payload_r2_key);
            return payload ? { ...edge, ...payload, id: edge.id, map_id: edge.map_id } : edge;
          }),
        ),
      ]);
      const hydratedMap = mapPayload ? { ...map, ...mapPayload, id: map.id, organization_id: map.organization_id } : map;
      const deal: DealFlowDeal = {
        id: id,
        name: String(hydratedMap.name || map.name || id),
        stage: String(hydratedMap.template || "Deal"),
      };
      return renderMap(
        deal,
        hydratedNodes.map((node) => ({
          id: node.id,
          kind: node.kind === "deal" ? "action" : (node.kind as DealFlowEntity["kind"]),
          label: String(node.label || "Untitled"),
          sublabel: node.sublabel ? String(node.sublabel) : undefined,
          status: (node.status as DealFlowEntity["status"]) || "neutral",
          position: { x: Number(node.position_x || 0), y: Number(node.position_y || 0) },
        })),
        hydratedEdges.map((edge) => ({
          id: edge.id,
          source: edge.source_node_id,
          target: edge.target_node_id,
          label: edge.label ? String(edge.label) : undefined,
        })),
        map.id,
      );
    }
  }

  // 2. Otherwise fall back to deal-based rendering.
  const dealRow = await db
    .prepare("SELECT * FROM deals WHERE id = ? AND organization_id = ? LIMIT 1")
    .bind(id, organizationId)
    .first<DealRow>();

  if (!dealRow) {
    if (isDev) {
      return renderLocalDemoOrUnavailable(id, "Demo data · no deal with that ID in D1 yet.");
    }
    notFound();
  }

  const [contactRows, documentRows, taskRows, calendarRows] = await Promise.all([
    dealRow.contact_id
      ? db
          .prepare("SELECT id, full_name, first_name, last_name, title, company FROM contacts WHERE id = ? AND organization_id = ? LIMIT 1")
          .bind(dealRow.contact_id, organizationId)
          .all<ContactRow>()
      : Promise.resolve({ results: [] as ContactRow[] }),
    db
      .prepare("SELECT id, title, status, type FROM documents WHERE organization_id = ? AND deal_id = ? ORDER BY created_at DESC LIMIT 6")
      .bind(organizationId, id)
      .all<DocumentRow>(),
    db
      .prepare("SELECT id, title, status, priority, due_at FROM tasks WHERE organization_id = ? AND deal_id = ? ORDER BY due_at ASC NULLS LAST LIMIT 6")
      .bind(organizationId, id)
      .all<TaskRow>()
      .catch(() =>
        db
          .prepare("SELECT id, title, status, priority, due_at FROM tasks WHERE organization_id = ? AND deal_id = ? ORDER BY due_at ASC LIMIT 6")
          .bind(organizationId, id)
          .all<TaskRow>(),
      ),
    db
      .prepare("SELECT id, title, starts_at, status FROM calendar_events WHERE organization_id = ? AND deal_id = ? ORDER BY starts_at ASC LIMIT 6")
      .bind(organizationId, id)
      .all<CalendarRow>(),
  ]);

  const deal: DealFlowDeal = {
    id: dealRow.id,
    name: dealRow.name,
    stage: dealRow.stage || "Lead",
    value: formatCurrency(dealRow.value_cents),
    nextAction: (taskRows.results || [])[0]?.title || undefined,
  };

  const entities: DealFlowEntity[] = [];

  for (const row of contactRows.results || []) {
    entities.push({
      id: `contact:${row.id}`,
      kind: "contact",
      label: formatContactName(row),
      sublabel: [row.title, row.company].filter(Boolean).join(" · ") || undefined,
      status: "neutral",
    });
  }

  if (dealRow.company) {
    entities.push({
      id: `company:${dealRow.id}`,
      kind: "company",
      label: dealRow.company,
      status: "neutral",
    });
  }

  for (const row of documentRows.results || []) {
    entities.push({
      id: `doc:${row.id}`,
      kind: "document",
      label: row.title || "Untitled document",
      sublabel: row.status || undefined,
      status: statusForDocument(row),
    });
  }

  for (const row of taskRows.results || []) {
    entities.push({
      id: `task:${row.id}`,
      kind: "task",
      label: row.title || "Untitled task",
      sublabel: row.due_at ? `Due ${new Date(row.due_at).toLocaleDateString()}` : undefined,
      status: statusForTask(row),
    });
  }

  for (const row of calendarRows.results || []) {
    entities.push({
      id: `meeting:${row.id}`,
      kind: "meeting",
      label: row.title || "Untitled meeting",
      sublabel: row.starts_at ? new Date(row.starts_at).toLocaleString() : undefined,
      status: statusForMeeting(row),
    });
  }

  const materialized = await materializeDealFlowForDeal({
    db,
    env: context.env,
    organizationId,
    createdBy: sessionUser?.user_id || context.user.email || null,
    deal,
    entities,
  });

  return renderMap(deal, materialized.initialNodes, materialized.initialEdges, materialized.dealFlowId);
}

// Each render function returns the workspace content for the suite layout to compose
// inside its shell. No <main>, no <SuiteClient> — the layout already provided both.

function renderLocalDemoOrUnavailable(id: string, banner: string) {
  const demo = LOCAL_DEMO_DEALFLOWS[id];
  if (demo) {
    return <DealFlowClient deal={demo.deal} entities={demo.entities} />;
  }
  return renderUnavailable(id, banner);
}

function renderUnavailable(_id: string, _banner: string) {
  return (
    <div className="min-h-screen bg-[#f9f7f4] p-8">
      <div className="mx-auto max-w-3xl rounded-2xl border border-[var(--rule,#e8e4de)] bg-white p-8">
        <h1 className="text-xl font-semibold text-[#0d0c0a]">DealFlow unavailable</h1>
        <p className="mt-2 text-sm text-[#6b6760]">
          {_banner} Requested deal <span className="font-mono">{_id}</span> was not found, so no sample deal is shown.
        </p>
      </div>
    </div>
  );
}

function renderMap(
  deal: DealFlowDeal,
  initialNodes: DealFlowInitialNode[],
  initialEdges: DealFlowInitialEdge[],
  dealFlowId: string,
) {
  return (
    <DealFlowClient
      deal={deal}
      entities={[]}
      dealFlowId={dealFlowId}
      initialNodes={initialNodes}
      initialEdges={initialEdges}
      persistApiBase={`/api/dealflows/${encodeURIComponent(dealFlowId)}`}
    />
  );
}

async function materializeDealFlowForDeal(input: {
  db: D1Database;
  env: CloudflareEnv;
  organizationId: string;
  createdBy: string | null;
  deal: DealFlowDeal;
  entities: DealFlowEntity[];
}) {
  const map = await createDealFlow(input.db, {
    organization_id: input.organizationId,
    name: "DealFlow payload in R2",
    deal_id: input.deal.id,
    template: input.deal.stage,
    created_by_user_id: input.createdBy,
  });
  const mapPayload = {
    ...map,
    name: input.deal.name,
    deal_id: input.deal.id,
    template: input.deal.stage,
  };
  const storedMap = await storeJsonPayload({
    env: input.env,
    db: input.db,
    organization_id: input.organizationId,
    resource_type: "dealflow",
    resource_id: map.id,
    payload: mapPayload,
    created_by: input.createdBy,
  });
  await input.db
    .prepare("UPDATE maps SET payload_r2_key = ?, storage_object_id = ? WHERE id = ?")
    .bind(storedMap.r2_key, storedMap.storage_object_id, map.id)
    .run();

  const initialNodes: DealFlowInitialNode[] = [];
  const initialEdges: DealFlowInitialEdge[] = [];
  const centerX = 480;
  const centerY = 320;
  const radius = input.entities.length > 5 ? 430 : 300;

  for (const [index, entity] of input.entities.entries()) {
    const angle = ((index / Math.max(input.entities.length, 1)) * Math.PI * 2) - Math.PI / 2;
    const position = {
      x: centerX + radius * Math.cos(angle) - 100,
      y: centerY + radius * Math.sin(angle) - 30,
    };
    const node = await createDealFlowNode(input.db, map.id, {
      kind: entity.kind,
      label: "DealFlow node payload in R2",
      sublabel: null,
      status: entity.status || "neutral",
      position_x: position.x,
      position_y: position.y,
      data: {},
    });
    const nodePayload = {
      ...node,
      label: entity.label,
      sublabel: entity.sublabel || null,
      data: {
        source_id: entity.id,
        role: entity.role || null,
        child_kind: entity.childKind || null,
        children_count: entity.childrenCount || null,
      },
    };
    const storedNode = await storeJsonPayload({
      env: input.env,
      db: input.db,
      organization_id: input.organizationId,
      resource_type: "dealflow_node",
      resource_id: node.id,
      payload: nodePayload,
      created_by: input.createdBy,
    });
    await input.db
      .prepare("UPDATE map_nodes SET payload_r2_key = ?, storage_object_id = ? WHERE id = ? AND map_id = ?")
      .bind(storedNode.r2_key, storedNode.storage_object_id, node.id, map.id)
      .run();

    const edge = await createDealFlowEdge(input.db, map.id, {
      source_node_id: input.deal.id,
      target_node_id: node.id,
    });
    initialNodes.push({
      id: node.id,
      kind: entity.kind,
      label: entity.label,
      sublabel: entity.sublabel,
      status: entity.status || "neutral",
      position,
    });
    initialEdges.push({ id: edge.id, source: input.deal.id, target: node.id });
  }

  return { dealFlowId: map.id, initialNodes, initialEdges };
}
