// /suite/home — Conductor's daily brief surface.
// Replaces the empty redirect with an action-ready read of the operator's day.
// Server-rendered from /api/conductor/brief output.

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { DEFAULT_ORG_ID, organizationIdForSession } from "@/lib/server/tenant";
import { callSkill } from "@/lib/agents/skill-registry";
import "@/lib/agents/handlers";

export const dynamic = "force-dynamic";

interface BriefItem {
  id: string;
  kind: string;
  priority: number;
  headline: string;
  subheadline?: string | null;
  cta_label: string;
  cta_href: string;
  risk?: string | null;
}

interface BriefData {
  items: BriefItem[];
  totals: {
    active_deals: number;
    pipeline_value_cents: number;
    weighted_pipeline_cents: number;
    stalled_count: number;
    pending_approvals: number;
  };
  composed_at: string;
  stale_at: string | null;
}

function fmt(cents: number) {
  if (cents >= 1_000_000_00) return `$${Math.round(cents / 1_000_000_00)}M`;
  if (cents >= 1_000_00) return `$${Math.round(cents / 1_000_00)}K`;
  return `$${Math.round(cents / 100)}`;
}

function riskColor(risk?: string | null) {
  if (risk === "high") return "#ef4444";
  if (risk === "medium") return "#f59e0b";
  return "#5d2cd6";
}

export default async function SuiteHomePage() {
  const headerList = await headers();
  const cookieHeader = headerList.get("cookie");
  const request = new Request("https://internal.local/suite/home", {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
  const context = getRuntimeContext(request);
  const session = await validateSession(context.env.DB, readSessionCookie(request));
  if (!session && !context.user.isLocalAdminBypass) {
    redirect("/login?next=/suite/home");
  }
  const organizationId = organizationIdForSession(session, DEFAULT_ORG_ID);
  const userEmail = session?.email || context.user.email || "";

  const result = await callSkill(
    {
      env: context.env,
      organization_id: organizationId,
      actor_type: "user",
      actor_id: userEmail,
    },
    "daily-brief",
    { organization_id: organizationId, user_email: userEmail },
  );

  const brief = result.ok ? (result.data as unknown as BriefData) : null;
  const items = brief?.items || [];
  const totals = brief?.totals;

  return (
    <div style={{ padding: "0 var(--suite-gutter, 32px) 48px", display: "flex", flexDirection: "column", gap: 28 }}>
      <div className="page-h">
        <div>
          <h1>Today.</h1>
          <div className="sub">
            {brief
              ? `Composed ${new Date(brief.composed_at).toLocaleTimeString()}${brief.stale_at ? " · serving cached" : ""}`
              : "Composing your brief..."}
          </div>
        </div>
      </div>

      {totals && (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <div style={{ border: "1px solid #e8e4de", borderRadius: 8, padding: 16, background: "#fff" }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6b6760" }}>Pipeline</div>
            <div style={{ fontSize: 24, fontWeight: 600, marginTop: 6, color: "#0d0c0a" }}>{fmt(totals.pipeline_value_cents)}</div>
            <div style={{ fontSize: 12, color: "#6b6760", marginTop: 4 }}>{totals.active_deals} active</div>
          </div>
          <div style={{ border: "1px solid #e8e4de", borderRadius: 8, padding: 16, background: "#fff" }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6b6760" }}>Weighted</div>
            <div style={{ fontSize: 24, fontWeight: 600, marginTop: 6, color: "#0d0c0a" }}>{fmt(totals.weighted_pipeline_cents)}</div>
          </div>
          <div style={{ border: "1px solid #e8e4de", borderRadius: 8, padding: 16, background: "#fff" }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6b6760" }}>Stalled</div>
            <div style={{ fontSize: 24, fontWeight: 600, marginTop: 6, color: totals.stalled_count > 0 ? "#ef4444" : "#0d0c0a" }}>{totals.stalled_count}</div>
          </div>
          <div style={{ border: "1px solid #e8e4de", borderRadius: 8, padding: 16, background: "#fff" }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6b6760" }}>Pending approval</div>
            <div style={{ fontSize: 24, fontWeight: 600, marginTop: 6, color: totals.pending_approvals > 0 ? "#f59e0b" : "#0d0c0a" }}>{totals.pending_approvals}</div>
          </div>
        </section>
      )}

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6760" }}>
          What needs you
        </div>
        {items.length === 0 && (
          <div style={{ padding: "32px 18px", border: "1px solid #e8e4de", borderRadius: 8, background: "#fff", textAlign: "center", color: "#6b6760", fontSize: 14 }}>
            Nothing urgent. Start a new deal or invite a teammate to keep moving.
          </div>
        )}
        {items.map((item) => (
          <a
            key={item.id}
            href={item.cta_href}
            style={{
              display: "grid",
              gridTemplateColumns: "8px 1fr auto",
              gap: 14,
              alignItems: "center",
              padding: "14px 18px",
              background: "#fff",
              border: "1px solid #e8e4de",
              borderRadius: 8,
              textDecoration: "none",
              color: "inherit",
              transition: "border-color 120ms ease",
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 999, background: riskColor(item.risk), alignSelf: "center" }} />
            <span>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#0d0c0a", lineHeight: 1.35 }}>{item.headline}</div>
              {item.subheadline && (
                <div style={{ fontSize: 12, color: "#6b6760", marginTop: 2, lineHeight: 1.4 }}>{item.subheadline}</div>
              )}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5d2cd6" }}>
              {item.cta_label}
            </span>
          </a>
        ))}
      </section>
    </div>
  );
}
