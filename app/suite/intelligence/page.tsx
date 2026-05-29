// /suite/intelligence — revenue dashboard from real D1.
// Closes GAP #8: KPIs now compute from aggregated subscriptions + deals,
// no more local-array math.

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { DEFAULT_ORG_ID, organizationIdForSession } from "@/lib/server/tenant";

export const dynamic = "force-dynamic";

interface SubRow {
  plan: string;
  status: string;
  count: number;
}

interface DealRow {
  stage: string | null;
  value_cents: number | null;
  probability: number | null;
  count: number;
}

const PLAN_MRR_CENTS: Record<string, number> = {
  pro: 9900,
  team: 29900,
  enterprise: 79900,
  individual: 9900,
  teams: 29900,
  solo: 4900,
  essential: 4900,
  professional: 9900,
  suite: 19900,
};

async function loadKpis(db: D1Database | undefined, organizationId: string) {
  if (!db) return null;
  const [subs, deals, leadCount, contactCount] = await Promise.all([
    db
      .prepare(
        `SELECT plan, status, COUNT(*) as count
           FROM subscriptions
          WHERE organization_id = ?
          GROUP BY plan, status`,
      )
      .bind(organizationId)
      .all<SubRow>()
      .catch(() => ({ results: [] as SubRow[] })),
    db
      .prepare(
        `SELECT COALESCE(stage,'') as stage,
                SUM(COALESCE(value_cents,0)) as value_cents,
                AVG(COALESCE(probability,0)) as probability,
                COUNT(*) as count
           FROM deals
          WHERE organization_id = ? AND archived_at IS NULL
          GROUP BY stage`,
      )
      .bind(organizationId)
      .all<DealRow>()
      .catch(() => ({ results: [] as DealRow[] })),
    db
      .prepare(`SELECT COUNT(*) as c FROM leads WHERE organization_id = ?`)
      .bind(organizationId)
      .first<{ c: number }>()
      .catch(() => null),
    db
      .prepare(`SELECT COUNT(*) as c FROM contacts WHERE organization_id = ?`)
      .bind(organizationId)
      .first<{ c: number }>()
      .catch(() => null),
  ]);

  const subRows = subs.results || [];
  const dealRows = deals.results || [];

  const activeSubs = subRows.filter((s) => s.status === "active" || s.status === "trialing");
  const mrrCents = activeSubs.reduce(
    (acc, s) => acc + (PLAN_MRR_CENTS[s.plan] || 0) * (s.count || 0),
    0,
  );
  const arrCents = mrrCents * 12;

  const totalPipelineCents = dealRows.reduce((acc, d) => acc + (d.value_cents || 0), 0);
  const weightedPipelineCents = dealRows.reduce(
    (acc, d) => acc + ((d.value_cents || 0) * (d.probability || 0)) / 100,
    0,
  );
  const totalDeals = dealRows.reduce((acc, d) => acc + (d.count || 0), 0);

  return {
    mrrCents,
    arrCents,
    activeSubsCount: activeSubs.reduce((a, s) => a + (s.count || 0), 0),
    totalPipelineCents,
    weightedPipelineCents,
    totalDeals,
    leadCount: leadCount?.c || 0,
    contactCount: contactCount?.c || 0,
    byStage: dealRows.sort((a, b) => (b.value_cents || 0) - (a.value_cents || 0)),
    bySub: subRows,
  };
}

function fmtUsd(cents: number) {
  const dollars = Math.round(cents / 100);
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}K`;
  return `$${dollars}`;
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ border: "1px solid #e8e4de", borderRadius: 8, padding: 18, background: "#fff" }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6b6760" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600, marginTop: 8, color: "#0d0c0a", letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#6b6760", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default async function SuiteIntelligencePage() {
  const headerList = await headers();
  const cookieHeader = headerList.get("cookie");
  const request = new Request("https://internal.local/suite/intelligence", {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
  const context = getRuntimeContext(request);
  const session = await validateSession(context.env.DB, readSessionCookie(request));
  if (!session && !context.user.isLocalAdminBypass) {
    redirect("/login?next=/suite/intelligence");
  }
  const organizationId = organizationIdForSession(session, DEFAULT_ORG_ID);
  const kpis = await loadKpis(context.env.DB, organizationId);

  if (!kpis) {
    return (
      <div style={{ padding: "0 var(--suite-gutter, 32px) 48px" }}>
        <h1>Intelligence</h1>
        <p style={{ color: "#6b6760" }}>Intelligence data unavailable.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 var(--suite-gutter, 32px) 48px", display: "flex", flexDirection: "column", gap: 28 }}>
      <div className="page-h">
        <div>
          <h1>Intelligence.</h1>
          <div className="sub">Revenue, pipeline, and activity — computed live from your workspace.</div>
        </div>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <Metric label="MRR" value={fmtUsd(kpis.mrrCents)} sub={`${kpis.activeSubsCount} active subscription${kpis.activeSubsCount === 1 ? "" : "s"}`} />
        <Metric label="ARR run-rate" value={fmtUsd(kpis.arrCents)} />
        <Metric label="Pipeline value" value={fmtUsd(kpis.totalPipelineCents)} sub={`${kpis.totalDeals} active deals`} />
        <Metric label="Weighted pipeline" value={fmtUsd(kpis.weightedPipelineCents)} sub="prob-adjusted" />
        <Metric label="Leads" value={String(kpis.leadCount)} />
        <Metric label="Contacts" value={String(kpis.contactCount)} />
      </section>

      <section style={{ border: "1px solid #e8e4de", borderRadius: 8, background: "#fff" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #e8e4de", background: "#f9f7f4", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6760" }}>
          Pipeline by stage
        </div>
        {kpis.byStage.length === 0 && (
          <div style={{ padding: "24px 16px", fontSize: 13, color: "#6b6760" }}>No active deals.</div>
        )}
        {kpis.byStage.map((row) => (
          <div key={row.stage || ""} style={{ display: "grid", gridTemplateColumns: "1fr 80px 120px 120px", gap: 12, alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #f1ede8", fontSize: 13 }}>
            <span style={{ color: "#0d0c0a", fontWeight: 500 }}>{row.stage || "(no stage)"}</span>
            <span style={{ color: "#6b6760", textAlign: "right" }}>{row.count}</span>
            <span style={{ color: "#6b6760", textAlign: "right" }}>{Math.round(row.probability || 0)}%</span>
            <span style={{ color: "#0d0c0a", fontWeight: 500, textAlign: "right" }}>{fmtUsd(row.value_cents || 0)}</span>
          </div>
        ))}
      </section>

      <section style={{ border: "1px solid #e8e4de", borderRadius: 8, background: "#fff" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #e8e4de", background: "#f9f7f4", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6760" }}>
          Subscriptions
        </div>
        {kpis.bySub.length === 0 && (
          <div style={{ padding: "24px 16px", fontSize: 13, color: "#6b6760" }}>No subscriptions yet.</div>
        )}
        {kpis.bySub.map((row) => (
          <div key={`${row.plan}-${row.status}`} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 12, padding: "12px 16px", borderBottom: "1px solid #f1ede8", fontSize: 13 }}>
            <span style={{ color: "#0d0c0a", fontWeight: 500 }}>{row.plan}</span>
            <span style={{ color: "#6b6760" }}>{row.status}</span>
            <span style={{ color: "#0d0c0a", fontWeight: 500, textAlign: "right" }}>{row.count}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
