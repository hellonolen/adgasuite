import { AdminForbidden, AdminLayout, AdminPageHeader } from "@/components/suite/AdminLayout";
import { WorkspaceSettingsForm } from "@/components/suite/WorkspaceSettingsForm";
import { getAdminRuntime, isOwner, resolveAdminSession } from "@/lib/server/admin-session";

export const dynamic = "force-dynamic";

interface OrgRow {
  name: string | null;
  slug: string | null;
  plan: string | null;
}

async function loadWorkspace(organizationId: string | null) {
  const { context } = await getAdminRuntime();
  const db = context.env.DB;
  if (!db || !organizationId) {
    return {
      name: "ADGA",
      slug: "adga",
      plan: "suite",
      hasDb: false,
    };
  }
  const row = await db
    .prepare("SELECT name, slug, plan FROM organizations WHERE id = ? LIMIT 1")
    .bind(organizationId)
    .first<OrgRow>();
  return {
    name: row?.name || "ADGA",
    slug: row?.slug || "adga",
    plan: row?.plan || "suite",
    hasDb: true,
  };
}

export default async function AdminWorkspacePage() {
  const session = await resolveAdminSession();
  if (!isOwner(session)) {
    return <AdminForbidden email={session?.email ?? null} />;
  }

  const workspace = await loadWorkspace(session!.organizationId);

  return (
    <AdminLayout
      pathname="/suite/admin/workspace"
      ownerEmail={session!.email}
      organizationName={workspace.name}
    >
      <AdminPageHeader
        title="Workspace settings"
        description="Org-wide defaults that apply to everyone."
      />

      {!workspace.hasDb && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          D1 binding is not configured locally. Changes will save to the stub API but won't persist.
        </div>
      )}

      <WorkspaceSettingsForm
        defaults={{
          name: workspace.name,
          domain: `${workspace.slug}.adga.app`,
          plan: workspace.plan,
          defaultDealType: "advisory",
          businessHoursStart: "09:00",
          businessHoursEnd: "18:00",
          timezone: "America/New_York",
        }}
      />
    </AdminLayout>
  );
}
