import { redirect } from "next/navigation";

import { getAdminRuntime, resolveAdminSession } from "@/lib/server/admin-session";
import MapsGalleryClient from "@/components/suite/workspaces/MapsGalleryClient";

export const dynamic = "force-dynamic";

interface DealRow {
  id: string;
  name: string | null;
  stage: string | null;
  updated_at: string | null;
}

interface CountRow {
  deal_id: string;
  c: number | null;
}

async function loadGallery(db: D1Database | undefined) {
  if (!db) {
    return [
      { id: "DEAL-1210", name: "Meridian Cold Chain — Acquisition", stage: "closing",     updated: "2026-05-22T06:00:00.000Z", nodeCount: 14 },
      { id: "DEAL-1207", name: "Heliograph — Series C extension",   stage: "negotiation", updated: "2026-05-22T03:30:00.000Z", nodeCount: 11 },
      { id: "DEAL-1218", name: "Tessellate — Series B participation",stage: "negotiation",updated: "2026-05-22T00:10:00.000Z", nodeCount: 9 },
      { id: "DEAL-1213", name: "Quorum Energy — Joint venture",      stage: "proposal",   updated: "2026-05-19T14:00:00.000Z", nodeCount: 7 },
      { id: "DEAL-1214", name: "Kestrel Defense — Procurement",      stage: "negotiation",updated: "2026-05-21T18:00:00.000Z", nodeCount: 8 },
      { id: "DEAL-1209", name: "Larkfield Capital — Strategic partnership", stage: "proposal", updated: "2026-05-21T11:30:00.000Z", nodeCount: 6 },
    ];
  }

  const [dealRows, nodeCountRows] = await Promise.all([
    db
      .prepare("SELECT id, name, stage, updated_at FROM deals ORDER BY updated_at DESC LIMIT 200")
      .all<DealRow>()
      .then((r) => r.results || [])
      .catch(() => [] as DealRow[]),
    db
      .prepare(
        `SELECT deal_id, COUNT(*) AS c FROM (
           SELECT deal_id FROM tasks WHERE deal_id IS NOT NULL
           UNION ALL SELECT deal_id FROM documents WHERE deal_id IS NOT NULL
           UNION ALL SELECT deal_id FROM calendar_events WHERE deal_id IS NOT NULL
         ) GROUP BY deal_id`,
      )
      .all<CountRow>()
      .then((r) => r.results || [])
      .catch(() => [] as CountRow[]),
  ]);

  const countByDeal = new Map<string, number>();
  for (const c of nodeCountRows) countByDeal.set(c.deal_id, Number(c.c || 0));

  return dealRows.slice(0, 24).map((d) => ({
    id: d.id,
    name: d.name || d.id,
    stage: d.stage || "lead",
    updated: d.updated_at,
    nodeCount: 1 + (countByDeal.get(d.id) || 0),
  }));
}

export default async function MapsGalleryPage() {
  const session = await resolveAdminSession();
  if (!session) {
    redirect("/login?redirect=/suite/maps");
  }

  const { context } = await getAdminRuntime();
  const gallery = await loadGallery(context.env.DB);

  return <MapsGalleryClient data={{ gallery }} />;
}
