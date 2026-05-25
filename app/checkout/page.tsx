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
    <main style={{ minHeight: "100vh", background: "#fff", color: "#0d0c0a" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          maxWidth: 1180,
          margin: "0 auto",
          padding: "22px 24px 0",
        }}
      >
        <a href="/" style={{ color: "#0d0c0a", fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", textDecoration: "none" }}>
          ADGA
        </a>
        <a
          href="/login"
          style={{
            border: "1px solid #cfc7b9",
            borderRadius: 999,
            background: "#fff",
            color: "#0d0c0a",
            fontSize: 14,
            fontWeight: 650,
            padding: "10px 16px",
            textDecoration: "none",
          }}
        >
          Sign in
        </a>
      </header>

      <section
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "18px 24px 32px",
        }}
      >
        <div
          style={{
            border: "1px solid #cfc7b9",
            borderRadius: 24,
            background: "#fff",
            boxShadow: "0 18px 44px rgba(18, 16, 13, 0.08)",
            padding: "clamp(20px, 2.5vw, 28px)",
          }}
        >
          <p style={{ margin: 0, color: "#5d2cd6", fontSize: 12, fontWeight: 750, letterSpacing: "0.16em", textTransform: "uppercase" }}>
            Checkout
          </p>
          <h1 style={{ margin: "8px 0 0", maxWidth: 660, color: "#0d0c0a", fontSize: "clamp(32px, 4vw, 42px)", lineHeight: 1, letterSpacing: "-0.035em", fontWeight: 850 }}>
            Complete checkout.
          </h1>
          <p style={{ margin: "10px 0 0", maxWidth: 650, color: "#322d27", fontSize: 15, lineHeight: 1.4 }}>
            Enter the billing owner details. Stripe opens next to collect payment details and activate the subscription.
          </p>

          <div
            style={{
              marginTop: 16,
              border: "1px solid #d3cabd",
              borderRadius: 18,
              background: "#fff",
              padding: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "flex-start" }}>
              <div>
                <div style={{ color: "#777067", fontSize: 11, fontWeight: 750, letterSpacing: "0.13em", textTransform: "uppercase" }}>Selected plan</div>
                <div style={{ marginTop: 6, color: "#0d0c0a", fontSize: 22, fontWeight: 800 }}>{meta.name}</div>
                <p style={{ margin: "4px 0 0", color: "#322d27", fontSize: 13, lineHeight: 1.3 }}>{meta.tagline}</p>
              </div>
              <a href="/pricing" style={{ color: "#5d2cd6", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                Change plan
              </a>
            </div>

            <div style={{ marginTop: 14, borderTop: "1px solid #d3cabd", paddingTop: 13, display: "flex", justifyContent: "space-between", gap: 18, alignItems: "flex-end" }}>
              <div style={{ color: "#322d27", fontSize: 14 }}>{meta.seatsLabel}</div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#0d0c0a", fontSize: 31, lineHeight: 1, fontWeight: 850 }}>{formatCurrency(total)}</div>
                <div style={{ marginTop: 5, color: "#4d4740", fontSize: 13 }}>{cadenceLabel}</div>
              </div>
            </div>

            {cadence === "year" && (
              <p style={{ margin: "16px 0 0", color: "#322d27", fontSize: 13 }}>Annual billing includes two months free.</p>
            )}
          </div>

          {status.kind === "pending" ? (
            <div style={{ marginTop: 22, borderTop: "1px solid #d3cabd", paddingTop: 20 }}>
              <p style={{ margin: 0, color: "#5d2cd6", fontSize: 12, fontWeight: 750, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                Check your email
              </p>
              <h2 style={{ margin: "14px 0 0", color: "#0d0c0a", fontSize: 34, lineHeight: 1.06, letterSpacing: "-0.035em", fontWeight: 850 }}>
                We received your checkout request.
              </h2>
              <p style={{ margin: "14px 0 0", color: "#322d27", fontSize: 16, lineHeight: 1.55 }}>{status.message}</p>
            </div>
          ) : (
            <div style={{ marginTop: 18, borderTop: "1px solid #d3cabd", paddingTop: 16 }}>
              <p style={{ margin: 0, color: "#5d2cd6", fontSize: 12, fontWeight: 750, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                Billing owner
              </p>
              <h2 style={{ margin: "7px 0 0", color: "#0d0c0a", fontSize: 24, lineHeight: 1.04, letterSpacing: "-0.02em", fontWeight: 850 }}>
                Continue to payment.
              </h2>
              <p style={{ margin: "7px 0 0", color: "#322d27", fontSize: 14, lineHeight: 1.35 }}>
                Stripe securely handles payment details. ADGA uses this email for onboarding and account access.
              </p>

              <form onSubmit={submit} noValidate style={{ marginTop: 14, display: "grid", gap: 13 }}>
                <div className="checkout-fields" style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16 }}>
                  <div style={{ display: "grid", gap: 8 }}>
                  <label htmlFor="checkout-first-name" style={{ color: "#322d27", fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    First name
                  </label>
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
                    style={{
                      width: "100%",
                      border: "1px solid #cfc7b9",
                      borderRadius: 12,
                      background: "#fff",
                      color: "#0d0c0a",
                      fontSize: 16,
                      padding: "11px 13px",
                      outlineColor: "#5d2cd6",
                    }}
                  />
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                  <label htmlFor="checkout-email" style={{ color: "#322d27", fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    Work email
                  </label>
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
                    style={{
                      width: "100%",
                      border: "1px solid #cfc7b9",
                      borderRadius: 12,
                      background: "#fff",
                      color: "#0d0c0a",
                      fontSize: 16,
                      padding: "11px 13px",
                      outlineColor: "#5d2cd6",
                    }}
                  />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    justifySelf: "start",
                    border: 0,
                    borderRadius: 999,
                    background: "#5d2cd6",
                    color: "#fff",
                    cursor: isSubmitting ? "wait" : "pointer",
                    fontSize: 15,
                    fontWeight: 750,
                    padding: "12px 19px",
                    boxShadow: "0 18px 38px rgba(93, 44, 214, 0.24)",
                    opacity: isSubmitting ? 0.72 : 1,
                  }}
                >
                  {status.kind === "submitting" && "Starting checkout..."}
                  {status.kind === "redirecting" && "Redirecting to Stripe..."}
                  {(status.kind === "idle" || status.kind === "error") && "Continue to secure checkout"}
                </button>

                {status.kind === "error" && (
                  <p role="alert" style={{ margin: 0, color: "#b42318", fontSize: 14, lineHeight: 1.45 }}>
                    {status.message}
                  </p>
                )}
              </form>

              <p style={{ margin: "12px 0 0", color: "#322d27", fontSize: 13, lineHeight: 1.4 }}>
                By continuing you agree to ADGA&apos;s <a href="/policies" style={{ color: "#0d0c0a", fontWeight: 750 }}>policies</a>.
              </p>
            </div>
          )}
        </div>
      </section>

      <footer style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px 24px", color: "#322d27", fontSize: 13 }}>
        {getCopyright()}
      </footer>

      <style jsx>{`
        @media (max-width: 920px) {
          .checkout-fields {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      <style jsx global>{`
        body {
          background: #fff !important;
        }

        body::before {
          display: none !important;
        }
      `}</style>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: "100vh", background: "#fff" }} />}>
      <CheckoutInner />
    </Suspense>
  );
}
