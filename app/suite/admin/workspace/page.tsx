import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { DEFAULT_ORG_ID, organizationIdForSession } from "@/lib/server/tenant";

export const dynamic = "force-dynamic";

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  subscription_status: string;
  created_at: string;
}

interface Stats {
  members: number;
  deals: number;
  maps: number;
  documents: number;
}

async function loadOrg(db: D1Database | undefined, organizationId: string) {
  if (!db) return { org: null, stats: null } as { org: OrgRow | null; stats: Stats | null };
  const org = await db
    .prepare("SELECT id, name, slug, plan, subscription_status, created_at FROM organizations WHERE id = ?")
    .bind(organizationId)
    .first<OrgRow>()
    .catch(() => null);
  if (!org) return { org: null, stats: null };
  const [members, deals, maps, documents] = await Promise.all([
    db.prepare("SELECT COUNT(*) as c FROM organization_members WHERE organization_id = ?").bind(organizationId).first<{ c: number }>().catch(() => null),
    db.prepare("SELECT COUNT(*) as c FROM deals WHERE organization_id = ? AND archived_at IS NULL").bind(organizationId).first<{ c: number }>().catch(() => null),
    db.prepare("SELECT COUNT(*) as c FROM maps WHERE organization_id = ? AND archived_at IS NULL").bind(organizationId).first<{ c: number }>().catch(() => null),
    db.prepare("SELECT COUNT(*) as c FROM documents WHERE organization_id = ?").bind(organizationId).first<{ c: number }>().catch(() => null),
  ]);
  return {
    org,
    stats: {
      members: members?.c || 0,
      deals: deals?.c || 0,
      maps: maps?.c || 0,
      documents: documents?.c || 0,
    },
  };
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid #e8e4de", borderRadius: 8, padding: 18, background: "#fff" }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6b6760" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600, marginTop: 8, color: "#0d0c0a", letterSpacing: "-0.02em" }}>{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #f1ede8", fontSize: 14 }}>
      <span style={{ color: "#6b6760" }}>{label}</span>
      <span style={{ color: "#0d0c0a", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export default async function SuiteAdminWorkspacePage() {
  const headerList = await headers();
  const cookieHeader = headerList.get("cookie");
  const request = new Request("https://internal.local/suite/admin/workspace", {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
  const context = getRuntimeContext(request);
  const session = await validateSession(context.env.DB, readSessionCookie(request));
  if (!session && !context.user.isLocalAdminBypass) {
    redirect("/login?next=/suite/admin/workspace");
  }
  if (session && session.role !== "owner" && session.role !== "admin") {
    redirect("/suite");
  }
  const organizationId = organizationIdForSession(session, DEFAULT_ORG_ID);
  const { org, stats } = await loadOrg(context.env.DB, organizationId);

  if (!org) {
    return (
      <div style={{ padding: "0 var(--suite-gutter, 32px) 48px" }}>
        <h1>Workspace</h1>
        <p style={{ color: "#6b6760" }}>Workspace data unavailable.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 var(--suite-gutter, 32px) 48px", display: "flex", flexDirection: "column", gap: 28 }}>
      <div className="page-h">
        <div>
          <h1>Workspace.</h1>
          <div className="sub">Settings and stats for the {org.name} workspace.</div>
        </div>
      </div>

      {stats && (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <Metric label="Members" value={String(stats.members)} />
          <Metric label="Active deals" value={String(stats.deals)} />
          <Metric label="Active dealflows" value={String(stats.maps)} />
          <Metric label="Documents" value={String(stats.documents)} />
        </section>
      )}

      <section style={{ border: "1px solid #e8e4de", borderRadius: 8, background: "#fff" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #e8e4de", background: "#f9f7f4", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6760" }}>
          Identity
        </div>
        <Row label="Workspace name" value={org.name} />
        <Row label="Slug" value={org.slug} />
        <Row label="Plan" value={org.plan} />
        <Row label="Subscription status" value={org.subscription_status} />
        <Row label="Created" value={new Date(org.created_at).toLocaleDateString()} />
      </section>

      <section style={{ border: "1px solid #f59e0b", borderRadius: 8, background: "rgba(245, 158, 11, 0.04)", padding: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#b45309" }}>Danger zone</div>
        <div style={{ marginTop: 8, fontSize: 14, color: "#0d0c0a" }}>
          Workspace deletion permanently archives every deal, dealflow, contact, and document. Only the workspace owner can initiate this; contact support to request a permanent delete.
        </div>
      </section>
    </div>
  );
}
