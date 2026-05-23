import Link from "next/link";
import { AffiliateLayout } from "@/components/suite/AffiliateLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  loadAffiliateContext,
  formatUsdFromCents,
  commissionRatePercent,
  type AffiliateEventRow,
} from "@/lib/server/affiliate";
import { EnrollButton } from "./enroll-button";

interface KpiTile {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}

function buildKpis(affiliate: NonNullable<Awaited<ReturnType<typeof loadAffiliateContext>>["affiliate"]>): KpiTile[] {
  return [
    { label: "Clicks", value: affiliate.clicks.toLocaleString("en-US") },
    { label: "Signups", value: affiliate.signups.toLocaleString("en-US") },
    { label: "Paid accounts", value: affiliate.paid_accounts.toLocaleString("en-US") },
    { label: "Revenue generated", value: formatUsdFromCents(affiliate.revenue_cents) },
    {
      label: "Commission owed",
      value: formatUsdFromCents(affiliate.commission_owed_cents),
      hint: `${commissionRatePercent(affiliate.commission_rate_bps)} rate`,
      accent: true,
    },
    { label: "Payout status", value: prettyPayoutStatus(affiliate.payout_status) },
  ];
}

function prettyPayoutStatus(status: string) {
  if (status === "paid") return "Paid";
  if (status === "due") return "Due";
  if (status === "processing") return "Processing";
  if (status === "scheduled") return "Scheduled";
  return "Not due";
}

async function loadRecentEvents(db: D1Database, affiliateId: string): Promise<AffiliateEventRow[]> {
  try {
    const result = await db
      .prepare(
        "SELECT id, affiliate_id, referral_code, event_type, customer_email, source, campaign, amount_cents, metadata_json, created_at FROM affiliate_events WHERE affiliate_id = ? ORDER BY created_at DESC LIMIT 8",
      )
      .bind(affiliateId)
      .all<AffiliateEventRow>();
    return result.results || [];
  } catch {
    return [];
  }
}

function eventLabel(event: AffiliateEventRow) {
  switch (event.event_type) {
    case "click":
      return "Click";
    case "lead":
      return "Lead captured";
    case "signup":
      return "Signup";
    case "paid":
    case "subscription.paid":
      return "Paid account";
    case "payout.paid":
      return "Payout paid";
    case "payout.scheduled":
      return "Payout scheduled";
    default:
      return event.event_type;
  }
}

export default async function AffiliateDashboardPage() {
  const { email, affiliate, db, hasDb } = await loadAffiliateContext("/suite/affiliate");

  if (!affiliate) {
    return (
      <AffiliateLayout email={email}>
        <Card className="border-[var(--rule,#e8e4de)] bg-white shadow-sm">
          <CardHeader>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">
              Affiliate Center
            </div>
            <CardTitle className="text-2xl text-[#0d0c0a]">Become an affiliate</CardTitle>
            <p className="text-sm text-[#6b6760]">
              Earn commission on every paid account you refer. We pay out monthly. No cap.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ul className="grid grid-cols-1 gap-3 text-sm text-[#0d0c0a] sm:grid-cols-3">
              <li className="rounded-lg border border-[var(--rule,#e8e4de)] bg-[#f9f7f4] p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">Rate</div>
                <div className="mt-1 text-lg font-semibold">20% recurring</div>
              </li>
              <li className="rounded-lg border border-[var(--rule,#e8e4de)] bg-[#f9f7f4] p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">Cookie</div>
                <div className="mt-1 text-lg font-semibold">90 days</div>
              </li>
              <li className="rounded-lg border border-[var(--rule,#e8e4de)] bg-[#f9f7f4] p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">Payouts</div>
                <div className="mt-1 text-lg font-semibold">Monthly</div>
              </li>
            </ul>
            <EnrollButton />
            {!hasDb && (
              <p className="text-xs text-[#6b6760]">
                Demo mode — D1 not bound locally. Enrolling will return a stub record.
              </p>
            )}
          </CardContent>
        </Card>
      </AffiliateLayout>
    );
  }

  const kpis = buildKpis(affiliate);
  const events = db ? await loadRecentEvents(db, affiliate.id) : [];

  return (
    <AffiliateLayout email={email} referralCode={affiliate.referral_code}>
      <div className="flex flex-col gap-6">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h1 className="text-xl font-semibold text-[#0d0c0a]">Overview</h1>
            <Badge variant={affiliate.status === "active" ? "default" : "outline"} className="font-normal capitalize">
              {affiliate.status}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {kpis.map((kpi) => (
              <Card
                key={kpi.label}
                className={
                  kpi.accent
                    ? "border-[#5d2cd6]/30 bg-[#5d2cd6]/[0.04] shadow-sm"
                    : "border-[var(--rule,#e8e4de)] bg-white shadow-sm"
                }
              >
                <CardHeader className="pb-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">
                    {kpi.label}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-semibold text-[#0d0c0a]">{kpi.value}</div>
                  {kpi.hint && <div className="mt-1 text-xs text-[#6b6760]">{kpi.hint}</div>}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#6b6760]">Recent activity</h2>
            <Link
              href="/suite/affiliate/links"
              className="text-xs font-medium text-[#5d2cd6] hover:underline"
            >
              Manage links →
            </Link>
          </div>
          <Card className="border-[var(--rule,#e8e4de)] bg-white shadow-sm">
            <CardContent className="px-0 pb-0">
              {events.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <div className="text-sm font-medium text-[#0d0c0a]">No activity yet</div>
                  <p className="mt-1 text-sm text-[#6b6760]">
                    Share your referral link to start earning. Clicks and signups appear here in real time.
                  </p>
                  <Button asChild className="mt-4 bg-[#5d2cd6] text-white hover:bg-[#4a23ab]">
                    <Link href="/suite/affiliate/links">Get started</Link>
                  </Button>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--rule,#e8e4de)] text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">
                      <th className="px-6 py-3">Event</th>
                      <th className="px-6 py-3">Source</th>
                      <th className="px-6 py-3">Campaign</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                      <th className="px-6 py-3 text-right">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.id} className="border-b border-[var(--rule,#e8e4de)] last:border-0">
                        <td className="px-6 py-3 font-medium text-[#0d0c0a]">{eventLabel(event)}</td>
                        <td className="px-6 py-3 text-[#6b6760]">{event.source || "—"}</td>
                        <td className="px-6 py-3 text-[#6b6760]">{event.campaign || "—"}</td>
                        <td className="px-6 py-3 text-right text-[#0d0c0a]">
                          {event.amount_cents > 0 ? formatUsdFromCents(event.amount_cents) : "—"}
                        </td>
                        <td className="px-6 py-3 text-right text-[#6b6760]">
                          {new Date(event.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </AffiliateLayout>
  );
}
