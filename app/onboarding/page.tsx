"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { z } from "zod";

const schema = z.object({
  first_name: z.string().trim().min(1, "Add your first name."),
  email: z.string().trim().email("Enter a valid work email."),
});

type Status =
  | { kind: "idle" }
  | { kind: "checking_checkout" }
  | { kind: "checkout_verified"; email: string }
  | { kind: "sending" }
  | { kind: "sent"; email: string; previewUrl?: string }
  | { kind: "error"; message: string };

export default function OnboardingPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f7f5f1]" />}>
      <OnboardingInner />
    </Suspense>
  );
}

function OnboardingInner() {
  const [plan, setPlan] = useState("team");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [lockedEmail, setLockedEmail] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const checkoutCompleted = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPlan(params.get("plan") || "team");

    const sessionId = params.get("session_id");
    if (!sessionId || checkoutCompleted.current) return;
    checkoutCompleted.current = true;
    setStatus({ kind: "checking_checkout" });

    fetch("/api/billing/stripe/checkout/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          email?: string;
          plan?: string;
          redirect?: string;
        };
        if (!response.ok) throw new Error(data.error || "Could not verify checkout.");
        if (data.email) {
          setEmail(data.email);
          setLockedEmail(true);
          setStatus({ kind: "checkout_verified", email: data.email });
        }
        if (data.plan) setPlan(data.plan);
        window.setTimeout(() => {
          window.location.href = data.redirect || "/suite/onboarding";
        }, 900);
      })
      .catch((error) => {
        setLockedEmail(false);
        setStatus({
          kind: "error",
          message: error instanceof Error ? error.message : "Could not verify checkout. Use your billing email to continue.",
        });
      });
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse({ first_name: firstName, email });
    if (!parsed.success) {
      setStatus({ kind: "error", message: parsed.error.issues[0]?.message || "Check your details." });
      return;
    }

    setStatus({ kind: "sending" });
    try {
      const response = await fetch("/api/auth/magic/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: parsed.data.email,
          first_name: parsed.data.first_name,
          plan,
          redirect: "/suite/onboarding",
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; previewUrl?: string };
      if (!response.ok) {
        setStatus({ kind: "error", message: data.error || "Could not send the activation link." });
        return;
      }
      setStatus({ kind: "sent", email: parsed.data.email, previewUrl: data.previewUrl });
    } catch {
      setStatus({ kind: "error", message: "Network error. Try again." });
    }
  }

  return (
    <>
      <style>{`
        body::before { display: none !important; }
        body { background: #f7f5f1 !important; }
        .onboarding-page button.onboarding-submit {
          background: #5d2cd6 !important;
          color: #fff !important;
        }
        .onboarding-page button.onboarding-submit:hover {
          background: #4c1d95 !important;
        }
      `}</style>
      <main className="onboarding-page min-h-screen bg-[#f7f5f1] text-[#11100e]">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-5 sm:px-8 lg:min-h-screen lg:grid-cols-[minmax(0,0.88fr)_minmax(420px,0.72fr)] lg:gap-8 lg:px-10">
          <section className="flex flex-col self-start rounded-[32px] border border-[#ded9d1] bg-white p-7 shadow-sm sm:p-10 lg:justify-between lg:self-stretch">
            <a href="/" className="text-2xl font-semibold tracking-[-0.03em] text-[#5d2cd6]">ADGA</a>
            <div className="py-10 lg:py-0">
              <div className="mb-5 inline-flex rounded-full border border-[#ded9d1] bg-[#fbfaf8] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b6760]">
                Payment received
              </div>
              <h1 className="max-w-3xl text-[42px] font-semibold leading-[1] tracking-[-0.045em] sm:text-[62px]">
                Let&apos;s finish setting up your workspace.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#5f5a52]">
                Create the account owner, verify the email, then ADGA will take you into onboarding to set profile, billing, team, and first dealflow.
              </p>
            </div>
            <div className="hidden gap-3 sm:grid sm:grid-cols-3">
              {["Verify email", "Complete profile", "Open workspace"].map((step, index) => (
                <div key={step} className="rounded-2xl border border-[#ded9d1] bg-[#fbfaf8] p-4">
                  <div className="font-mono text-[11px] text-[#5d2cd6]">0{index + 1}</div>
                  <div className="mt-2 text-sm font-semibold">{step}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="self-center rounded-[28px] border border-[#ded9d1] bg-white p-6 shadow-[0_26px_80px_-42px_rgba(33,25,18,0.42)] sm:p-8">
            {status.kind === "sent" ? (
              <>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5d2cd6]">Check your email</div>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">Activation link sent.</h2>
                <p className="mt-3 text-[15px] leading-7 text-[#6b6760]">
                  Sent to <b className="text-[#11100e]">{status.email}</b>. After verification, you will continue to workspace onboarding.
                </p>
                {status.previewUrl && (
                  <a className="mt-5 inline-flex text-sm font-medium text-[#5d2cd6] underline underline-offset-2" href={status.previewUrl}>
                    Open local verification link
                  </a>
                )}
              </>
            ) : status.kind === "checking_checkout" || status.kind === "checkout_verified" ? (
              <>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5d2cd6]">
                  {status.kind === "checking_checkout" ? "Verifying checkout" : "Checkout verified"}
                </div>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                  {status.kind === "checking_checkout" ? "Confirming your payment." : "Opening onboarding."}
                </h2>
                <p className="mt-3 text-[15px] leading-7 text-[#6b6760]">
                  {status.kind === "checking_checkout"
                    ? "We are checking the Stripe session before creating your workspace session."
                    : (
                      <>
                        Verified for <b className="text-[#11100e]">{status.email}</b>. Taking you to workspace onboarding.
                      </>
                    )}
                </p>
                {email && (
                  <div className="mt-6 grid gap-2">
                    <label htmlFor="onboarding-email-locked" className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6b6760]">Billing email</label>
                    <input id="onboarding-email-locked" type="email" value={email} readOnly className="h-12 rounded-xl border border-[#ded9d1] bg-[#f1eee8] px-4 text-[#5f5a52] outline-none" />
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5d2cd6]">Account owner</div>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">Register your account.</h2>
                <p className="mt-3 text-[15px] leading-7 text-[#6b6760]">
                  Use the email that should own billing and workspace administration.
                </p>
                <form onSubmit={submit} className="mt-8 grid gap-5" noValidate>
                  <div className="grid gap-2">
                    <label htmlFor="onboarding-name" className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6b6760]">First name</label>
                    <input id="onboarding-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} className="h-12 rounded-xl border border-[#ded9d1] bg-[#fbfaf8] px-4 outline-none focus:border-[#5d2cd6] focus:bg-white focus:ring-4 focus:ring-[#5d2cd6]/10" placeholder="Maren" />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="onboarding-email" className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6b6760]">Work email</label>
                    <input id="onboarding-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} readOnly={lockedEmail} className="h-12 rounded-xl border border-[#ded9d1] bg-[#fbfaf8] px-4 outline-none focus:border-[#5d2cd6] focus:bg-white focus:ring-4 focus:ring-[#5d2cd6]/10 read-only:bg-[#f1eee8] read-only:text-[#5f5a52]" placeholder="you@company.com" />
                  </div>
                  <button className="onboarding-submit h-12 rounded-full px-5 text-[15px] font-semibold shadow-[0_18px_34px_-18px_rgba(93,44,214,0.78)] transition" disabled={status.kind === "sending"}>
                    {status.kind === "sending" ? "Sending activation link..." : "Send activation link"}
                  </button>
                  {status.kind === "error" && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#b91c1c]">{status.message}</p>}
                </form>
              </>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
