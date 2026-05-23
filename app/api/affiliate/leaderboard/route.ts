import { json } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";

interface LeaderRow {
  id: string;
  email: string;
  name: string;
  revenue_cents: number;
  paid_accounts: number;
  signups: number;
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "Anonymous";
  const initials = local
    .split(/[.\-_]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
  return `${initials || local[0]?.toUpperCase() || "?"}··· @${domain}`;
}

// Workspace-scoped leaderboard. Initials + domain only — no full names or emails leak.
export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  const db = context.env.DB;

  if (!db) return json({ ok: true, leaders: [], total: 0 });

  const sessionToken = readSessionCookie(request);
  const sessionUser = await validateSession(db, sessionToken);
  const viewerEmail = (sessionUser?.email || context.user.email || "").toLowerCase();

  try {
    const result = await db
      .prepare(
        `SELECT id, email, name, revenue_cents, paid_accounts, signups
         FROM affiliates
         WHERE organization_id = ? AND status != 'suspended'
         ORDER BY revenue_cents DESC, paid_accounts DESC
         LIMIT 25`,
      )
      .bind("org_adga_primary")
      .all<LeaderRow>();

    const rows = result.results || [];
    const leaders = rows.map((row, index) => ({
      rank: index + 1,
      handle: row.email.toLowerCase() === viewerEmail ? "You" : maskEmail(row.email),
      isYou: row.email.toLowerCase() === viewerEmail,
      revenue_cents: row.revenue_cents,
      paid_accounts: row.paid_accounts,
      signups: row.signups,
    }));

    return json({ ok: true, leaders, total: rows.length });
  } catch {
    return json({ ok: true, leaders: [], total: 0 });
  }
}
