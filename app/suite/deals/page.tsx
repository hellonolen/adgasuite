import { redirect } from "next/navigation";

import DealsPageClient from "@/components/suite/workspaces/DealsPageClient";
import { getAdminRuntime, resolveAdminSession } from "@/lib/server/admin-session";
import { readJsonPayload } from "@/lib/server/payload-storage";
import { DEFAULT_ORG_ID } from "@/lib/server/tenant";

export const dynamic = "force-dynamic";

interface CanvasRow {
  id: string;
  name: string | null;
  template: string | null;
  updated_at: string | null;
  payload_r2_key: string | null;
}

interface DealRow {
  id: string;
  name: string | null;
  company: string | null;
  value_cents: number | null;
  stage: string | null;
  updated_at: string | null;
  payload_r2_key: string | null;
}

interface CanvasCountRow {
  map_id: string;
  c: number | null;
}

interface DealCountRow {
  deal_id: string;
  c: number | null;
}

type DealSquare = {
  id: string;
  name: string;
  stage: string;
  updated: string | null;
  nodeCount: number;
  storageState: "r2" | "metadata";
  source: "canvas" | "deal";
  value?: string | null;
  company?: string | null;
  primaryContact?: string | null;
  nextAction?: string | null;
  risk?: "new" | "active" | "at-risk" | "closing" | "won" | "archived";
  lastActivity?: string | null;
};

function formatMoney(cents: number | null | undefined) {
  if (!cents || cents <= 0) return null;
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${Math.round(dollars / 1_000)}k`;
  return `$${Math.round(dollars)}`;
}

function riskFromStage(stage: string) {
  const normalized = stage.toLowerCase();
  if (normalized.includes("won") || normalized.includes("closed")) return "won";
  if (normalized.includes("archive")) return "archived";
  if (normalized.includes("risk") || normalized.includes("stalled") || normalized.includes("overdue")) return "at-risk";
  if (normalized.includes("closing") || normalized.includes("contract") || normalized.includes("signature")) return "closing";
  if (normalized.includes("lead") || normalized.includes("new")) return "new";
  return "active";
}

async function loadDeals(db: D1Database | undefined, env: CloudflareEnv): Promise<DealSquare[]> {
  if (!db) {
    return [
      { id: "DEAL-621810", name: "Meridian Cold Chain Acquisition", stage: "closing", updated: "2026-05-22T06:00:00.000Z", nodeCount: 14, storageState: "r2", source: "canvas", value: "$18.4M", company: "Meridian Cold Chain", primaryContact: "Ari Boone", nextAction: "Confirm seller counsel markups", risk: "closing" },
      { id: "DEAL-847214", name: "Heliograph Series C Extension", stage: "negotiation", updated: "2026-05-22T03:30:00.000Z", nodeCount: 11, storageState: "r2", source: "canvas", value: "$7.2M", company: "Heliograph", primaryContact: "Mira Sen", nextAction: "Send revised allocation", risk: "active" },
      { id: "DEAL-935672", name: "Tessellate Series B Participation", stage: "at-risk", updated: "2026-05-22T00:10:00.000Z", nodeCount: 9, storageState: "r2", source: "canvas", value: "$3.5M", company: "Tessellate", primaryContact: "Noah Rhee", nextAction: "Recover sponsor response", risk: "at-risk" },
      { id: "DEAL-471906", name: "Quorum Energy Joint Venture", stage: "proposal", updated: "2026-05-19T14:00:00.000Z", nodeCount: 7, storageState: "r2", source: "canvas", value: "$11M", company: "Quorum Energy", primaryContact: "Magnus Bell", nextAction: "Align JV timeline", risk: "active" },
      { id: "DEAL-783540", name: "Kestrel Defense Procurement", stage: "contract", updated: "2026-05-21T18:00:00.000Z", nodeCount: 8, storageState: "r2", source: "canvas", value: "$2.8M", company: "Kestrel Defense", primaryContact: "Inez Park", nextAction: "Route security exhibit", risk: "closing" },
      { id: "DEAL-659128", name: "Larkfield Capital Strategic Partnership", stage: "new", updated: "2026-05-21T11:30:00.000Z", nodeCount: 6, storageState: "r2", source: "canvas", value: "$5.0M", company: "Larkfield Capital", primaryContact: "Jon Ives", nextAction: null, risk: "new" },
    ];
  }

  const [canvasRows, dealRows, canvasCountRows, dealCountRows] = await Promise.all([
    db
      .prepare("SELECT id, name, template, updated_at, payload_r2_key FROM maps WHERE organization_id = ? ORDER BY updated_at DESC LIMIT 200")
      .bind(DEFAULT_ORG_ID)
      .all<CanvasRow>()
      .then((r) => r.results || [])
      .catch(() => [] as CanvasRow[]),
    db
      .prepare("SELECT id, name, company, value_cents, stage, updated_at, payload_r2_key FROM deals WHERE organization_id = ? ORDER BY updated_at DESC LIMIT 200")
      .bind(DEFAULT_ORG_ID)
      .all<DealRow>()
      .then((r) => r.results || [])
      .catch(() => [] as DealRow[]),
    db
      .prepare("SELECT map_id, COUNT(*) AS c FROM map_nodes GROUP BY map_id")
      .all<CanvasCountRow>()
      .then((r) => r.results || [])
      .catch(() => [] as CanvasCountRow[]),
    db
      .prepare(
        `SELECT deal_id, COUNT(*) AS c FROM (
           SELECT deal_id FROM tasks WHERE deal_id IS NOT NULL
           UNION ALL SELECT deal_id FROM documents WHERE deal_id IS NOT NULL
           UNION ALL SELECT deal_id FROM calendar_events WHERE deal_id IS NOT NULL
         ) GROUP BY deal_id`,
      )
      .all<DealCountRow>()
      .then((r) => r.results || [])
      .catch(() => [] as DealCountRow[]),
  ]);

  const canvasCounts = new Map<string, number>();
  for (const row of canvasCountRows) canvasCounts.set(row.map_id, Number(row.c || 0));

  const dealCounts = new Map<string, number>();
  for (const row of dealCountRows) dealCounts.set(row.deal_id, Number(row.c || 0));

  const canvasDeals = await Promise.all(
    canvasRows.map(async (row): Promise<DealSquare> => {
      const payload = await readJsonPayload<Record<string, unknown>>(env, row.payload_r2_key);
      return {
        id: row.id,
        name: String(payload?.name || row.name || row.id),
        stage: String(payload?.template || row.template || "canvas"),
        updated: row.updated_at,
        nodeCount: Math.max(1, canvasCounts.get(row.id) || 0),
        storageState: row.payload_r2_key ? "r2" : "metadata",
        source: "canvas",
        value: typeof payload?.value === "string" ? payload.value : null,
        company: typeof payload?.company === "string" ? payload.company : null,
        primaryContact: typeof payload?.primary_contact === "string" ? payload.primary_contact : null,
        nextAction: typeof payload?.next_action === "string" ? payload.next_action : null,
        risk: riskFromStage(String(payload?.template || row.template || "canvas")) as DealSquare["risk"],
      };
    }),
  );

  const canvasDealIds = new Set(
    canvasRows.map((row) => row.id).concat(canvasRows.map((row) => row.id.replace(/^map_/, "deal_"))),
  );

  const legacyDeals = await Promise.all(
    dealRows
      .filter((row) => !canvasDealIds.has(row.id))
      .slice(0, 80)
      .map(async (row): Promise<DealSquare> => {
        const payload = await readJsonPayload<Record<string, unknown>>(env, row.payload_r2_key);
        return {
          id: row.id,
          name: String(payload?.name || row.name || row.id),
          stage: String(payload?.stage || row.stage || "lead"),
          updated: row.updated_at,
          nodeCount: 1 + (dealCounts.get(row.id) || 0),
          storageState: row.payload_r2_key ? "r2" : "metadata",
          source: "deal",
          value: typeof payload?.value === "string" ? payload.value : formatMoney(row.value_cents),
          company: String(payload?.company || row.company || ""),
          primaryContact: typeof payload?.primary_contact === "string" ? payload.primary_contact : null,
          nextAction: typeof payload?.next_action === "string" ? payload.next_action : null,
          risk: riskFromStage(String(payload?.stage || row.stage || "lead")) as DealSquare["risk"],
        };
      }),
  );

  return [...canvasDeals, ...legacyDeals]
    .sort((a, b) => String(b.updated || "").localeCompare(String(a.updated || "")))
    .slice(0, 200);
}

export default async function DealsPage() {
  const session = await resolveAdminSession();
  if (!session) {
    redirect("/login?redirect=/suite/deals");
  }

  const { context } = await getAdminRuntime();
  const deals = await loadDeals(context.env.DB, context.env);

  return <DealsPageClient data={{ deals }} />;
}
