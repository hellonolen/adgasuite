import Link from "next/link";

export default function SuiteOnboardingPage() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Onboarding</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight">Finish your ADGA setup.</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        Your account is open. Complete these steps so billing, profile, team, and first dealflow are ready before you work the pipeline.
      </p>

      <div className="mt-8 grid gap-3 md:grid-cols-2">
        {[
          ["Profile", "Add your name, role, phone, signature, and default working preferences.", "/suite/settings/profile"],
          ["Billing", "Confirm plan, seats, payment method, invoices, and billing contact.", "/suite/settings/billing"],
          ["Deals", "Create or import the first deal square and open dealflow.", "/suite/deals"],
          ["Team", "Invite the people who should work the pipeline with you.", "/suite/admin/team"],
        ].map(([title, body, href]) => (
          <Link key={title} href={href} className="rounded-xl border border-border bg-background p-4 transition hover:border-primary/30 hover:bg-primary/5">
            <div className="font-semibold text-foreground">{title}</div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
