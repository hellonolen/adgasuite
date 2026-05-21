"use client";

import React, { useEffect, useState } from "react";
import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";

type Plan = "individual" | "teams" | "enterprise";

function isPlan(value: string | null): value is Plan {
  return value === "individual" || value === "teams" || value === "enterprise";
}

export default function RequestAccessPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", role: "", plan: "teams", seats: "3", notes: "" });

  useEffect(() => {
    const plan = new URLSearchParams(window.location.search).get("plan");
    if (isPlan(plan)) {
      setForm((current) => ({ ...current, plan, seats: plan === "individual" ? "1" : current.seats }));
    }
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/access/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (response.ok) setSent(true);
  }

  return (
    <MarketingLayout>
      <div className="auth-container wrap">
        <div className="auth-card wide premium-surface">
          <div className="auth-split">
            <div className="auth-sidebar">
              <span className="ed-label">ADGA Suite</span>
              <h1>Request a workspace.</h1>
              <p className="muted">Choose how you want to run ADGA: solo, shared, or firm-wide.</p>
              <ul className="premium-list small" style={{marginTop: 24}}>
                <li>Individual deal desk</li>
                <li>Shared team workspace</li>
                <li>Enterprise environment</li>
                <li>Lead capture & follow-up</li>
              </ul>
            </div>

            <div className="auth-main">
              {sent ? (
                <div className="auth-success">
                  <h2>Request received.</h2>
                  <p className="muted">Your request is now in the operations queue.</p>
                  <a className="btn primary lg" href="/login" style={{marginTop: 24, display: 'inline-flex'}}>Go to sign in</a>
                </div>
              ) : (
                <form onSubmit={submit} className="auth-form premium-form">
                  <div className="form-grid">
                    <div className="field"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                    <div className="field"><label>Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" required /></div>
                    <div className="field"><label>Company</label><input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required /></div>
                    <div className="field">
                      <label>Plan</label>
                      <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
                        <option value="individual">Individual</option>
                        <option value="teams">Teams</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label>What are you trying to run?</label>
                    <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Tell us about your deal flow..." />
                  </div>
                  <button className="btn primary lg" type="submit">
                    Send request
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
