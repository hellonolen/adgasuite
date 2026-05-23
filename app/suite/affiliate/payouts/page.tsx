import Link from "next/link";
import { AffiliateLayout } from "@/components/suite/AffiliateLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  loadAffiliateContext,
  formatUsdFromCents,
  type AffiliateEventRow,
} from "@/lib/server/affiliate";

interface PayoutRow {
  id: string;
  amount_cents: number;
  status: string;
  period: string;
  paid_at: string | null;
  created_at: string;
}

const PAYOUT_EVENT_TYPES = new Set(["payout.paid", "payout.scheduled", "payout.processing"]);

function parseMetadata(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function rowFromEvent(event: AffiliateEventRow): PayoutRow {
  const metadata = parseMetadata(event.metadata_json || "{}");
  const status =
    event.event_type === "payout.paid"
      ? "paid"
      : event.event_type === "payout.processing"
        ? "processing"
        : "scheduled";
  return {
    id: event.id,
    amount_cents: event.amount_cents,
    status,
    period: typeof metadata.period === "string" ? metadata.period : "—",
    paid_at: typeof metadata.paid_at === "string" ? metadata.paid_at : null,
    created_at: event.created_at,
  };
}

async function loadPayouts(db: D1Database, affiliateId: string): Promise<PayoutRow[]> {
  try {
    const result = await db
      .prepare(
        `SELECT id, affiliate_id, referral_code, event_type, customer_email, source, campaign, amount_cents, metadata_json, created_at
         FROM affiliate_events
         WHERE affiliate_id = ? AND event_type IN ('payout.paid', 'payout.scheduled', 'payout.processing')
         ORDER BY created_at DESC
         LIMIT 50`,
      )
      .bind(affiliateId)
      .all<AffiliateEventRow>();
    return (result.results || [])
      .filter((event) => PAYOUT_EVENT_TYPES.has(event.event_type))
      .map(rowFromEvent);
  } catch {
    return [];
  }
}

function statusBadge(status: string) {
  if (status === "paid") {
    return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Paid</Badge>;
  }
  if (status === "processing") {
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Processing</Badge>;
  }
  return <Badge variant="outline" className="border-[#5d2cd6]/30 text-[#5d2cd6]">Scheduled</Badge>;
}

export default async function AffiliatePayoutsPage() {
  const { email, affiliate, db } = await loadAffiliateContext("/suite/affiliate/payouts");

  if (!affiliate) {
    return (
      <AffiliateLayout email={email}>
        <Card className="border-[var(--rule,#e8e4de)] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-[#0d0c0a]">No payouts yet</CardTitle>
            <p className="text-sm text-[#6b6760]">Enroll as an affiliate to start earning commission.</p>
          </CardHeader>
          <CardContent>
            <Button asChild className="bg-[#5d2cd6] text-white hover:bg-[#4a23ab]">
              <Link href="/suite/affiliate">Get started</Link>
            </Button>
          </CardContent>
        </Card>
      </AffiliateLayout>
    );
  }

  const payouts = db ? await loadPayouts(db, affiliate.id) : [];

  return (
    <AffiliateLayout email={email} referralCode={affiliate.referral_code}>
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-xl font-semibold text-[#0d0c0a]">Payouts</h1>
          <p className="mt-1 text-sm text-[#6b6760]">Commission owed, in progress, and paid out.</p>
        </header>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <SummaryCard label="Owed" value={formatUsdFromCents(affiliate.commission_owed_cents)} accent />
          <SummaryCard label="Lifetime revenue" value={formatUsdFromCents(affiliate.revenue_cents)} />
          <SummaryCard label="Status" value={affiliate.payout_status.replace("_", " ")} />
        </div>

        <Card className="border-[var(--rule,#e8e4de)] bg-white shadow-sm">
          <CardHeader>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">History</div>
            <CardTitle className="text-sm font-medium text-[#0d0c0a]">Every payout, with status</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {payouts.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <div className="text-sm font-medium text-[#0d0c0a]">No payouts yet</div>
                <p className="mt-1 text-sm text-[#6b6760]">
                  Once your first referral converts, your payout schedule appears here.
                </p>
                <Button asChild className="mt-4 bg-[#5d2cd6] text-white hover:bg-[#4a23ab]">
                  <Link href="/suite/affiliate/links">Get started</Link>
                </Button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--rule,#e8e4de)] text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">
                    <th className="px-6 py-3">Period</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Paid at</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="border-b border-[var(--rule,#e8e4de)] last:border-0">
                      <td className="px-6 py-3 font-medium text-[#0d0c0a]">{payout.period}</td>
                      <td className="px-6 py-3 text-right text-[#0d0c0a]">{formatUsdFromCents(payout.amount_cents)}</td>
                      <td className="px-6 py-3">{statusBadge(payout.status)}</td>
                      <td className="px-6 py-3 text-right text-[#6b6760]">
                        {payout.paid_at ? new Date(payout.paid_at).toLocaleDateString() : "—"}
                      </td>
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

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card
      className={
        accent
          ? "border-[#5d2cd6]/30 bg-[#5d2cd6]/[0.04] shadow-sm"
          : "border-[var(--rule,#e8e4de)] bg-white shadow-sm"
      }
    >
      <CardHeader className="pb-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">{label}</div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-semibold capitalize text-[#0d0c0a]">{value}</div>
      </CardContent>
    </Card>
  );
}
