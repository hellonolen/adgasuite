"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { z } from "zod";

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
    seatsLabel: "Starts at 12 seats · add unlimited at $20 each",
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
  first_name: z.string().trim().min(1, "Add your first name."),
  email: z.string().trim().email("Enter a valid work email."),
});

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "redirecting"; url: string }
  | { kind: "pending"; message: string }
  | { kind: "error"; message: string };

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d0c0a]" />}>
      <SignupInner />
    </Suspense>
  );
}

function SignupInner() {
  const [plan, setPlan] = useState<PlanId>("team");
  const [cadence, setCadence] = useState<Cadence>("month");
  const [seats, setSeats] = useState<number>(TEAM_INCLUDED_SEATS);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    if (typeof window === "undefined") return;
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

    const parsed = signupSchema.safeParse({ first_name: firstName, email });
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

      try {
        await fetch("/api/auth/magic/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: parsed.data.email, first_name: parsed.data.first_name, plan }),
        });
      } catch {
        // best-effort
      }
      setStatus({
        kind: "pending",
        message: data.message || "Checkout will open in your inbox. We sent a sign-in link to your email.",
      });
    } catch {
      setStatus({ kind: "error", message: "Network error. Try again." });
    }
  }

  const isSubmitting = status.kind === "submitting" || status.kind === "redirecting";

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_1fr] bg-[#0d0c0a] text-white">
      {/* LEFT — full panel brand + plan summary */}
      <aside className="relative isolate flex flex-col justify-between overflow-hidden px-10 py-12 sm:px-16 sm:py-16 bg-gradient-to-br from-[#3a1a8e] via-[#5d2cd6] to-[#7a46de]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(800px 500px at 80% -10%, rgba(255,255,255,0.18), transparent 60%), radial-gradient(700px 600px at -10% 90%, rgba(0,0,0,0.35), transparent 60%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, #000 60%, transparent 100%)",
          }}
        />

        <a href="/" className="relative z-10 inline-flex items-center gap-3 text-2xl font-semibold tracking-tight">
          <span
            aria-hidden
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30 text-base font-bold"
          >
            A
          </span>
          ADGA
        </a>

        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium tracking-[0.14em] uppercase ring-1 ring-white/20">
            <span className="h-1.5 w-1.5 rounded-full bg-white/90" /> Start closing
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-[-0.025em] sm:text-5xl lg:text-[56px]">
            Close more deals, with the team that helps you close them.
          </h1>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-white/75 sm:text-base">
            One workspace for the pipeline, the documents, the follow-up, and every party on the deal.
          </p>

          {/* Plan summary card inside the brand panel */}
          <div className="mt-8 rounded-2xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur-sm">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/65">Selected plan</div>
                <div className="mt-1.5 text-lg font-semibold">
                  {meta.name} <span className="font-normal text-white/65">· {cadenceLabel}</span>
                </div>
              </div>
              <a href="/pricing" className="text-xs font-medium text-white/85 underline underline-offset-2 hover:text-white">
                Change
              </a>
            </div>
            <div className="mt-2 text-sm text-white/75">{meta.tagline}</div>
            <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-white/15 pt-4">
              <div className="text-xs text-white/65">{meta.seatsLabel}</div>
              <div className="text-2xl font-semibold">
                {formatCurrency(total)}
                <span className="ml-1 text-xs font-normal text-white/65">{cadenceLabel}</span>
              </div>
            </div>
            {plan !== "pro" && (
              <div className="mt-2 text-xs text-white/65">
                {seats} seat{seats === 1 ? "" : "s"}
                {cadence === "year" && " · 1 month free on annual"}
              </div>
            )}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3 text-xs text-white/55">
          <span>Cancel anytime</span>
          <span aria-hidden>·</span>
          <span>Encrypted sessions</span>
          <span aria-hidden>·</span>
          <span>No setup fees</span>
        </div>
      </aside>

      {/* RIGHT — full-height form panel */}
      <main className="flex flex-col bg-[#f9f7f4] text-[#0d0c0a]">
        <div className="flex items-center justify-end gap-4 px-8 pt-8 text-sm text-[#6b6760]">
          <span>Already have an account?</span>
          <a
            href="/login"
            className="rounded-full border border-[#e8e4de] bg-white px-4 py-1.5 text-[#0d0c0a] transition hover:border-[#5d2cd6] hover:text-[#5d2cd6]"
          >
            Sign in
          </a>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-12">
          <div className="w-full max-w-md">
            {status.kind === "pending" ? (
              <>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5d2cd6]">
                  Check your email
                </div>
                <h2 className="text-3xl font-semibold tracking-tight">Your account is ready to activate.</h2>
                <p className="mt-3 text-[15px] text-[#6b6760]">{status.message}</p>
                <div className="mt-8">
                  <a
                    href="/login"
                    className="inline-block rounded-full bg-[#5d2cd6] px-5 py-3 text-[15px] font-semibold text-white shadow-[0_10px_30px_-12px_rgba(86,36,199,0.6)] transition hover:bg-[#4920b3]"
                  >
                    Go to sign in
                  </a>
                </div>
              </>
            ) : (
              <>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5d2cd6]">
                  Create your account
                </div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Get started in 60 seconds.</h1>
                <p className="mt-3 text-[15px] text-[#6b6760]">
                  Confirm your plan, add your details, and continue to checkout.
                </p>

                <form onSubmit={submit} className="mt-8 grid gap-5" noValidate>
                  <div className="grid gap-2">
                    <label htmlFor="signup-first-name" className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6b6760]">
                      First name
                    </label>
                    <input
                      id="signup-first-name"
                      name="first_name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      type="text"
                      autoComplete="given-name"
                      placeholder="Maren"
                      required
                      disabled={isSubmitting}
                      className="rounded-lg border border-[#e8e4de] bg-white px-4 py-3 text-[15px] outline-none transition focus:border-[#5d2cd6] focus:ring-2 focus:ring-[#5d2cd6]/15"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="signup-email" className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6b6760]">
                      Work email
                    </label>
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
                      className="rounded-lg border border-[#e8e4de] bg-white px-4 py-3 text-[15px] outline-none transition focus:border-[#5d2cd6] focus:ring-2 focus:ring-[#5d2cd6]/15"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-full bg-[#5d2cd6] px-5 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_30px_-12px_rgba(86,36,199,0.6)] transition hover:bg-[#4920b3] disabled:opacity-60"
                  >
                    {status.kind === "submitting" && "Starting checkout…"}
                    {status.kind === "redirecting" && "Redirecting…"}
                    {(status.kind === "idle" || status.kind === "error") && "Continue to checkout"}
                  </button>
                  {status.kind === "error" && (
                    <p role="alert" className="text-sm text-[#b91c1c]">
                      {status.message}
                    </p>
                  )}
                </form>

                <p className="mt-8 text-xs text-[#6b6760]">
                  By continuing you agree to ADGA&apos;s{" "}
                  <a className="underline underline-offset-2" href="/terms">Terms</a> and{" "}
                  <a className="underline underline-offset-2" href="/privacy">Privacy Policy</a>.
                </p>
              </>
            )}
          </div>
        </div>

        <footer className="px-8 pb-8 text-xs text-[#9b9eb0]">© 2026 ADGA · Deal flow platform</footer>
      </main>
    </div>
  );
}
