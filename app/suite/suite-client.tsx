"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

// Shell skeleton rendered ONCE on the first /suite/* visit while the suite bundle loads.
// After hydration, the shell is persistent across child route changes, so subsequent
// navigations don't re-trigger this loading state.
function SuiteShellSkeleton() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr 340px",
        minHeight: "100vh",
        background: "#f9f7f4",
        color: "#0d0c0a",
      }}
    >
      <aside
        style={{
          borderRight: "1px solid #e8e4de",
          background: "rgba(255, 255, 255, 0.85)",
          padding: "18px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
        aria-hidden
      >
        <div style={{ height: 22, width: 60, background: "rgba(86, 36, 199, 0.18)", borderRadius: 4 }} />
        <div style={{ marginTop: 14, height: 14, width: 110, background: "#e8e4de", borderRadius: 3 }} />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} style={{ height: 28, width: "100%", background: "#eee9e2", borderRadius: 6, opacity: 0.6 - i * 0.04 }} />
        ))}
      </aside>
      <main style={{ display: "flex", flexDirection: "column", minWidth: 0 }} aria-hidden>
        <div
          style={{
            height: 56,
            borderBottom: "1px solid #e8e4de",
            display: "flex",
            alignItems: "center",
            padding: "0 24px",
            gap: 12,
            background: "rgba(255, 255, 255, 0.85)",
          }}
        >
          <div style={{ height: 18, width: 80, background: "#e8e4de", borderRadius: 4 }} />
          <div style={{ flex: 1 }} />
          <div style={{ height: 28, width: 200, background: "#f1ede8", borderRadius: 999 }} />
          <div style={{ height: 28, width: 90, background: "#5d2cd6", opacity: 0.85, borderRadius: 999 }} />
        </div>
        <div style={{ padding: "24px 32px", flex: 1 }}>
          <div style={{ height: 36, width: 220, background: "#e8e4de", borderRadius: 6, marginBottom: 12 }} />
          <div style={{ height: 14, width: 320, background: "#eee9e2", borderRadius: 4, marginBottom: 28 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ height: 86, background: "#fff", border: "1px solid #e8e4de", borderRadius: 12 }} />
            ))}
          </div>
          <div style={{ height: 240, background: "#fff", border: "1px solid #e8e4de", borderRadius: 14 }} />
        </div>
      </main>
      <aside
        style={{
          borderLeft: "1px solid #e8e4de",
          background: "rgba(255, 255, 255, 0.92)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
        aria-hidden
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ height: 22, width: 22, borderRadius: "50%", background: "linear-gradient(135deg, #5d2cd6, #b78aff)" }} />
          <div style={{ height: 16, width: 60, background: "#e8e4de", borderRadius: 4 }} />
        </div>
        <div style={{ height: 32, background: "rgba(86, 36, 199, 0.05)", borderRadius: 8 }} />
        <div style={{ height: 80, background: "#f5f1ec", borderRadius: 10, alignSelf: "flex-end", width: "75%" }} />
        <div style={{ height: 64, background: "#5d2cd6", opacity: 0.85, borderRadius: 10, alignSelf: "flex-start", width: "70%" }} />
        <div style={{ flex: 1 }} />
        <div style={{ height: 84, background: "#fff", border: "1px solid #e8e4de", borderRadius: 12 }} />
      </aside>
    </div>
  );
}

const AdgaSuite = dynamic(() => import("@/components/adga/AdgaSuite"), {
  ssr: false,
  loading: () => <SuiteShellSkeleton />,
});

interface SuiteClientProps {
  children?: React.ReactNode;
  bootstrap?: any;
}

export default function SuiteClient({ children, bootstrap = null }: SuiteClientProps) {
  const pathname = usePathname();
  const billing = bootstrap?.billing;
  const recoveryRoute = pathname === "/suite/settings/billing" || pathname === "/suite/billing";

  if (billing && !billing.accessAllowed && !recoveryRoute) {
    return <BillingRecovery billing={billing} />;
  }

  return <AdgaSuite bootstrap={bootstrap}>{children}</AdgaSuite>;
}

function BillingRecovery({ billing }: { billing: any }) {
  return (
    <div className="min-h-screen bg-background px-5 py-8 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center">
        <section className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Billing action required</p>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Restore workspace access</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                This workspace is in {billing.status.replace(/_/g, " ")} state. Update the payment method or resolve the invoice in Stripe to reopen the suite.
              </p>
            </div>
            <span className="inline-flex w-fit rounded-full border border-destructive/20 bg-destructive/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-destructive">
              {billing.status}
            </span>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <Metric label="Plan" value={title(billing.plan)} />
            <Metric label="Payment profile" value={billing.hasStripeCustomer ? "Connected" : "Not connected"} />
            <Metric label="Renewal" value={billing.currentPeriodEnd ? new Date(billing.currentPeriodEnd).toLocaleDateString() : "Pending"} />
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              href="/suite/settings/billing"
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm"
            >
              Open billing settings
            </a>
            <a
              href="/pricing"
              className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-background px-5 text-sm font-semibold hover:bg-secondary"
            >
              Review plans
            </a>
          </div>
        </section>
      </div>
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
