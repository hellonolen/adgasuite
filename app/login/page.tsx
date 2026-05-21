"use client";

import React, { useState } from "react";
import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("Opening workspace...");
    const response = await fetch("/api/auth/local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (response.ok) {
      window.location.href = "/suite";
      return;
    }
    setStatus("Access denied. Please check your credentials or request access.");
  }

  return (
    <MarketingLayout>
      <div className="auth-container wrap">
        <div className="auth-card premium-surface">
          <div className="auth-header">
            <span className="ed-label">Secure Access</span>
            <h1>Enter the suite.</h1>
            <p className="muted">Enter your email to access your workspace and deals.</p>
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
              Continue to workspace
            </button>
          </form>

          {status && <p className="auth-status-msg">{status}</p>}

          <div className="auth-footer">
            <p className="text-xs muted">
              New to ADGA? <a href="/request-access" className="accent-link">Request access</a>
            </p>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
