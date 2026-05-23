import {
  AdminForbidden,
  AdminLayout,
  AdminPageHeader,
  EmptyState,
} from "@/components/suite/AdminLayout";
import { AuditFilter } from "@/components/suite/AuditFilter";
import { getAdminRuntime, isOwner, resolveAdminSession } from "@/lib/server/admin-session";

export const dynamic = "force-dynamic";

interface SearchParams {
  type?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

interface EventRow {
  id: string;
  event_type: string;
  actor_type: string | null;
  actor_id: string | null;
  resource_type: string | null;
  resource_id: string | null;
  created_at: string;
  actor_email?: string | null;
}

interface AuditRow {
  id: string;
  action: string;
  actor_user_id: string | null;
  resource_type: string | null;
  resource_id: string | null;
  created_at: string;
  actor_email?: string | null;
}

type FeedRow = {
  id: string;
  source: "audit" | "events";
  action: string;
  actor: string;
  resourceType: string;
  resourceId: string;
  timestamp: string;
};

async function loadFeed(organizationId: string | null, typeFilter: string | null) {
  const { context } = await getAdminRuntime();
  const db = context.env.DB;
  const empty = { rows: [] as FeedRow[], eventTypes: [] as string[], hasDb: false, source: "audit" as "audit" | "events", organizationName: "ADGA" };
  if (!db || !organizationId) return empty;

  const org = await db
    .prepare("SELECT name FROM organizations WHERE id = ? LIMIT 1")
    .bind(organizationId)
    .first<{ name: string | null }>();

  // Prefer audit_log when populated. Otherwise fall back to events.
  const auditCountRow = await db
    .prepare("SELECT COUNT(*) as count FROM audit_log WHERE organization_id = ?")
    .bind(organizationId)
    .first<{ count: number | null }>();
  const useAudit = (auditCountRow?.count || 0) > 0;

  if (useAudit) {
    const typesResult = await db
      .prepare("SELECT DISTINCT action FROM audit_log WHERE organization_id = ? ORDER BY action ASC LIMIT 50")
      .bind(organizationId)
      .all<{ action: string }>();
    const eventTypes = (typesResult.results || []).map((r) => r.action).filter(Boolean);

    const rowsResult = typeFilter
      ? await db
          .prepare(
            `SELECT a.id, a.action, a.actor_user_id, a.resource_type, a.resource_id, a.created_at, u.email as actor_email
             FROM audit_log a
             LEFT JOIN users u ON u.id = a.actor_user_id
             WHERE a.organization_id = ? AND a.action = ?
             ORDER BY a.created_at DESC
             LIMIT 100`,
          )
          .bind(organizationId, typeFilter)
          .all<AuditRow>()
      : await db
          .prepare(
            `SELECT a.id, a.action, a.actor_user_id, a.resource_type, a.resource_id, a.created_at, u.email as actor_email
             FROM audit_log a
             LEFT JOIN users u ON u.id = a.actor_user_id
             WHERE a.organization_id = ?
             ORDER BY a.created_at DESC
             LIMIT 100`,
          )
          .bind(organizationId)
          .all<AuditRow>();

    const rows: FeedRow[] = (rowsResult.results || []).map((row) => ({
      id: row.id,
      source: "audit",
      action: row.action,
      actor: row.actor_email || row.actor_user_id || "system",
      resourceType: row.resource_type || "—",
      resourceId: row.resource_id || "—",
      timestamp: row.created_at,
    }));

    return {
      rows,
      eventTypes,
      hasDb: true,
      source: "audit" as const,
      organizationName: org?.name || "ADGA",
    };
  }

  const typesResult = await db
    .prepare(
      "SELECT DISTINCT event_type FROM events WHERE organization_id = ? ORDER BY event_type ASC LIMIT 50",
    )
    .bind(organizationId)
    .all<{ event_type: string }>();
  const eventTypes = (typesResult.results || []).map((r) => r.event_type).filter(Boolean);

  const rowsResult = typeFilter
    ? await db
        .prepare(
          `SELECT e.id, e.event_type, e.actor_type, e.actor_id, e.resource_type, e.resource_id, e.created_at, u.email as actor_email
           FROM events e
           LEFT JOIN users u ON u.id = e.actor_id
           WHERE e.organization_id = ? AND e.event_type = ?
           ORDER BY e.created_at DESC
           LIMIT 100`,
        )
        .bind(organizationId, typeFilter)
        .all<EventRow>()
    : await db
        .prepare(
          `SELECT e.id, e.event_type, e.actor_type, e.actor_id, e.resource_type, e.resource_id, e.created_at, u.email as actor_email
           FROM events e
           LEFT JOIN users u ON u.id = e.actor_id
           WHERE e.organization_id = ?
           ORDER BY e.created_at DESC
           LIMIT 100`,
        )
        .bind(organizationId)
        .all<EventRow>();

  const rows: FeedRow[] = (rowsResult.results || []).map((row) => ({
    id: row.id,
    source: "events",
    action: row.event_type,
    actor: row.actor_email || row.actor_id || row.actor_type || "system",
    resourceType: row.resource_type || "—",
    resourceId: row.resource_id || "—",
    timestamp: row.created_at,
  }));

  return {
    rows,
    eventTypes,
    hasDb: true,
    source: "events" as const,
    organizationName: org?.name || "ADGA",
  };
}

function formatTimestamp(value: string): string {
  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const session = await resolveAdminSession();
  if (!isOwner(session)) {
    return <AdminForbidden email={session?.email ?? null} />;
  }

  const { type } = await searchParams;
  const typeFilter = type && type.trim() ? type.trim() : null;
  const data = await loadFeed(session!.organizationId, typeFilter);

  return (
    <AdminLayout
      pathname="/suite/admin/audit"
      ownerEmail={session!.email}
      organizationName={data.organizationName}
    >
      <AdminPageHeader
        title="Audit log"
        description={`Last 100 events from the ${data.source === "audit" ? "audit_log" : "events"} table.`}
        action={<AuditFilter eventTypes={data.eventTypes} value={typeFilter} />}
      />

      {!data.hasDb ? (
        <EmptyState
          title="Database not configured"
          description="Connect a Cloudflare D1 binding to view audit history."
        />
      ) : data.rows.length === 0 ? (
        <EmptyState
          title="No events match"
          description={
            typeFilter
              ? `Nothing recorded for event type "${typeFilter}" yet.`
              : "Activity will appear here as your team works in the suite."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--rule,#e8e4de)] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-[var(--rule,#e8e4de)] bg-[#fafaf7] text-left text-[10px] uppercase tracking-[0.16em] text-[#6b6760]">
                  <th className="px-5 py-3 font-semibold">When</th>
                  <th className="px-5 py-3 font-semibold">Actor</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                  <th className="px-5 py-3 font-semibold">Resource</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr
                    key={`${row.source}:${row.id}`}
                    className="border-b border-[var(--rule,#e8e4de)] last:border-b-0 hover:bg-[#fafaf7]"
                  >
                    <td className="px-5 py-3 whitespace-nowrap text-[#6b6760] tabular-nums">
                      {formatTimestamp(row.timestamp)}
                    </td>
                    <td className="px-5 py-3 text-[#0d0c0a]">{row.actor}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-md bg-[#f1ede8] px-2 py-0.5 font-mono text-[12px] text-[#4f485d]">
                        {row.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[#4f485d]">
                      <span className="font-medium">{row.resourceType}</span>
                      {row.resourceId !== "—" && (
                        <span className="ml-1 font-mono text-xs text-[#6b6760]">· {row.resourceId}</span>
                      )}
                    </td>
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
