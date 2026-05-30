// /suite/settings/seats — Closes GAP #4.
// Workspace seat management: current usage vs. included seats, plus a
// "Add seats" CTA that hands off to Stripe billing portal (when wired)
// or surfaces the operator's billing email path as a fallback.

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { DEFAULT_ORG_ID, organizationIdForSession } from "@/lib/server/tenant";
import { loadWorkspaceBillingState } from "@/lib/server/billing";
import InviteForm from "./InviteForm";

export const dynamic = "force-dynamic";

const INCLUDED_SEATS_BY_PLAN: Record<string, number> = {
  pro: 1,
  individual: 1,
  solo: 1,
  essential: 1,
  professional: 1,
  team: 3,
  teams: 3,
  suite: 3,
  enterprise: 10,
};

const SEAT_PRICE_MONTHLY_BY_PLAN: Record<string, number> = {
  pro: 9900,
  team: 9900,
  teams: 9900,
  enterprise: 14900,
};

interface MemberRow {
  user_id: string;
  email: string;
  member_role: string;
  joined_at: string;
}

async function loadMembers(db: D1Database | undefined, organizationId: string): Promise<MemberRow[]> {
  if (!db) return [];
  const result = await db
    .prepare(
      `SELECT om.user_id, u.email, om.role as member_role, om.created_at as joined_at
         FROM organization_members om
         JOIN users u ON u.id = om.user_id
        WHERE om.organization_id = ?
        ORDER BY om.created_at ASC`,
    )
    .bind(organizationId)
    .all<MemberRow>()
    .catch(() => ({ results: [] as MemberRow[] }));
  return result.results || [];
}

function fmtUsd(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
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

export default async function SuiteSettingsSeatsPage() {
  const headerList = await headers();
  const cookieHeader = headerList.get("cookie");
  const request = new Request("https://internal.local/suite/settings/seats", {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
  const context = getRuntimeContext(request);
  const session = await validateSession(context.env.DB, readSessionCookie(request));
  if (!session && !context.user.isLocalAdminBypass) {
    redirect("/login?next=/suite/settings/seats");
  }
  if (session && session.role !== "owner" && session.role !== "admin") {
    redirect("/suite");
  }

  const organizationId = organizationIdForSession(session, DEFAULT_ORG_ID);
  const [billing, members] = await Promise.all([
    loadWorkspaceBillingState(context, request),
    loadMembers(context.env.DB, organizationId),
  ]);

  const planKey = (billing.plan || "team").toLowerCase();
  const includedSeats = INCLUDED_SEATS_BY_PLAN[planKey] ?? 1;
  const seatPriceCents = SEAT_PRICE_MONTHLY_BY_PLAN[planKey] ?? 9900;
  const used = members.length;
  const extra = Math.max(0, used - includedSeats);
  const monthlyExtraCents = extra * seatPriceCents;

  return (
    <div style={{ padding: "0 var(--suite-gutter, 32px) 48px", display: "flex", flexDirection: "column", gap: 28 }}>
      <div className="page-h">
        <div>
          <h1>Seats.</h1>
          <div className="sub">Workspace members and seat usage.</div>
        </div>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <Metric label="Plan" value={billing.plan} sub={billing.status} />
        <Metric label="Included seats" value={String(includedSeats)} />
        <Metric label="Used" value={String(used)} sub={`${Math.max(0, includedSeats - used)} remaining included`} />
        <Metric label="Extra seats" value={String(extra)} sub={extra > 0 ? `${fmtUsd(monthlyExtraCents)}/mo` : undefined} />
      </section>

      <section style={{ border: "1px solid #e8e4de", borderRadius: 8, background: "#fff", padding: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6760", marginBottom: 12 }}>
          Invite a teammate
        </div>
        <InviteForm defaultRole="member" />
        <div style={{ marginTop: 10, fontSize: 12, color: "#6b6760" }}>
          Invitee receives a one-click join link valid for 14 days.
        </div>
      </section>

      <section style={{ border: "1px solid #e8e4de", borderRadius: 8, background: "#fff" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #e8e4de", background: "#f9f7f4", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6760" }}>
            Members
          </span>
          <form action="/api/billing/stripe/portal" method="post">
            <button
              type="submit"
              style={{
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                background: "#5d2cd6",
                color: "#ffffff",
                border: "none",
                borderRadius: 999,
                cursor: "pointer",
              }}
            >
              Add seats
            </button>
          </form>
        </div>
        {members.length === 0 && (
          <div style={{ padding: "24px 16px", fontSize: 13, color: "#6b6760" }}>No members yet.</div>
        )}
        {members.map((m) => (
          <div key={m.user_id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, padding: "12px 16px", borderBottom: "1px solid #f1ede8", fontSize: 13 }}>
            <span style={{ color: "#0d0c0a", fontWeight: 500 }}>{m.email}</span>
            <span style={{ color: "#6b6760" }}>{m.member_role}</span>
            <span style={{ color: "#6b6760", textAlign: "right" }}>{new Date(m.joined_at).toLocaleDateString()}</span>
          </div>
        ))}
      </section>

      <section style={{ fontSize: 12, color: "#6b6760", lineHeight: 1.5 }}>
        Adding seats opens your Stripe billing portal. New seats are pro-rated for the current billing cycle.
        Each extra seat costs {fmtUsd(seatPriceCents)}/month on the {billing.plan} plan.
      </section>
    </div>
  );
}
