import { notFound } from "next/navigation";
import {
  DealMindmap,
  type DealMindmapDeal,
  type DealMindmapEntity,
  type DealMindmapInitialEdge,
  type DealMindmapInitialNode,
} from "@/components/suite/DealMindmap";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { redirect } from "next/navigation";
import { getMap, getMapEdges, getMapNodes } from "@/lib/server/repository";

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

const SAMPLE_DEAL: DealMindmapDeal = {
  id: "DEAL-1224",
  name: "Capital raise — Series B",
  stage: "Negotiation",
  value: "$24M",
  nextAction: "Send counter offer · today",
};

const SAMPLE_ENTITIES: DealMindmapEntity[] = [
  { id: "contact:1", kind: "contact", label: "Aurore Chastain", sublabel: "Head of Corp Dev · Sutter Maritime", status: "neutral" },
  { id: "contact:2", kind: "contact", label: "Beni Okonkwo",   sublabel: "CFO · Foundry Helix",            status: "neutral" },
  { id: "company:1", kind: "company", label: "Sutter Maritime", sublabel: "Logistics · NYC",                status: "neutral" },
  { id: "action:1",  kind: "action",  label: "Counter offer ready", sublabel: "Due today",                   status: "active" },
  { id: "doc:1",     kind: "document",label: "Term sheet v3",   sublabel: "Signed",                          status: "done" },
  { id: "doc:2",     kind: "document",label: "Diligence summary",sublabel: "Draft",                          status: "active" },
  { id: "doc:3",     kind: "document",label: "Cap table",       sublabel: "Sent",                            status: "neutral" },
  { id: "task:1",    kind: "task",    label: "Banker call",     sublabel: "Due Thu · high",                  status: "active" },
  { id: "task:2",    kind: "task",    label: "Counsel review",  sublabel: "Due Fri · high",                  status: "warning" },
  { id: "task:3",    kind: "task",    label: "Reference calls", sublabel: "Overdue",                         status: "overdue" },
  { id: "call:1",    kind: "call",    label: "Discovery call",  sublabel: "Transcribed",                     status: "done" },
  { id: "call:2",    kind: "call",    label: "Tech call",       sublabel: "Recorded",                        status: "done" },
  { id: "meeting:1", kind: "meeting", label: "Mgmt presentation", sublabel: "Thu 3:00pm",                   status: "active" },
  { id: "meeting:2", kind: "meeting", label: "IC review",       sublabel: "Next week",                       status: "neutral" },
];

export default async function DealDetailPage({ params }: PageProps) {
  const { id } = await params;
  const context = getRuntimeContext(new Request("http://localhost/"));
  const db = context.env.DB;
  const isDev = process.env.NODE_ENV !== "production";

  if (!db) {
    if (isDev) {
      return renderSample(id, "Demo data · no D1 binding configured locally.");
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

  const sessionUser = await validateSession(db, null);
  if (!sessionUser && !context.user.isLocalAdminBypass) {
    redirect(`/login?redirect=/suite/map/${encodeURIComponent(id)}`);
  }

  // 1. Try the persisted-map path first (Phase 9d). Map IDs are `map_*`.
  const mapRecord = await getMap(db, id);
  if (mapRecord) {
    const [nodeRows, edgeRows] = await Promise.all([
      getMapNodes(db, mapRecord.id),
      getMapEdges(db, mapRecord.id),
    ]);

    const deal: DealMindmapDeal = {
      id: mapRecord.id,
      name: mapRecord.name,
      stage: mapRecord.template || "Map",
    };

    const initialNodes: DealMindmapInitialNode[] = nodeRows.map((node) => ({
      id: node.id,
      kind: node.kind === "deal" ? "action" : (node.kind as DealMindmapEntity["kind"]),
      label: node.label,
      sublabel: node.sublabel || undefined,
      status: (node.status as DealMindmapEntity["status"]) || "neutral",
      position: { x: node.position_x, y: node.position_y },
    }));

    const initialEdges: DealMindmapInitialEdge[] = edgeRows.map((edge) => ({
      id: edge.id,
      source: edge.source_node_id,
      target: edge.target_node_id,
      label: edge.label || undefined,
    }));

    return renderMap(deal, initialNodes, initialEdges, mapRecord.id);
  }

  // 2. Otherwise fall back to deal-based rendering.
  const dealRow = await db
    .prepare("SELECT * FROM deals WHERE id = ? LIMIT 1")
    .bind(id)
    .first<DealRow>();

  if (!dealRow) {
    if (isDev) {
      return renderSample(id, "Demo data · no deal with that ID in D1 yet.");
    }
    notFound();
  }

  const [contactRows, documentRows, taskRows, calendarRows] = await Promise.all([
    dealRow.contact_id
      ? db
          .prepare("SELECT id, full_name, first_name, last_name, title, company FROM contacts WHERE id = ? LIMIT 1")
          .bind(dealRow.contact_id)
          .all<ContactRow>()
      : Promise.resolve({ results: [] as ContactRow[] }),
    db.prepare("SELECT id, title, status, type FROM documents ORDER BY created_at DESC LIMIT 6").all<DocumentRow>(),
    db
      .prepare("SELECT id, title, status, priority, due_at FROM tasks WHERE deal_id = ? ORDER BY due_at ASC NULLS LAST LIMIT 6")
      .bind(id)
      .all<TaskRow>()
      .catch(() =>
        db
          .prepare("SELECT id, title, status, priority, due_at FROM tasks WHERE deal_id = ? ORDER BY due_at ASC LIMIT 6")
          .bind(id)
          .all<TaskRow>(),
      ),
    db
      .prepare("SELECT id, title, starts_at, status FROM calendar_events WHERE deal_id = ? ORDER BY starts_at ASC LIMIT 6")
      .bind(id)
      .all<CalendarRow>(),
  ]);

  const deal: DealMindmapDeal = {
    id: dealRow.id,
    name: dealRow.name,
    stage: dealRow.stage || "Lead",
    value: formatCurrency(dealRow.value_cents),
    nextAction: (taskRows.results || [])[0]?.title || undefined,
  };

  const entities: DealMindmapEntity[] = [];

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

  return renderPage(deal, entities, dealRow);
}

function renderSample(id: string, banner: string) {
  return (
    <main className="min-h-screen bg-[#f9f7f4]">
      <div className="border-b border-[var(--rule,#e8e4de)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <a href="/suite" className="text-xs font-medium uppercase tracking-[0.12em] text-[#6b6760] hover:text-[#0d0c0a]">
              ← Suite
            </a>
            <div className="h-4 w-px bg-[var(--rule,#e8e4de)]" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">
                Deal · {SAMPLE_DEAL.stage}
              </div>
              <div className="text-base font-semibold text-[#0d0c0a]">{SAMPLE_DEAL.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-[#6b6760]">
            <span>
              <span className="text-[10px] uppercase tracking-[0.12em]">Value</span>
              <span className="ml-2 font-semibold text-[#0d0c0a]">{SAMPLE_DEAL.value}</span>
            </span>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-xs text-amber-800">
          {banner} · Requested id: <code className="font-mono">{id}</code>
        </div>
        <div className="rounded-2xl border border-[var(--rule,#e8e4de)] bg-white shadow-sm">
          <div className="border-b border-[var(--rule,#e8e4de)] px-6 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">Mindmap</div>
            <div className="mt-0.5 text-sm text-[#0d0c0a]">
              Every party, file, call, and next action attached to this deal.
            </div>
          </div>
          <div style={{ height: "calc(100vh - 260px)", minHeight: 560 }}>
            <DealMindmap deal={SAMPLE_DEAL} entities={SAMPLE_ENTITIES} />
          </div>
        </div>
      </div>
    </main>
  );
}

function renderMap(
  deal: DealMindmapDeal,
  initialNodes: DealMindmapInitialNode[],
  initialEdges: DealMindmapInitialEdge[],
  mapId: string,
) {
  return (
    <main className="min-h-screen bg-[#f9f7f4]">
      <div className="border-b border-[var(--rule,#e8e4de)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <a href="/suite" className="text-xs font-medium uppercase tracking-[0.12em] text-[#6b6760] hover:text-[#0d0c0a]">
              ← Suite
            </a>
            <div className="h-4 w-px bg-[var(--rule,#e8e4de)]" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">
                Map · {deal.stage}
              </div>
              <div className="text-base font-semibold text-[#0d0c0a]">{deal.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-[#6b6760]">
            <span className="text-[10px] uppercase tracking-[0.12em]">Auto-saves on change</span>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="rounded-2xl border border-[var(--rule,#e8e4de)] bg-white shadow-sm">
          <div className="border-b border-[var(--rule,#e8e4de)] px-6 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">Mindmap</div>
            <div className="mt-0.5 text-sm text-[#0d0c0a]">
              Every party, file, call, and next action attached to this map. Persists to D1.
            </div>
          </div>
          <div style={{ height: "calc(100vh - 240px)", minHeight: 560 }}>
            <DealMindmap
              deal={deal}
              entities={[]}
              mapId={mapId}
              initialNodes={initialNodes}
              initialEdges={initialEdges}
              persistApiBase={`/api/maps/${encodeURIComponent(mapId)}`}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function renderPage(deal: DealMindmapDeal, entities: DealMindmapEntity[], dealRow: DealRow) {
  return (
    <main className="min-h-screen bg-[#f9f7f4]">
      <div className="border-b border-[var(--rule,#e8e4de)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <a href="/suite" className="text-xs font-medium uppercase tracking-[0.12em] text-[#6b6760] hover:text-[#0d0c0a]">
              ← Suite
            </a>
            <div className="h-4 w-px bg-[var(--rule,#e8e4de)]" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">
                Deal · {dealRow.stage || "Lead"}
              </div>
              <div className="text-base font-semibold text-[#0d0c0a]">{dealRow.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-[#6b6760]">
            {deal.value && (
              <span>
                <span className="text-[10px] uppercase tracking-[0.12em]">Value</span>
                <span className="ml-2 font-semibold text-[#0d0c0a]">{deal.value}</span>
              </span>
            )}
            {dealRow.expected_close_at && (
              <span>
                <span className="text-[10px] uppercase tracking-[0.12em]">Close</span>
                <span className="ml-2 font-semibold text-[#0d0c0a]">
                  {new Date(dealRow.expected_close_at).toLocaleDateString()}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="rounded-2xl border border-[var(--rule,#e8e4de)] bg-white shadow-sm">
          <div className="border-b border-[var(--rule,#e8e4de)] px-6 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">Mindmap</div>
            <div className="mt-0.5 text-sm text-[#0d0c0a]">
              Every party, file, call, and next action attached to this deal.
            </div>
          </div>
          <div style={{ height: "calc(100vh - 240px)", minHeight: 560 }}>
            <DealMindmap deal={deal} entities={entities} />
          </div>
        </div>
        {entities.length === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-[var(--rule,#e8e4de)] bg-white p-6 text-center text-sm text-[#6b6760]">
            No people, files, calls, or tasks attached to this deal yet. The mindmap fills in as the deal moves.
          </div>
        )}
      </div>
    </main>
  );
}
