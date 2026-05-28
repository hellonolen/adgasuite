import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";

export const dynamic = "force-dynamic";

const PERMISSIONS: Array<{ feature: string; owner: boolean; admin: boolean; member: boolean }> = [
  { feature: "View all deals",                     owner: true,  admin: true,  member: true },
  { feature: "Create and edit deals",              owner: true,  admin: true,  member: true },
  { feature: "Delete or archive deals",            owner: true,  admin: true,  member: false },
  { feature: "Invite team members",                owner: true,  admin: true,  member: false },
  { feature: "Change member roles",                owner: true,  admin: false, member: false },
  { feature: "Manage billing and subscription",    owner: true,  admin: false, member: false },
  { feature: "Connect / disconnect integrations",  owner: true,  admin: true,  member: false },
  { feature: "View audit log",                     owner: true,  admin: true,  member: false },
  { feature: "Export workspace data",              owner: true,  admin: true,  member: false },
  { feature: "Delete workspace",                   owner: true,  admin: false, member: false },
];

const cell = (allowed: boolean) =>
  allowed
    ? <span style={{ color: "#16a34a", fontWeight: 600 }}>Yes</span>
    : <span style={{ color: "#a8a39c" }}>—</span>;

export default async function SuiteAdminRolesPage() {
  const headerList = await headers();
  const cookieHeader = headerList.get("cookie");
  const request = new Request("https://internal.local/suite/admin/roles", {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
  const context = getRuntimeContext(request);
  const session = await validateSession(context.env.DB, readSessionCookie(request));
  if (!session && !context.user.isLocalAdminBypass) {
    redirect("/login?next=/suite/admin/roles");
  }
  if (session && session.role !== "owner" && session.role !== "admin") {
    redirect("/suite");
  }

  return (
    <div style={{ padding: "0 var(--suite-gutter, 32px) 48px", display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="page-h">
        <div>
          <h1>Roles & Permissions.</h1>
          <div className="sub">What each role can do in this workspace.</div>
        </div>
      </div>

      <section>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", border: "1px solid #e8e4de", borderRadius: 8 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e8e4de", background: "#f9f7f4" }}>
              <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6760" }}>Permission</th>
              <th style={{ textAlign: "center", padding: "12px 16px", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#5d2cd6" }}>Owner</th>
              <th style={{ textAlign: "center", padding: "12px 16px", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#5d2cd6" }}>Admin</th>
              <th style={{ textAlign: "center", padding: "12px 16px", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6760" }}>Member</th>
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((p) => (
              <tr key={p.feature} style={{ borderBottom: "1px solid #f1ede8" }}>
                <td style={{ padding: "14px 16px", fontSize: 14, color: "#0d0c0a" }}>{p.feature}</td>
                <td style={{ padding: "14px 16px", textAlign: "center", fontSize: 13 }}>{cell(p.owner)}</td>
                <td style={{ padding: "14px 16px", textAlign: "center", fontSize: 13 }}>{cell(p.admin)}</td>
                <td style={{ padding: "14px 16px", textAlign: "center", fontSize: 13 }}>{cell(p.member)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <div className="muted text-xs" style={{ fontSize: 12, color: "#6b6760", lineHeight: 1.5 }}>
          Role assignments are visible on the Team page. Only the workspace owner can change another user&apos;s role.
        </div>
      </section>
    </div>
  );
}
