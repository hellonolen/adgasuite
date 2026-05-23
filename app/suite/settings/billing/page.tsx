"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface BillingSummary {
  planName: string;
  status: string;
  seatCount: string;
  renewalDate: string;
}

const PLACEHOLDER = "—";

function formatPlanName(plan: string | null | undefined) {
  if (!plan) return PLACEHOLDER;
  if (plan === "suite") return "ADGA Suite";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function formatStatus(status: string | null | undefined) {
  if (!status) return PLACEHOLDER;
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function BillingSettingsPage() {
  const [summary, setSummary] = useState<BillingSummary>({
    planName: PLACEHOLDER,
    status: PLACEHOLDER,
    seatCount: PLACEHOLDER,
    renewalDate: PLACEHOLDER,
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/suite/state", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Suite state ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        const organization = data?.organization ?? {};
        setSummary({
          planName: formatPlanName(organization.plan),
          status: formatStatus(organization.subscription_status),
          seatCount:
            typeof organization.seat_count === "number"
              ? String(organization.seat_count)
              : PLACEHOLDER,
          renewalDate: organization.next_renewal_at
            ? new Date(organization.next_renewal_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : PLACEHOLDER,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : "Could not load billing.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Current plan</CardTitle>
              <CardDescription>Live snapshot from your workspace billing.</CardDescription>
            </div>
            <Badge variant={summary.status.toLowerCase() === "active" ? "default" : "secondary"}>
              {loading ? "Loading…" : summary.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat label="Plan" value={loading ? PLACEHOLDER : summary.planName} />
            <Stat label="Seats" value={loading ? PLACEHOLDER : summary.seatCount} />
            <Stat label="Next renewal" value={loading ? PLACEHOLDER : summary.renewalDate} />
          </div>
          <Separator className="my-5" />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">Upgrade plan</Button>
            <Button asChild size="sm" variant="outline">
              <a href="https://whop.com/dashboard/subscriptions" target="_blank" rel="noreferrer">
                Manage in Whop
              </a>
            </Button>
          </div>
          {errorMessage ? (
            <p className="mt-3 text-xs text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoices</CardTitle>
          <CardDescription>
            Invoices and payment history live in your Whop dashboard. Open it to download a receipt or update your card on file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm" variant="ghost">
            <a href="https://whop.com/dashboard/orders" target="_blank" rel="noreferrer">
              Open billing history
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}
