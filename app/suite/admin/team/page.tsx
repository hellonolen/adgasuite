import {
  AdminForbidden,
  AdminLayout,
  AdminPageHeader,
  EmptyState,
} from "@/components/suite/AdminLayout";
import { InviteTeammate } from "@/components/suite/InviteTeammate";
import { getAdminRuntime, isOwner, resolveAdminSession } from "@/lib/server/admin-session";

export const dynamic = "force-dynamic";

interface MemberRow {
  user_id: string;
  email: string;
  name: string | null;
  role: string;
  joined_at: string | null;
  last_session_at: string | null;
}

async function loadMembers(organizationId: string | null) {
  const { context } = await getAdminRuntime();
  const db = context.env.DB;

  if (!db || !organizationId) {
    return { members: [] as MemberRow[], hasDb: false, organizationName: "ADGA" };
  }

  const [members, org] = await Promise.all([
    db
      .prepare(
        `SELECT
           u.id as user_id,
           u.email as email,
           u.name as name,
           m.role as role,
           m.created_at as joined_at,
           (SELECT MAX(s.created_at) FROM sessions s WHERE s.user_id = u.id) as last_session_at
         FROM organization_members m
         INNER JOIN users u ON u.id = m.user_id
         WHERE m.organization_id = ?
         ORDER BY
           CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
           u.email ASC`,
      )
      .bind(organizationId)
      .all<MemberRow>(),
    db.prepare("SELECT name FROM organizations WHERE id = ? LIMIT 1").bind(organizationId).first<{ name: string | null }>(),
  ]);

  return {
    members: members.results || [],
    hasDb: true,
    organizationName: org?.name || "ADGA",
  };
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatRelative(value: string | null): string {
  if (!value) return "Never";
  try {
    const then = new Date(value).getTime();
    const diff = Date.now() - then;
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(value).toLocaleDateString();
  } catch {
    return "—";
  }
}

function RoleBadge({ role }: { role: string }) {
  const palette: Record<string, { bg: string; fg: string; label: string }> = {
    owner: { bg: "#ede5fb", fg: "#5d2cd6", label: "Owner" },
    admin: { bg: "#e6f1fb", fg: "#1e5fbf", label: "Admin" },
    member: { bg: "#f1ede8", fg: "#4f485d", label: "Member" },
  };
  const tone = palette[role] || palette.member;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]"
      style={{ background: tone.bg, color: tone.fg }}
    >
      {tone.label}
    </span>
  );
}

export default async function AdminTeamPage() {
  const session = await resolveAdminSession();
  if (!isOwner(session)) {
    return <AdminForbidden email={session?.email ?? null} />;
  }

  const data = await loadMembers(session!.organizationId);

  return (
    <AdminLayout
      pathname="/suite/admin/team"
      ownerEmail={session!.email}
      organizationName={data.organizationName}
    >
      <AdminPageHeader
        title="Team members"
        description="Everyone with access to this workspace. Invite teammates via magic link."
        action={<InviteTeammate />}
      />

      {!data.hasDb ? (
        <EmptyState
          title="Database not configured"
          description="Connect a Cloudflare D1 binding to manage the team."
        />
      ) : data.members.length === 0 ? (
        <EmptyState
          title="No teammates yet"
          description="Invite your first teammate to start collaborating."
          action={<InviteTeammate />}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--rule,#e8e4de)] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[var(--rule,#e8e4de)] bg-[#fafaf7] text-left text-[10px] uppercase tracking-[0.16em] text-[#6b6760]">
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Joined</th>
                  <th className="px-5 py-3 font-semibold">Last active</th>
                </tr>
              </thead>
              <tbody>
                {data.members.map((member) => (
                  <tr
                    key={member.user_id}
                    className="border-b border-[var(--rule,#e8e4de)] last:border-b-0 hover:bg-[#fafaf7]"
                  >
                    <td className="px-5 py-3 font-medium text-[#0d0c0a]">
                      {member.name || member.email.split("@")[0]}
                    </td>
                    <td className="px-5 py-3 text-[#4f485d]">{member.email}</td>
                    <td className="px-5 py-3">
                      <RoleBadge role={member.role} />
                    </td>
                    <td className="px-5 py-3 text-[#6b6760]">{formatDate(member.joined_at)}</td>
                    <td className="px-5 py-3 text-[#6b6760]">{formatRelative(member.last_session_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
