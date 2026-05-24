"use client";

import React, { useEffect, useState } from "react";
import { z } from "zod";
import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";

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
  const [googleHref, setGoogleHref] = useState("/api/auth/google");
  const googleAuthEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") || params.get("redirect") || "/suite";
    setGoogleHref(`/api/auth/google?next=${encodeURIComponent(next)}`);

    const error = params.get("error");
    if (error === "google_not_configured") {
      setStatus({ kind: "error", message: "Google sign-in is not configured yet. Use email sign-in for now." });
    } else if (error?.startsWith("google_")) {
      setStatus({ kind: "error", message: "Google sign-in could not be completed. Try again or use email sign-in." });
    } else if (error === "auth_storage_missing") {
      setStatus({ kind: "error", message: "Authentication storage is not configured." });
    }
  }, []);

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
        body { background: #f8fafc !important; }
        .login-auth-page {
          background:
            radial-gradient(circle at 50% 0%, rgba(93, 44, 214, 0.08), transparent 34rem),
            linear-gradient(180deg, #ffffff 0%, #f8fafc 58%, #eef2f7 100%) !important;
        }
        .login-auth-page button.login-submit {
          background: #5d2cd6 !important;
          color: #fff !important;
        }
        .login-auth-page button.login-submit:hover {
          background: #4c1d95 !important;
        }
        .login-auth-page .google-login {
          color: #11100e !important;
        }
        @media (max-width: 640px) {
          .login-auth-page .login-proof { display: none !important; }
          .login-auth-page .login-card-wrap { align-items: flex-start !important; padding-top: 38px !important; }
        }
      `}</style>
      <MarketingLayout>
        <main className="login-auth-page text-[#11100e]">
          <section className="login-card-wrap wrap flex min-h-[760px] items-center justify-center pb-20 pt-12 lg:-translate-y-8">
            <section className="w-full max-w-[456px] rounded-[28px] border border-[#e2e8f0] bg-white/95 p-6 shadow-[0_28px_90px_-42px_rgba(15,23,42,0.54)] backdrop-blur sm:p-8">
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
                  <h1 className="mt-3 text-[40px] font-semibold leading-none tracking-[-0.04em]">Welcome.</h1>
                  <p className="mt-3 text-[15px] leading-7 text-[#6b6760]">
                    Enter your details and we will send the link that opens your account.
                  </p>

                  {googleAuthEnabled && (
                    <>
                      <a
                        href={googleHref}
                        className="google-login mt-7 inline-flex h-12 w-full items-center justify-center gap-3 rounded-full border border-[#d6dbe3] bg-white px-5 text-[15px] font-semibold shadow-sm transition hover:border-[#b8c0cc] hover:bg-[#f8fafc]"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
                          />
                        </svg>
                        Continue with Google
                      </a>

                      <div className="mt-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">
                        <span className="h-px flex-1 bg-[#e2e8f0]" />
                        Or use email
                        <span className="h-px flex-1 bg-[#e2e8f0]" />
                      </div>
                    </>
                  )}

                  <form onSubmit={submit} className={`${googleAuthEnabled ? "mt-6" : "mt-7"} grid gap-5`} noValidate>
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
                  <div className="login-proof mt-6 grid gap-2 border-t border-[#e2e8f0] pt-5 sm:grid-cols-3">
                    {["Magic link", "Secure session", "Billing ready"].map((label) => (
                      <div key={label} className="rounded-xl bg-[#f8fafc] px-3 py-2 text-center text-[11px] font-semibold text-[#64748b]">
                        {label}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </section>
        </main>
      </MarketingLayout>
    </>
  );
}
