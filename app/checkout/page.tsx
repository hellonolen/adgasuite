"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { getCopyright } from "@/lib/marketing-config";

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
const ANNUAL_MONTHS_BILLED = 11;

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
    seatsLabel: "Starts at 12 seats, add unlimited at $20 each",
  },
};

const checkoutSchema = z.object({
  first_name: z.string().trim().min(1, "Add your first name."),
  email: z.string().trim().email("Enter a valid work email."),
});

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "redirecting"; url: string }
  | { kind: "pending"; message: string }
  | { kind: "error"; message: string };

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
  if (plan === "team") return Math.max(TEAM_INCLUDED_SEATS, Math.min(TEAM_MAX_SEATS, requested || TEAM_INCLUDED_SEATS));
  return Math.max(ENTERPRISE_INCLUDED_SEATS, requested || ENTERPRISE_INCLUDED_SEATS);
}

function computeMonthly(plan: PlanId, seats: number): number {
  if (plan === "pro") return PRO_MONTHLY;
  if (plan === "team") return TEAM_BASE_MONTHLY + Math.max(0, seats - TEAM_INCLUDED_SEATS) * TEAM_SEAT_ADD;
  return ENTERPRISE_BASE_MONTHLY + Math.max(0, seats - ENTERPRISE_INCLUDED_SEATS) * ENTERPRISE_SEAT_ADD;
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

function CheckoutInner() {
  const [plan, setPlan] = useState<PlanId>("team");
  const [cadence, setCadence] = useState<Cadence>("month");
  const [seats, setSeats] = useState<number>(TEAM_INCLUDED_SEATS);
  const [firstName, setFirstName] = useState("");
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
  const isSubmitting = status.kind === "submitting" || status.kind === "redirecting";

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const parsed = checkoutSchema.safeParse({ first_name: firstName, email });
    if (!parsed.success) {
      setStatus({ kind: "error", message: parsed.error.issues[0]?.message || "Check your details." });
      return;
    }

    setStatus({ kind: "submitting" });

    try {
      const response = await fetch("/api/billing/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: parsed.data.email,
          name: parsed.data.first_name,
          first_name: parsed.data.first_name,
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

      setStatus({
        kind: "pending",
        message: data.message || "Checkout is not configured yet. ADGA will follow up by email.",
      });
    } catch {
      setStatus({ kind: "error", message: "Network error. Try again." });
    }
  }

  return (
    <>
    <style>{`
      body::before { display: none !important; }
      body { background: #ffffff !important; }
    `}</style>
    <main style={{ minHeight: "100vh", background: "#fff", color: "#0d0c0a" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, marginBottom: 34 }}>
          <a href="/" style={{ color: "#0d0c0a", fontSize: 23, fontWeight: 800, letterSpacing: "-0.03em", textDecoration: "none" }}>ADGA</a>
          <a href="/login" style={{ color: "#0d0c0a", fontSize: 14, fontWeight: 650, textDecoration: "none" }}>Sign in</a>
        </header>

        <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.1, letterSpacing: "-0.025em", fontWeight: 800 }}>Checkout</h1>

        <div className="checkout-layout" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 48, alignItems: "start", marginTop: 26 }}>
          <section>
            {status.kind === "pending" ? (
              <div>
                <h2 style={{ margin: 0, fontSize: 22, lineHeight: 1.15, fontWeight: 800 }}>Checkout request received.</h2>
                <p style={{ margin: "10px 0 0", color: "#4b4741", fontSize: 15, lineHeight: 1.5 }}>{status.message}</p>
              </div>
            ) : (
              <>
                <h2 style={{ margin: 0, fontSize: 18, lineHeight: 1.2, fontWeight: 800 }}>Billing owner</h2>
                <p style={{ margin: "8px 0 0", color: "#4b4741", fontSize: 14, lineHeight: 1.45 }}>
                  Stripe collects payment details on the next step.
                </p>

                <form onSubmit={submit} noValidate style={{ marginTop: 22, display: "grid", gap: 16, maxWidth: 520 }}>
                  <div style={{ display: "grid", gap: 7 }}>
                    <label htmlFor="checkout-first-name" style={{ color: "#3a352f", fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>First name</label>
                    <input
                      id="checkout-first-name"
                      name="first_name"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      type="text"
                      autoComplete="given-name"
                      placeholder="Maren"
                      required
                      disabled={isSubmitting}
                      style={{ border: "1px solid #cfc7b9", borderRadius: 8, background: "#fff", color: "#0d0c0a", fontSize: 16, padding: "12px 13px", outlineColor: "#5d2cd6" }}
                    />
                  </div>

                  <div style={{ display: "grid", gap: 7 }}>
                    <label htmlFor="checkout-email" style={{ color: "#3a352f", fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>Work email</label>
                    <input
                      id="checkout-email"
                      name="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      required
                      disabled={isSubmitting}
                      style={{ border: "1px solid #cfc7b9", borderRadius: 8, background: "#fff", color: "#0d0c0a", fontSize: 16, padding: "12px 13px", outlineColor: "#5d2cd6" }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{ justifySelf: "start", border: 0, borderRadius: 8, background: "#5d2cd6", color: "#fff", cursor: isSubmitting ? "wait" : "pointer", fontSize: 15, fontWeight: 800, padding: "12px 18px", opacity: isSubmitting ? 0.72 : 1 }}
                  >
                    {status.kind === "submitting" && "Starting checkout..."}
                    {status.kind === "redirecting" && "Opening Stripe..."}
                    {(status.kind === "idle" || status.kind === "error") && "Continue to Stripe"}
                  </button>

                  {status.kind === "error" && (
                    <p role="alert" style={{ margin: 0, color: "#b42318", fontSize: 14, lineHeight: 1.45 }}>{status.message}</p>
                  )}
                </form>

                <p style={{ margin: "18px 0 0", color: "#4b4741", fontSize: 13, lineHeight: 1.4 }}>
                  By continuing you agree to ADGA&apos;s <a href="/policies" style={{ color: "#0d0c0a", fontWeight: 750 }}>policies</a>.
                </p>
              </>
            )}
          </section>

          <aside style={{ border: "1px solid #d8d1c5", borderRadius: 8, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start" }}>
              <div>
                <div style={{ color: "#6d665e", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>Plan</div>
                <div style={{ marginTop: 7, fontSize: 20, fontWeight: 800 }}>{meta.name}</div>
              </div>
              <a href="/pricing" style={{ color: "#5d2cd6", fontSize: 13, fontWeight: 750, textDecoration: "none" }}>Change</a>
            </div>
            <p style={{ margin: "8px 0 0", color: "#4b4741", fontSize: 13, lineHeight: 1.4 }}>{meta.tagline}</p>
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid #d8d1c5", display: "flex", justifyContent: "space-between", gap: 16, color: "#3a352f", fontSize: 14 }}>
              <span>{meta.seatsLabel}</span>
              <span>{cadence === "year" ? "Annual" : "Monthly"}</span>
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #d8d1c5", display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline" }}>
              <span style={{ fontSize: 15, fontWeight: 800 }}>Due today</span>
              <span style={{ fontSize: 28, fontWeight: 850 }}>{formatCurrency(total)}</span>
            </div>
            <div style={{ marginTop: 4, color: "#4b4741", fontSize: 13, textAlign: "right" }}>{cadenceLabel}</div>
          </aside>
        </div>

        <footer style={{ marginTop: 56, color: "#4b4741", fontSize: 13 }}>{getCopyright()}</footer>
      </div>

      <style jsx>{`
        @media (max-width: 820px) {
          .checkout-layout {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
          }
        }
      `}</style>
    </main>
    </>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: "100vh", background: "#fff" }} />}>
      <CheckoutInner />
    </Suspense>
  );
}
