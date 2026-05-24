"use client";

import { useState } from "react";

export default function BillingSettingsClient({
  subscription,
}: {
  subscription: { plan: string; status: string; hasStripeCustomer: boolean; currentPeriodEnd: string | null };
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
        <h3 className="text-lg font-semibold">What you can manage here</h3>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[
            ["Payment methods", "Add, remove, or change the default card."],
            ["Invoices", "Review past invoices and receipts."],
            ["Billing profile", "Update billing email, tax address, and customer details."],
            ["Subscription", "Manage renewal, cancellation, and plan changes through Stripe."],
          ].map(([label, body]) => (
            <div key={label} className="rounded-xl border border-border bg-background p-4">
              <div className="font-semibold">{label}</div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
            </div>
          ))}
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
