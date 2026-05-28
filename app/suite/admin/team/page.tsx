import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { DEFAULT_ORG_ID, organizationIdForSession } from "@/lib/server/tenant";

export const dynamic = "force-dynamic";

interface MemberRow {
  user_id: string;
  email: string;
  name: string | null;
  user_role: string;
  member_role: string;
  joined_at: string;
  last_session_at: string | null;
}

async function loadTeam(db: D1Database | undefined, organizationId: string): Promise<MemberRow[]> {
  if (!db) return [];
  const result = await db
    .prepare(
      `SELECT u.id as user_id, u.email, u.name, u.role as user_role,
              om.role as member_role, om.created_at as joined_at,
              (SELECT MAX(created_at) FROM sessions s WHERE s.user_id = u.id) as last_session_at
         FROM organization_members om
         JOIN users u ON u.id = om.user_id
        WHERE om.organization_id = ?
        ORDER BY om.created_at DESC`,
    )
    .bind(organizationId)
    .all<MemberRow>()
    .catch(() => ({ results: [] as MemberRow[] }));
  return result.results || [];
}

function timeAgo(iso: string | null) {
  if (!iso) return "Never";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const delta = Date.now() - t;
  const mins = Math.round(delta / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default async function SuiteAdminTeamPage() {
  const headerList = await headers();
  const cookieHeader = headerList.get("cookie");
  const request = new Request("https://internal.local/suite/admin/team", {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
  const context = getRuntimeContext(request);
  const session = await validateSession(context.env.DB, readSessionCookie(request));
  if (!session && !context.user.isLocalAdminBypass) {
    redirect("/login?next=/suite/admin/team");
  }
  if (session && session.role !== "owner" && session.role !== "admin") {
    redirect("/suite");
  }
  const organizationId = organizationIdForSession(session, DEFAULT_ORG_ID);
  const members = await loadTeam(context.env.DB, organizationId);

  return (
    <div style={{ padding: "0 var(--suite-gutter, 32px) 48px", display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="page-h">
        <div>
          <h1>Team.</h1>
          <div className="sub">
            {members.length} {members.length === 1 ? "member" : "members"} in your workspace.
          </div>
        </div>
      </div>

      <section>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", border: "1px solid #e8e4de", borderRadius: 8 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e8e4de", background: "#f9f7f4" }}>
              <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6760" }}>Name</th>
              <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6760" }}>Email</th>
              <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6760" }}>Role</th>
              <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6760" }}>Joined</th>
              <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6760" }}>Last sign-in</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.user_id} style={{ borderBottom: "1px solid #f1ede8" }}>
                <td style={{ padding: "14px 16px", fontSize: 14, color: "#0d0c0a", fontWeight: 500 }}>{m.name || m.email.split("@")[0]}</td>
                <td style={{ padding: "14px 16px", fontSize: 13, color: "#6b6760" }}>{m.email}</td>
                <td style={{ padding: "14px 16px", fontSize: 12 }}>
                  <span style={{ padding: "3px 8px", borderRadius: 999, background: m.member_role === "owner" ? "rgba(86, 36, 199, 0.1)" : m.member_role === "admin" ? "rgba(86, 36, 199, 0.05)" : "#f1ede8", color: m.member_role === "owner" || m.member_role === "admin" ? "#5d2cd6" : "#6b6760", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", fontSize: 10 }}>
                    {m.member_role}
                  </span>
                </td>
                <td style={{ padding: "14px 16px", fontSize: 13, color: "#6b6760" }}>{timeAgo(m.joined_at)}</td>
                <td style={{ padding: "14px 16px", fontSize: 13, color: "#6b6760" }}>{timeAgo(m.last_session_at)}</td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr><td colSpan={5} style={{ padding: "32px 16px", textAlign: "center", color: "#6b6760", fontSize: 13 }}>No team members yet.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
