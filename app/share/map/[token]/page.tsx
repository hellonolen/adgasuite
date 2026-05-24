import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { DealFlow, type DealFlowDeal, type DealFlowEntity } from "@/components/suite/DealFlow";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";

interface PageProps {
  params: Promise<{ token: string }>;
}

interface ShareRow {
  token: string;
  map_id: string;
  permission: string;
  expires_at: string | null;
  revoked_at: string | null;
}

interface DealFlowRow {
  id: string;
  name?: string | null;
  title?: string | null;
  deal_id?: string | null;
  organization_id?: string | null;
}

interface DealFlowNodeRow {
  id: string;
  map_id: string;
  kind?: string | null;
  type?: string | null;
  label?: string | null;
  sublabel?: string | null;
  status?: string | null;
  data?: string | null;
}

interface DealFlowEdgeRow {
  id: string;
  map_id: string;
  source_id?: string | null;
  source_node_id?: string | null;
  target_id?: string | null;
  target_node_id?: string | null;
}

// Simple in-memory rate limit. Per-IP, 5 hits per 60s. Resets on cold start —
// acceptable for an investor-demo guardrail; replace with Durable Object or
// Cloudflare Rate Limiting binding for production-grade enforcement.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const rateBuckets = new Map<string, number[]>();

function clientIpFromHeaders(h: Headers): string {
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

function rateLimitHit(ip: string): boolean {
  const now = Date.now();
  const bucket = (rateBuckets.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (bucket.length >= RATE_LIMIT_MAX) {
    rateBuckets.set(ip, bucket);
    return true;
  }
  bucket.push(now);
  rateBuckets.set(ip, bucket);
  return false;
}

const VALID_KINDS = new Set(["contact", "company", "document", "task", "call", "meeting", "action"]);
const VALID_STATUSES = new Set(["neutral", "active", "warning", "overdue", "done"]);

function normalizeKind(value: string | null | undefined): DealFlowEntity["kind"] {
  if (value && VALID_KINDS.has(value)) return value as DealFlowEntity["kind"];
  return "action";
}

function normalizeStatus(value: string | null | undefined): DealFlowEntity["status"] {
  if (value && VALID_STATUSES.has(value)) return value as DealFlowEntity["status"];
  return "neutral";
}

async function loadShare(db: D1Database, token: string): Promise<ShareRow | null> {
  try {
    return await db
      .prepare(
        `SELECT token, map_id, permission, expires_at, revoked_at
         FROM map_shares
         WHERE token = ?
         LIMIT 1`,
      )
      .bind(token)
      .first<ShareRow>();
  } catch {
    return null;
  }
}

async function loadDealFlow(db: D1Database, dealFlowId: string): Promise<DealFlowRow | null> {
  try {
    return await db.prepare("SELECT * FROM maps WHERE id = ? LIMIT 1").bind(dealFlowId).first<DealFlowRow>();
  } catch {
    return null;
  }
}

async function loadNodes(db: D1Database, dealFlowId: string): Promise<DealFlowNodeRow[]> {
  try {
    const result = await db
      .prepare("SELECT * FROM map_nodes WHERE map_id = ? LIMIT 500")
      .bind(dealFlowId)
      .all<DealFlowNodeRow>();
    return result.results || [];
  } catch {
    return [];
  }
}

async function loadEdges(db: D1Database, dealFlowId: string): Promise<DealFlowEdgeRow[]> {
  try {
    const result = await db
      .prepare("SELECT * FROM map_edges WHERE map_id = ? LIMIT 1000")
      .bind(dealFlowId)
      .all<DealFlowEdgeRow>();
    return result.results || [];
  } catch {
    return [];
  }
}

function buildDeal(dealFlow: DealFlowRow): DealFlowDeal {
  // SECURITY: do NOT leak owner/org/private fields. Only id + display name.
  return {
    id: dealFlow.id,
    name: dealFlow.title || dealFlow.name || "Shared dealflow",
    stage: "Shared",
  };
}

function buildEntities(nodes: DealFlowNodeRow[]): DealFlowEntity[] {
  return nodes.map((node) => ({
    id: node.id,
    kind: normalizeKind(node.kind || node.type),
    label: node.label || "Untitled",
    sublabel: node.sublabel || undefined,
    status: normalizeStatus(node.status),
  }));
}

export default async function PublicSharedMapPage({ params }: PageProps) {
  const { token } = await params;
  const requestHeaders = await headers();

  const ip = clientIpFromHeaders(requestHeaders);
  if (rateLimitHit(ip)) {
    return (
      <PublicShell banner="Too many requests. Wait a minute and try again.">
        <RateLimitedView />
      </PublicShell>
    );
  }

  const context = getRuntimeContext();
  const db = context.env.DB;

  if (!db) {
    return (
      <PublicShell banner="Shared dealflows are temporarily unavailable.">
        <NotAvailableView />
      </PublicShell>
    );
  }

  const share = await loadShare(db, token);
  if (!share) notFound();
  if (share.revoked_at) notFound();
  if (share.expires_at && new Date(share.expires_at).getTime() < Date.now()) notFound();

  // If a signed-in member of the org hits the public link, send them to the
  // authenticated view so they get full org context instead of read-only.
  const map = await loadDealFlow(db, share.map_id);
  if (!map) notFound();

  const sessionCookie = requestHeaders.get("cookie");
  if (sessionCookie) {
    const fakeRequest = new Request("http://localhost/", { headers: { cookie: sessionCookie } });
    const sessionUser = await validateSession(db, readSessionCookie(fakeRequest));
    if (sessionUser && sessionUser.organization_id && map.organization_id && sessionUser.organization_id === map.organization_id) {
      redirect(`/suite/dealflow/${encodeURIComponent(map.id)}`);
    }
  }

  const [nodes, edges] = await Promise.all([loadNodes(db, share.map_id), loadEdges(db, share.map_id)]);

  const deal = buildDeal(map);
  const entities = buildEntities(nodes);
  // Edges from D1 inform the connection inputs the DealFlow renders.
  void edges;

  return (
    <PublicShell banner={`Shared dealflow · ${share.permission === "view" ? "View only" : share.permission} · ADGA`}>
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="rounded-2xl border border-[var(--rule,#e8e4de)] bg-white shadow-sm">
          <div className="border-b border-[var(--rule,#e8e4de)] px-6 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">Shared dealflow</div>
            <div className="mt-0.5 text-sm text-[#0d0c0a]">{deal.name}</div>
          </div>
          <div style={{ height: "calc(100vh - 220px)", minHeight: 560 }}>
            <DealFlow deal={deal} entities={entities} readOnly />
          </div>
        </div>
      </div>
    </PublicShell>
  );
}

function PublicShell({ banner, children }: { banner: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f9f7f4]">
      <div className="border-b border-[var(--rule,#e8e4de)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="text-base font-semibold text-[#0d0c0a]">ADGA</div>
            <div className="h-3 w-px bg-[var(--rule,#e8e4de)]" />
            <div className="text-xs text-[#6b6760]">{banner}</div>
          </div>
          <a
            href="/"
            className="text-xs font-medium uppercase tracking-[0.12em] text-[#5d2cd6] hover:text-[#4920b3]"
          >
            Visit ADGA
          </a>
        </div>
      </div>
      {children}
    </main>
  );
}

function RateLimitedView() {
  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <h1 className="text-xl font-semibold text-[#0d0c0a]">Too many requests</h1>
      <p className="mt-2 text-sm text-[#6b6760]">
        This share link has been opened too many times in a short window. Wait a minute, then refresh.
      </p>
    </div>
  );
}

function NotAvailableView() {
  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <h1 className="text-xl font-semibold text-[#0d0c0a]">Shared dealflows unavailable</h1>
      <p className="mt-2 text-sm text-[#6b6760]">Try again in a moment.</p>
    </div>
  );
}
