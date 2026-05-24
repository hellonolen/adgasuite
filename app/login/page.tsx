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
    const next = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("next") || "/suite"
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
    <style>{`body::before { display: none !important; }`}</style>
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_1fr] bg-[#0d0c0a] text-white">
      {/* LEFT — full panel brand */}
      <aside className="relative flex flex-col justify-between overflow-hidden px-10 py-12 sm:px-16 sm:py-16 bg-gradient-to-br from-[#4a1eb5] via-[#5d2cd6] to-[#7c4ade]">
        <a href="/" className="inline-flex items-center gap-3 text-2xl font-semibold tracking-tight">
          <span
            aria-hidden
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30 text-base font-bold"
          >
            A
          </span>
          ADGA
        </a>

        <div className="max-w-xl">
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-[-0.025em] sm:text-5xl lg:text-[56px]">
            Close more deals.
          </h1>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-white/85 sm:text-base">
            Every contact, call, document, and next action stays tied to the deal — so closes happen on schedule, not by accident.
          </p>
          <ul className="mt-8 grid gap-3 text-sm text-white/90 sm:text-[15px]">
            {[
              "Every party and artifact on the deal",
              "Templates for Acquire, Series A, M&A, and more",
              "The next move surfaced before it slips",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span aria-hidden className="mt-1.5 inline-flex h-2 w-2 flex-shrink-0 rounded-full bg-white/90" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-3 text-xs text-white/70">
          <span>Single-use sign-in</span>
          <span aria-hidden>·</span>
          <span>Expires in 15 minutes</span>
          <span aria-hidden>·</span>
          <span>Encrypted sessions</span>
        </div>
      </aside>

      {/* RIGHT — full-height form panel */}
      <main className="flex flex-col bg-[#f9f7f4] text-[#0d0c0a]">
        <div className="flex items-center justify-end gap-4 px-8 pt-8 text-sm text-[#6b6760]">
          <span>New to ADGA?</span>
          <a
            href="/pricing"
            className="rounded-full border border-[#e8e4de] bg-white px-4 py-1.5 text-[#0d0c0a] transition hover:border-[#5d2cd6] hover:text-[#5d2cd6]"
          >
            See pricing
          </a>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-12">
          <div className="w-full max-w-md">
            {status.kind === "sent" ? (
              <>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5d2cd6]">
                  Check your email
                </div>
                <h2 className="text-3xl font-semibold tracking-tight">Your sign-in link is on the way.</h2>
                <p className="mt-3 text-[15px] text-[#6b6760]">
                  Sent to <b className="text-[#0d0c0a]">{status.email}</b>. The link expires in 15 minutes and only works once.
                </p>
                {status.previewUrl && (
                  <p className="mt-4 text-sm">
                    Local preview:{" "}
                    <a className="text-[#5d2cd6] underline underline-offset-2" href={status.previewUrl}>
                      open verification link
                    </a>
                  </p>
                )}
                <div className="mt-8 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setStatus({ kind: "idle" })}
                    className="text-sm font-medium text-[#5d2cd6] hover:underline"
                  >
                    ← Use a different email
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5d2cd6]">
                  Sign in
                </div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Welcome back.</h1>
                <p className="mt-3 text-[15px] text-[#6b6760]">
                  Enter your name and email and we&apos;ll send a verification link to open your workspace.
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
                      className="rounded-lg border border-[#e8e4de] bg-white px-4 py-3 text-[15px] outline-none transition focus:border-[#5d2cd6] focus:ring-2 focus:ring-[#5d2cd6]/15"
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
                      className="rounded-lg border border-[#e8e4de] bg-white px-4 py-3 text-[15px] outline-none transition focus:border-[#5d2cd6] focus:ring-2 focus:ring-[#5d2cd6]/15"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="rounded-full bg-[#5d2cd6] px-5 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_30px_-12px_rgba(86,36,199,0.6)] transition hover:bg-[#4920b3] disabled:opacity-60"
                  >
                    {isSending ? "Sending magic link…" : "Send magic link"}
                  </button>
                  {status.kind === "error" && (
                    <p role="alert" className="text-sm text-[#b91c1c]">
                      {status.message}
                    </p>
                  )}
                </form>

                <p className="mt-8 text-xs text-[#6b6760]">
                  By signing in you agree to ADGA&apos;s{" "}
                  <a className="underline underline-offset-2" href="/terms">Terms</a> and{" "}
                  <a className="underline underline-offset-2" href="/privacy">Privacy Policy</a>.
                </p>
              </>
            )}
          </div>
        </div>

        <footer className="px-8 pb-8 text-xs text-[#9b9eb0]">© {new Date().getFullYear()} ADGA</footer>
      </main>
    </div>
    </>
  );
}
