import { AffiliateLayout } from "@/components/suite/AffiliateLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { loadAffiliateContext, formatUsdFromCents } from "@/lib/server/affiliate";

interface LeaderRow {
  id: string;
  email: string;
  name: string;
  revenue_cents: number;
  paid_accounts: number;
  signups: number;
}

interface ViewLeader {
  rank: number;
  handle: string;
  isYou: boolean;
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

async function loadLeaders(db: D1Database, viewerEmail: string): Promise<ViewLeader[]> {
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

    return (result.results || []).map((row, index) => ({
      rank: index + 1,
      handle: row.email.toLowerCase() === viewerEmail.toLowerCase() ? "You" : maskEmail(row.email),
      isYou: row.email.toLowerCase() === viewerEmail.toLowerCase(),
      revenue_cents: row.revenue_cents,
      paid_accounts: row.paid_accounts,
      signups: row.signups,
    }));
  } catch {
    return [];
  }
}

export default async function AffiliateLeaderboardPage() {
  const { email, affiliate, db } = await loadAffiliateContext("/suite/affiliate/leaderboard");

  const leaders = db ? await loadLeaders(db, email) : [];

  return (
    <AffiliateLayout email={email} referralCode={affiliate?.referral_code}>
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-xl font-semibold text-[#0d0c0a]">Leaderboard</h1>
          <p className="mt-1 text-sm text-[#6b6760]">
            Top affiliates this period, ranked by revenue. Identities are masked — initials and domain only.
          </p>
        </header>

        <Card className="border-[var(--rule,#e8e4de)] bg-white shadow-sm">
          <CardHeader>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">Rankings</div>
            <CardTitle className="text-sm font-medium text-[#0d0c0a]">
              {leaders.length > 0 ? `${leaders.length} active affiliates` : "No affiliates yet"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {leaders.length <= 1 ? (
              <div className="px-6 py-10 text-center">
                <div className="text-sm font-medium text-[#0d0c0a]">
                  {leaders.length === 0 ? "Leaderboard opens when more than one affiliate is active." : "You are the first affiliate here."}
                </div>
                <p className="mt-1 text-sm text-[#6b6760]">
                  Once teammates enroll, rankings update in real time.
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--rule,#e8e4de)] text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">
                    <th className="px-6 py-3">Rank</th>
                    <th className="px-6 py-3">Affiliate</th>
                    <th className="px-6 py-3 text-right">Revenue</th>
                    <th className="px-6 py-3 text-right">Paid</th>
                    <th className="px-6 py-3 text-right">Signups</th>
                  </tr>
                </thead>
                <tbody>
                  {leaders.map((leader) => (
                    <tr
                      key={`${leader.rank}-${leader.handle}`}
                      className={
                        leader.isYou
                          ? "border-b border-[#5d2cd6]/20 bg-[#5d2cd6]/[0.04] last:border-0"
                          : "border-b border-[var(--rule,#e8e4de)] last:border-0"
                      }
                    >
                      <td className="px-6 py-3 font-semibold text-[#0d0c0a]">#{leader.rank}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[#0d0c0a]">{leader.handle}</span>
                          {leader.isYou && (
                            <Badge className="bg-[#5d2cd6] text-white hover:bg-[#5d2cd6]">You</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-[#0d0c0a]">
                        {formatUsdFromCents(leader.revenue_cents)}
                      </td>
                      <td className="px-6 py-3 text-right text-[#6b6760]">{leader.paid_accounts}</td>
                      <td className="px-6 py-3 text-right text-[#6b6760]">{leader.signups}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </AffiliateLayout>
  );
}
