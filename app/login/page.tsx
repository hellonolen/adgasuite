"use client";

import React, { useState } from "react";
import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [status, setStatus] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPreviewUrl("");
    setStatus("Sending secure sign-in link...");
    const next = new URLSearchParams(window.location.search).get("next") || "/suite";
    const response = await fetch("/api/auth/magic/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, redirect: next }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setStatus("Check your email. The sign-in link expires in 15 minutes.");
      if (data.previewUrl) setPreviewUrl(data.previewUrl);
      return;
    }
    setStatus(data.error || "Could not send a sign-in link. Choose a plan to get started.");
  }

  return (
    <MarketingLayout>
      <div className="auth-page auth-two-panel wrap">
        <section className="auth-brand">
          <span className="auth-kicker">ADGA sign in</span>
          <h1>Enter the deal workspace with a verified email.</h1>
          <p>
            ADGA uses a short-lived magic link so teams can open the suite without carrying another password into deal work.
          </p>
          <div className="auth-proof">
            <span>Single-use links</span>
            <span>Postmark delivery</span>
            <span>Session cookie after verification</span>
          </div>
        </section>
        <div className="auth-card premium-surface">
          <div className="auth-header">
            <span className="ed-label">Sign in</span>
            <h1>Sign in to ADGA.</h1>
            <p className="muted">Enter your work email. We’ll send a clean verification link to open your workspace.</p>
          </div>

          <form onSubmit={submit} className="auth-form premium-form">
            <div className="field">
              <label>Email address</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="maren.voss@concorde.co"
                required
              />
            </div>
            <button className="btn primary lg w-full" type="submit">
              Send magic link
            </button>
          </form>

          {status && <p className="auth-status-msg">{status}</p>}
          {previewUrl && (
            <p className="auth-status-msg">
              Local preview: <a className="accent-link" href={previewUrl}>open verification link</a>
            </p>
          )}

          <div className="auth-footer">
            <p className="text-xs muted">
              New to ADGA? <a href="/pricing" className="accent-link">Choose a plan</a>.
            </p>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
