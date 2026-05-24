"use client";

import { useState } from "react";

export default function BillingSettingsClient({
  subscription,
  billing,
}: {
  subscription: {
    plan: string;
    status: string;
    hasStripeCustomer: boolean;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    currentPeriodEnd: string | null;
  };
  billing: {
    billingEmail: string | null;
    defaultPaymentMethod: string | null;
    invoices: Array<{
      id: string;
      number: string | null;
      status: string | null;
      amountDue: number | null;
      currency: string | null;
      hostedInvoiceUrl: string | null;
      created: string | null;
    }>;
  } | null;
}) {
  const [portalStatus, setPortalStatus] = useState<"idle" | "opening" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function openPortal() {
    setPortalStatus("opening");
    setMessage(null);
    try {
      const response = await fetch("/api/billing/stripe/portal", { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setPortalStatus("error");
        setMessage(data.error || "Could not open billing portal.");
        return;
      }
      window.location.assign(data.url);
    } catch {
      setPortalStatus("error");
      setMessage("Network error. Try again.");
    }
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Billing</p>
        <div className="mt-2 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Plan and payment method</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Manage subscription status, payment methods, billing contact, invoices, and card updates through Stripe.
            </p>
          </div>
          <span className="inline-flex w-fit rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            {subscription.status}
          </span>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          <Metric label="Current plan" value={title(subscription.plan)} />
          <Metric label="Payment profile" value={subscription.hasStripeCustomer ? "Connected" : "Not connected"} />
          <Metric label="Renewal" value={subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "Pending"} />
          <Metric label="Billing email" value={billing?.billingEmail || "Not synced"} />
          <Metric label="Default card" value={billing?.defaultPaymentMethod || "Use Stripe portal"} />
          <Metric label="Stripe subscription" value={subscription.stripeSubscriptionId ? compactId(subscription.stripeSubscriptionId) : "Pending"} />
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={openPortal}
            disabled={portalStatus === "opening" || !subscription.hasStripeCustomer}
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-55"
          >
            {portalStatus === "opening" ? "Opening Stripe..." : "Update card or billing"}
          </button>
          <a
            href="/pricing"
            className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-background px-5 text-sm font-semibold hover:bg-secondary"
          >
            Review plans
          </a>
        </div>
        {message && <p className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{message}</p>}
        {!subscription.hasStripeCustomer && (
          <p className="mt-4 text-sm text-muted-foreground">
            Stripe customer details attach after the first completed checkout webhook is received.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-8">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Invoices</h3>
            <p className="mt-1 text-sm text-muted-foreground">Recent Stripe invoices tied to this workspace.</p>
          </div>
          {subscription.stripeCustomerId && (
            <span className="text-xs font-medium text-muted-foreground">Customer {compactId(subscription.stripeCustomerId)}</span>
          )}
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-border">
          {(billing?.invoices || []).map((invoice) => (
            <div key={invoice.id} className="grid gap-2 border-b border-border px-4 py-3 text-sm last:border-b-0 md:grid-cols-[1fr_110px_120px_120px] md:items-center">
              <div>
                <div className="font-semibold">{invoice.number || compactId(invoice.id)}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{invoice.created ? new Date(invoice.created).toLocaleDateString() : "Date pending"}</div>
              </div>
              <div className="capitalize text-muted-foreground">{invoice.status || "pending"}</div>
              <div className="font-medium">{formatMoney(invoice.amountDue, invoice.currency)}</div>
              {invoice.hostedInvoiceUrl ? (
                <a className="font-semibold text-primary hover:underline md:text-right" href={invoice.hostedInvoiceUrl} target="_blank" rel="noreferrer">
                  Open
                </a>
              ) : (
                <span className="text-muted-foreground md:text-right">No link</span>
              )}
            </div>
          ))}
          {billing && billing.invoices.length === 0 && (
            <div className="px-4 py-8 text-sm text-muted-foreground">No Stripe invoices are attached yet.</div>
          )}
          {!billing && (
            <div className="px-4 py-8 text-sm text-muted-foreground">
              Stripe billing details will appear here after the customer record is connected and the Stripe API is configured.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
    </div>
  );
}

function title(value: string) {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function compactId(value: string) {
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function formatMoney(cents: number | null, currency: string | null) {
  if (typeof cents !== "number") return "Pending";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
  }).format(cents / 100);
}
