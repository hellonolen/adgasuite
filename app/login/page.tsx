"use client";

import React, { useState } from "react";
import { z } from "zod";
import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";

const emailSchema = z.string().email("Enter a valid work email.");

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; email: string; previewUrl?: string }
  | { kind: "error"; message: string };

export default function LoginPage() {
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
    const next = new URLSearchParams(window.location.search).get("next") || "/suite";

    try {
      const response = await fetch("/api/auth/magic/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: parsed.data, redirect: next }),
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
    <MarketingLayout>
      <div className="auth-page auth-two-panel wrap">
        <section className="auth-brand">
          <span className="auth-kicker">ADGA</span>
          <h1>Sign in to the room where deals close.</h1>
          <p>
            One verified email gets you back into your pipeline, documents, and follow-up. No passwords. No friction.
          </p>
          <div className="auth-proof">
            <span>Single-use sign-in link</span>
            <span>15-minute expiration</span>
            <span>Encrypted session after verify</span>
          </div>
        </section>

        <div className="auth-card premium-surface">
          {status.kind === "sent" ? (
            <div className="auth-success">
              <span className="ed-label">Check your email</span>
              <h2>Your sign-in link is on the way.</h2>
              <p className="muted">
                Sent to <b>{status.email}</b>. The link expires in 15 minutes and only works once.
              </p>
              {status.previewUrl && (
                <p className="auth-status-msg">
                  Local preview: <a className="accent-link" href={status.previewUrl}>open verification link</a>
                </p>
              )}
              <div className="auth-footer">
                <button type="button" className="accent-link" onClick={() => setStatus({ kind: "idle" })}>
                  Use a different email
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="auth-header">
                <span className="ed-label">Sign in</span>
                <h1>Sign in to ADGA.</h1>
                <p className="muted">Enter your work email and we&apos;ll send a verification link to open your workspace.</p>
              </div>

              <form onSubmit={submit} className="auth-form premium-form" noValidate>
                <div className="field">
                  <label htmlFor="login-email">Email address</label>
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
                  />
                </div>
                <button className="btn primary lg w-full" type="submit" disabled={isSending}>
                  {isSending ? "Sending..." : "Send magic link"}
                </button>
                {status.kind === "error" && <p className="auth-status-msg" role="alert">{status.message}</p>}
              </form>

              <div className="auth-footer">
                <p className="text-xs muted">
                  New here? <a href="/pricing" className="accent-link">See pricing</a>.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </MarketingLayout>
  );
}
