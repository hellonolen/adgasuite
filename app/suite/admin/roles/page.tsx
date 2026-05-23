import { AdminForbidden, AdminLayout, AdminPageHeader } from "@/components/suite/AdminLayout";
import { getAdminRuntime, isOwner, resolveAdminSession } from "@/lib/server/admin-session";

export const dynamic = "force-dynamic";

type Role = "owner" | "admin" | "member";

interface PermissionRow {
  key: string;
  label: string;
  description: string;
  owner: boolean;
  admin: boolean;
  member: boolean;
}

const ROLES: { id: Role; label: string; tagline: string }[] = [
  { id: "owner", label: "Owner", tagline: "Full control · single seat" },
  { id: "admin", label: "Admin", tagline: "Workspace operations" },
  { id: "member", label: "Member", tagline: "Day-to-day work" },
];

const PERMISSIONS: PermissionRow[] = [
  {
    key: "deals.view",
    label: "View deals",
    description: "Browse the deal pipeline and detail views.",
    owner: true,
    admin: true,
    member: true,
  },
  {
    key: "deals.create",
    label: "Create deals",
    description: "Open new deal records and assign them to teammates.",
    owner: true,
    admin: true,
    member: true,
  },
  {
    key: "deals.sign",
    label: "Sign deals",
    description: "Send documents for signature and finalize agreements.",
    owner: true,
    admin: true,
    member: false,
  },
  {
    key: "billing.configure",
    label: "Configure billing",
    description: "Manage subscription, payment connectors, and invoices.",
    owner: true,
    admin: false,
    member: false,
  },
  {
    key: "team.manage",
    label: "Manage team",
    description: "Invite teammates, change roles, remove access.",
    owner: true,
    admin: false,
    member: false,
  },
];

function Cell({ allowed }: { allowed: boolean }) {
  if (allowed) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full bg-[#ede5fb] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5d2cd6]"
        aria-label="Allowed"
      >
        Allowed
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-[#f1ede8] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6b6760]"
      aria-label="No access"
    >
      —
    </span>
  );
}

async function loadOrg(organizationId: string | null) {
  const { context } = await getAdminRuntime();
  const db = context.env.DB;
  if (!db || !organizationId) return "ADGA";
  const row = await db
    .prepare("SELECT name FROM organizations WHERE id = ? LIMIT 1")
    .bind(organizationId)
    .first<{ name: string | null }>();
  return row?.name || "ADGA";
}

export default async function AdminRolesPage() {
  const session = await resolveAdminSession();
  if (!isOwner(session)) {
    return <AdminForbidden email={session?.email ?? null} />;
  }

  const organizationName = await loadOrg(session!.organizationId);

  return (
    <AdminLayout
      pathname="/suite/admin/roles"
      ownerEmail={session!.email}
      organizationName={organizationName}
    >
      <AdminPageHeader
        title="Roles & permissions"
        description="What each role can do in the workspace today."
      />

      <div className="mb-4 rounded-2xl border border-[#ede5fb] bg-[#faf7ff] px-4 py-3 text-sm text-[#4a23ac]">
        This matrix is read-only. A permissions editor with custom roles is coming soon.
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--rule,#e8e4de)] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-[var(--rule,#e8e4de)] bg-[#fafaf7] text-left text-[10px] uppercase tracking-[0.16em] text-[#6b6760]">
                <th className="px-5 py-3 font-semibold">Permission</th>
                {ROLES.map((role) => (
                  <th key={role.id} className="px-5 py-3 font-semibold">
                    <div>{role.label}</div>
                    <div className="mt-0.5 text-[10px] font-normal normal-case tracking-normal text-[#6b6760]">
                      {role.tagline}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((permission) => (
                <tr
                  key={permission.key}
                  className="border-b border-[var(--rule,#e8e4de)] last:border-b-0"
                >
                  <td className="px-5 py-4">
                    <div className="font-medium text-[#0d0c0a]">{permission.label}</div>
                    <div className="mt-0.5 text-xs text-[#6b6760]">{permission.description}</div>
                  </td>
                  <td className="px-5 py-4"><Cell allowed={permission.owner} /></td>
                  <td className="px-5 py-4"><Cell allowed={permission.admin} /></td>
                  <td className="px-5 py-4"><Cell allowed={permission.member} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
