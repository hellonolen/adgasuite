"use client";

import React, { useState } from "react";
import { z } from "zod";

const emailSchema = z.string().email("Enter a valid work email.");

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; email: string; previewUrl?: string }
  | { kind: "error"; message: string };

export default function LoginPage() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const parsed = emailSchema.safeParse(email.trim());
    if (!parsed.success) {
      setStatus({ kind: "error", message: parsed.error.issues[0]?.message || "Enter a valid email." });
      return;
    }

    setStatus({ kind: "sending" });
    const next =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("next") ||
          new URLSearchParams(window.location.search).get("redirect") ||
          "/suite"
        : "/suite";

    try {
      const response = await fetch("/api/auth/magic/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: parsed.data, first_name: firstName.trim() || undefined, redirect: next }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; previewUrl?: string };

      if (response.ok) {
        setStatus({ kind: "sent", email: parsed.data, previewUrl: data.previewUrl });
        return;
      }

      setStatus({ kind: "error", message: data.error || "Could not send a sign-in link. Try again or choose a plan." });
    } catch {
      setStatus({ kind: "error", message: "Network error. Try again." });
    }
  }

  const isSending = status.kind === "sending";

  return (
    <>
      <style>{`
        body::before { display: none !important; }
        body { background: #f7f5f1 !important; }
        .login-auth-page button.login-submit {
          background: #5d2cd6 !important;
          color: #fff !important;
        }
        .login-auth-page button.login-submit:hover {
          background: #4c1d95 !important;
        }
        @media (max-width: 640px) {
          .login-auth-page .login-proof { display: none !important; }
          .login-auth-page .login-hero-title { font-size: 40px !important; }
          .login-auth-page .login-hero-copy { font-size: 16px !important; line-height: 1.65 !important; }
        }
      `}</style>
      <main className="login-auth-page min-h-screen bg-[#f7f5f1] text-[#11100e]">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between gap-4 border-b border-[#ded9d1] pb-5">
            <a href="/" className="text-2xl font-semibold tracking-[-0.03em] text-[#5d2cd6]">
              ADGA
            </a>
            <div className="flex items-center gap-2 text-sm text-[#68625a]">
              <span className="hidden sm:inline">Need a workspace?</span>
              <a
                href="/pricing"
                className="inline-flex h-10 items-center rounded-full border border-[#d8d1c8] bg-white px-4 font-medium text-[#11100e] shadow-sm transition hover:border-[#5d2cd6] hover:text-[#5d2cd6]"
              >
                See pricing
              </a>
            </div>
          </header>

          <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,0.72fr)] lg:gap-16 lg:py-16">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#ded9d1] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b6760] shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#5d2cd6]" />
                Secure workspace access
              </div>
              <h1 className="login-hero-title text-[44px] font-semibold leading-[0.98] tracking-[-0.045em] text-[#11100e] sm:text-[64px] lg:text-[78px]">
                Welcome.
              </h1>
              <p className="login-hero-copy mt-6 max-w-xl text-lg leading-8 text-[#5f5a52]">
                Sign in with a single-use link and continue into the workspace, onboarding, billing, or the deal you were working.
              </p>
              <div className="login-proof mt-9 grid max-w-2xl gap-3 sm:grid-cols-3">
                {[
                  ["No password", "Magic links only"],
                  ["Session protected", "30-day secure session"],
                  ["Workspace ready", "Deals, billing, profile"],
                ].map(([label, body]) => (
                  <div key={label} className="rounded-2xl border border-[#ded9d1] bg-white/75 p-4 shadow-sm">
                    <div className="text-sm font-semibold text-[#11100e]">{label}</div>
                    <div className="mt-1 text-xs leading-5 text-[#6b6760]">{body}</div>
                  </div>
                ))}
              </div>
            </div>

            <section className="rounded-[28px] border border-[#ded9d1] bg-white p-6 shadow-[0_26px_80px_-42px_rgba(33,25,18,0.42)] sm:p-8">
              {status.kind === "sent" ? (
                <>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5d2cd6]">Check your email</div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight">Your sign-in link is on the way.</h2>
                  <p className="mt-3 text-[15px] leading-7 text-[#6b6760]">
                    Sent to <b className="text-[#11100e]">{status.email}</b>. The link expires in 15 minutes and only works once.
                  </p>
                  {status.previewUrl && (
                    <p className="mt-4 text-sm">
                      Local preview:{" "}
                      <a className="text-[#5d2cd6] underline underline-offset-2" href={status.previewUrl}>
                        open verification link
                      </a>
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setStatus({ kind: "idle" })}
                    className="mt-8 text-sm font-medium text-[#5d2cd6] hover:underline"
                  >
                    Use a different email
                  </button>
                </>
              ) : (
                <>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5d2cd6]">Sign in</div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight">Open ADGA.</h2>
                  <p className="mt-3 text-[15px] leading-7 text-[#6b6760]">
                    Enter your details and we will send the link that opens your account.
                  </p>

                  <form onSubmit={submit} className="mt-8 grid gap-5" noValidate>
                    <div className="grid gap-2">
                      <label htmlFor="login-first-name" className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6b6760]">
                        First name
                      </label>
                      <input
                        id="login-first-name"
                        name="first_name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        type="text"
                        autoComplete="given-name"
                        placeholder="Maren"
                        disabled={isSending}
                        className="h-12 rounded-xl border border-[#ded9d1] bg-[#fbfaf8] px-4 text-[15px] outline-none transition focus:border-[#5d2cd6] focus:bg-white focus:ring-4 focus:ring-[#5d2cd6]/10"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="login-email" className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6b6760]">
                        Email address
                      </label>
                      <input
                        id="login-email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        required
                        disabled={isSending}
                        className="h-12 rounded-xl border border-[#ded9d1] bg-[#fbfaf8] px-4 text-[15px] outline-none transition focus:border-[#5d2cd6] focus:bg-white focus:ring-4 focus:ring-[#5d2cd6]/10"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSending}
                      className="login-submit h-12 rounded-full px-5 text-[15px] font-semibold shadow-[0_18px_34px_-18px_rgba(93,44,214,0.78)] transition disabled:opacity-60"
                    >
                      {isSending ? "Sending link..." : "Send sign-in link"}
                    </button>
                    {status.kind === "error" && (
                      <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#b91c1c]">
                        {status.message}
                      </p>
                    )}
                  </form>

                  <p className="mt-7 text-xs leading-6 text-[#6b6760]">
                    By signing in you agree to ADGA&apos;s <a className="underline underline-offset-2" href="/policies">policies</a>.
                  </p>
                </>
              )}
            </section>
          </section>
        </div>
      </main>
    </>
  );
}
