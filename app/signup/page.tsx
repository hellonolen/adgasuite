"use client";

import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";

type PlanId = "pro" | "team" | "enterprise";
type Cadence = "month" | "year";

const PRO_MONTHLY = 97;
const TEAM_BASE_MONTHLY = 297;
const TEAM_INCLUDED_SEATS = 5;
const TEAM_SEAT_ADD = 30;
const TEAM_MAX_SEATS = 12;
const ENTERPRISE_BASE_MONTHLY = 597;
const ENTERPRISE_INCLUDED_SEATS = 12;
const ENTERPRISE_SEAT_ADD = 20;
const ANNUAL_MONTHS_BILLED = 10;

const PLAN_META: Record<PlanId, { name: string; tagline: string; seatsLabel: string }> = {
  pro: {
    name: "Pro",
    tagline: "For the operator running deals on their own.",
    seatsLabel: "1 user",
  },
  team: {
    name: "Team",
    tagline: "Closing teams working the same deal book.",
    seatsLabel: "5 seats included, +$30/seat up to 12",
  },
  enterprise: {
    name: "Enterprise",
    tagline: "Brokerages and firms running real volume.",
    seatsLabel: "12 seats included, +$20/seat unlimited",
  },
};

function normalizePlan(value: string | null): PlanId {
  if (value === "pro" || value === "team" || value === "enterprise") return value;
  if (value === "individual" || value === "solo") return "pro";
  if (value === "teams" || value === "professional") return "team";
  return "team";
}

function normalizeCadence(value: string | null): Cadence {
  return value === "year" ? "year" : "month";
}

function clampSeats(plan: PlanId, requested: number): number {
  if (plan === "pro") return 1;
  if (plan === "team") {
    return Math.max(TEAM_INCLUDED_SEATS, Math.min(TEAM_MAX_SEATS, requested || TEAM_INCLUDED_SEATS));
  }
  return Math.max(ENTERPRISE_INCLUDED_SEATS, requested || ENTERPRISE_INCLUDED_SEATS);
}

function computeMonthly(plan: PlanId, seats: number): number {
  if (plan === "pro") return PRO_MONTHLY;
  if (plan === "team") {
    return TEAM_BASE_MONTHLY + Math.max(0, seats - TEAM_INCLUDED_SEATS) * TEAM_SEAT_ADD;
  }
  return ENTERPRISE_BASE_MONTHLY + Math.max(0, seats - ENTERPRISE_INCLUDED_SEATS) * ENTERPRISE_SEAT_ADD;
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

const signupSchema = z.object({
  name: z.string().trim().min(2, "Add your full name."),
  email: z.string().trim().email("Enter a valid work email."),
});

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "redirecting"; url: string }
  | { kind: "pending"; message: string }
  | { kind: "error"; message: string };

export default function SignupPage() {
  const [plan, setPlan] = useState<PlanId>("team");
  const [cadence, setCadence] = useState<Cadence>("month");
  const [seats, setSeats] = useState<number>(TEAM_INCLUDED_SEATS);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planParam = normalizePlan(params.get("plan"));
    const cadenceParam = normalizeCadence(params.get("cadence"));
    const seatsParam = Number.parseInt(params.get("seats") || "", 10);

    setPlan(planParam);
    setCadence(cadenceParam);
    setSeats(clampSeats(planParam, Number.isFinite(seatsParam) ? seatsParam : 0));
  }, []);

  const monthly = useMemo(() => computeMonthly(plan, seats), [plan, seats]);
  const total = cadence === "year" ? monthly * ANNUAL_MONTHS_BILLED : monthly;
  const cadenceLabel = cadence === "year" ? "per year" : "per month";
  const meta = PLAN_META[plan];

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const parsed = signupSchema.safeParse({ name, email });
    if (!parsed.success) {
      setStatus({ kind: "error", message: parsed.error.issues[0]?.message || "Check your details." });
      return;
    }

    setStatus({ kind: "submitting" });

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: parsed.data.email,
          name: parsed.data.name,
          plan,
          seats,
          cadence,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        configured?: boolean;
        url?: string | null;
        message?: string;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        setStatus({ kind: "error", message: data.error || "Could not start checkout. Try again." });
        return;
      }

      if (data.configured && data.url) {
        setStatus({ kind: "redirecting", url: data.url });
        window.location.assign(data.url);
        return;
      }

      // Checkout provider not yet configured — fall back to a magic-link path so the user is not stranded.
      try {
        await fetch("/api/auth/magic/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: parsed.data.email, plan }),
        });
      } catch {
        // best-effort
      }
      setStatus({
        kind: "pending",
        message:
          data.message || "Checkout will open in your inbox. We sent a sign-in link to your email.",
      });
    } catch {
      setStatus({ kind: "error", message: "Network error. Try again." });
    }
  }

  const isSubmitting = status.kind === "submitting" || status.kind === "redirecting";

  return (
    <MarketingLayout>
      <div className="auth-page auth-two-panel wrap">
        <section className="auth-brand">
          <span className="auth-kicker">ADGA Signup</span>
          <h1>Start closing deals faster. Today.</h1>
          <p>
            One workspace for your pipeline, your documents, and your follow-up. Your team sees the same deal in real time.
          </p>
          <div className="auth-proof">
            <span>Live deal flow across the team</span>
            <span>Documents, calendars, follow-up in one place</span>
            <span>Cancel anytime</span>
          </div>
        </section>

        <div className="auth-card premium-surface">
          {status.kind === "pending" ? (
            <div className="auth-success">
              <span className="ed-label">Check your email</span>
              <h2>Your account is ready to activate.</h2>
              <p className="muted">{status.message}</p>
              <div className="auth-footer">
                <a className="btn primary lg w-full" href="/login">Go to sign in</a>
              </div>
            </div>
          ) : (
            <>
              <div className="auth-header">
                <span className="ed-label">Create your account</span>
                <h1>Get started in 60 seconds.</h1>
                <p className="muted">Confirm your plan, add your details, and continue to checkout.</p>
              </div>

              <div
                className="premium-surface"
                style={{
                  padding: "16px 18px",
                  borderRadius: 14,
                  marginBottom: 20,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <div>
                    <span className="ed-label">Selected plan</span>
                    <div style={{ fontWeight: 700, fontSize: 18, marginTop: 4 }}>
                      {meta.name} · <span className="muted" style={{ fontWeight: 400 }}>{cadenceLabel}</span>
                    </div>
                  </div>
                  <a href="/pricing" className="accent-link" style={{ fontSize: 13 }}>Change</a>
                </div>
                <div className="muted" style={{ fontSize: 13 }}>{meta.tagline}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <span className="muted" style={{ fontSize: 13 }}>{meta.seatsLabel}</span>
                  <span style={{ fontWeight: 700, fontSize: 22 }}>
                    {formatCurrency(total)}
                    <span className="muted" style={{ fontWeight: 400, fontSize: 13, marginLeft: 6 }}>
                      {cadenceLabel}
                    </span>
                  </span>
                </div>
                {plan !== "pro" && (
                  <div className="muted" style={{ fontSize: 12 }}>
                    {seats} seat{seats === 1 ? "" : "s"}
                    {cadence === "year" && " · 2 months free on annual"}
                  </div>
                )}
              </div>

              <form onSubmit={submit} className="auth-form premium-form" noValidate>
                <div className="field">
                  <label htmlFor="signup-name">Full name</label>
                  <input
                    id="signup-name"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    type="text"
                    autoComplete="name"
                    placeholder="Maren Voss"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="field">
                  <label htmlFor="signup-email">Work email</label>
                  <input
                    id="signup-email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <button className="btn primary lg w-full" type="submit" disabled={isSubmitting}>
                  {status.kind === "submitting" && "Starting checkout..."}
                  {status.kind === "redirecting" && "Redirecting..."}
                  {(status.kind === "idle" || status.kind === "error") && "Continue to checkout"}
                </button>
                {status.kind === "error" && (
                  <p className="auth-status-msg" role="alert">{status.message}</p>
                )}
              </form>

              <div className="auth-footer">
                <p className="text-xs muted">
                  Already have an account? <a href="/login" className="accent-link">Sign in</a>.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </MarketingLayout>
  );
}
