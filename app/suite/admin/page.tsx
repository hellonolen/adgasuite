import Link from "next/link";

import {
  AdminForbidden,
  AdminLayout,
  AdminPageHeader,
  EmptyState,
} from "@/components/suite/AdminLayout";
import { getAdminRuntime, isOwner, resolveAdminSession } from "@/lib/server/admin-session";

export const dynamic = "force-dynamic";

interface CountRow {
  count: number | null;
}

interface OrgRow {
  name: string | null;
}

async function loadOverview(organizationId: string | null) {
  const { context } = await getAdminRuntime();
  const db = context.env.DB;

  if (!db || !organizationId) {
    return {
      organizationName: "ADGA",
      memberCount: 0,
      pendingInvites: 0,
      eventsLast24h: 0,
      hasDb: false,
    };
  }

  const [orgRow, members, eventCount] = await Promise.all([
    db.prepare("SELECT name FROM organizations WHERE id = ? LIMIT 1").bind(organizationId).first<OrgRow>(),
    db
      .prepare("SELECT COUNT(*) as count FROM organization_members WHERE organization_id = ?")
      .bind(organizationId)
      .first<CountRow>(),
    db
      .prepare(
        "SELECT COUNT(*) as count FROM events WHERE organization_id = ? AND datetime(created_at) > datetime('now', '-1 day')",
      )
      .bind(organizationId)
      .first<CountRow>(),
  ]);

  return {
    organizationName: orgRow?.name || "ADGA",
    memberCount: members?.count || 0,
    pendingInvites: 0,
    eventsLast24h: eventCount?.count || 0,
    hasDb: true,
  };
}

export default async function AdminOverviewPage() {
  const session = await resolveAdminSession();
  if (!isOwner(session)) {
    return <AdminForbidden email={session?.email ?? null} />;
  }

  const overview = await loadOverview(session!.organizationId);

  return (
    <AdminLayout
      pathname="/suite/admin"
      ownerEmail={session!.email}
      organizationName={overview.organizationName}
    >
      <AdminPageHeader
        title="Overview"
        description="Workspace-wide controls. This surface is owner-only and separate from per-user settings."
      />

      {!overview.hasDb && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          D1 binding is not configured locally. Stats will populate once the database is wired.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Team members" value={overview.memberCount} hint="Active workspace seats" />
        <StatCard label="Pending invites" value={overview.pendingInvites} hint="Awaiting acceptance" />
        <StatCard label="Events · 24h" value={overview.eventsLast24h} hint="Across all resources" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <QuickAction
          title="Invite a teammate"
          description="Send a magic link to add a new member."
          href="/suite/admin/team"
          cta="Open team"
        />
        <QuickAction
          title="Review permissions"
          description="See what each role can do in the workspace."
          href="/suite/admin/roles"
          cta="View roles"
        />
        <QuickAction
          title="Audit recent activity"
          description="Inspect the last 100 events recorded in the workspace."
          href="/suite/admin/audit"
          cta="Open audit log"
        />
        <QuickAction
          title="Workspace settings"
          description="Update workspace name, domain, defaults, and time zone."
          href="/suite/admin/workspace"
          cta="Edit workspace"
        />
      </div>

      {overview.memberCount === 0 && (
        <div className="mt-6">
          <EmptyState
            title="No teammates yet"
            description="Invite your first teammate to start collaborating on deals."
            action={
              <Link
                href="/suite/admin/team"
                className="inline-flex items-center justify-center rounded-md bg-[#5d2cd6] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4a23ac]"
              >
                Invite teammate
              </Link>
            }
          />
        </div>
      )}
    </AdminLayout>
  );
}

function StatCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-2xl border border-[var(--rule,#e8e4de)] bg-white p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-[#0d0c0a] tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-[#6b6760]">{hint}</div>
    </div>
  );
}

function QuickAction({
  title,
  description,
  href,
  cta,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-[var(--rule,#e8e4de)] bg-white p-5 transition-colors hover:border-[#5d2cd6]"
    >
      <div className="text-base font-semibold text-[#0d0c0a]">{title}</div>
      <p className="mt-1 text-sm text-[#6b6760]">{description}</p>
      <div className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#5d2cd6] group-hover:underline">
        {cta} →
      </div>
    </Link>
  );
}
