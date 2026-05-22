"use client";

import React, { useEffect, useState } from "react";
import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";

type Plan = "individual" | "teams" | "enterprise";

function isPlan(value: string | null): value is Plan {
  return value === "individual" || value === "teams" || value === "enterprise";
}

function normalizePlanParam(value: string | null): Plan | null {
  if (isPlan(value)) return value;
  if (value === "pro") return "individual";
  if (value === "team") return "teams";
  return null;
}

const PLANS: Array<{ id: Plan; name: string; price: string; note: string }> = [
  { id: "individual", name: "Individual", price: "$99/mo", note: "For one operator running a private deal desk." },
  { id: "teams", name: "Teams", price: "$249/seat", note: "For shared teams, documents, records, and follow-up." },
  { id: "enterprise", name: "Enterprise", price: "Custom", note: "For firms that need controls, onboarding, and review." },
];

export default function RequestAccessPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", role: "", plan: "teams", seats: "3", notes: "" });

  useEffect(() => {
    const plan = new URLSearchParams(window.location.search).get("plan");
    const normalized = normalizePlanParam(plan);
    if (normalized) {
      const seats = normalized === "individual" ? "1" : normalized === "enterprise" ? "25+" : "3";
      setForm((current) => ({ ...current, plan: normalized, seats }));
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
      <main className="access-page wrap">
        <section className="access-hero">
          <div className="access-copy">
            <span className="ed-label">ADGA Suite</span>
            <h1>Start with the right plan.</h1>
            <p>
              Existing users should sign in. New workspaces should choose a plan, verify email during onboarding, then enter the suite.
            </p>
            <div className="access-actions">
              <a className="btn primary lg" href="/pricing">Get started</a>
              <a className="btn lg" href="/login">Sign in</a>
            </div>
            <div className="access-steps" aria-label="Start flow">
              <div><b>1</b><span>Choose a plan on pricing</span></div>
              <div><b>2</b><span>Verify email and complete purchase/review</span></div>
              <div><b>3</b><span>Sign in and open the suite</span></div>
            </div>
          </div>

          <div className="access-panel premium-surface">
            <div className="access-panel-head">
              <div>
                <span className="ed-label">Selected plan</span>
                <h2>{PLANS.find((plan) => plan.id === form.plan)?.name || "Teams"} plan</h2>
              </div>
              <a href="/pricing" className="accent-link">Change plan</a>
            </div>

            <div className="access-plan-grid">
              {PLANS.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  className={"access-plan-card " + (form.plan === plan.id ? "selected" : "")}
                  onClick={() => setForm({ ...form, plan: plan.id, seats: plan.id === "individual" ? "1" : plan.id === "enterprise" ? "25+" : form.seats })}
                >
                  <span>{plan.name}</span>
                  <b>{plan.price}</b>
                  <small>{plan.note}</small>
                </button>
              ))}
            </div>

            <div className="access-form-wrap">
              {sent ? (
                <div className="auth-success">
                  <h2>Workspace request received.</h2>
                  <p className="muted">Next step: verify the email address you submitted. After purchase confirmation, use sign in to enter the suite.</p>
                  <div className="access-actions compact">
                    <a className="btn primary lg" href="/login">Go to sign in</a>
                    <a className="btn lg" href="/pricing">Return to pricing</a>
                  </div>
                </div>
              ) : (
                <form onSubmit={submit} className="auth-form premium-form">
                  <div className="form-grid">
                    <div className="field"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" required /></div>
                    <div className="field"><label>Work email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" autoComplete="email" required /></div>
                    <div className="field"><label>Company</label><input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} autoComplete="organization" required /></div>
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
                    <label>What should this workspace support?</label>
                    <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} placeholder="Deal flow, documents, team size, records, compliance, or onboarding needs." />
                  </div>
                  <div className="access-submit-row">
                    <button className="btn primary lg" type="submit">Verify email</button>
                    <span>Ready to begin? Start on <a href="/pricing">pricing</a>.</span>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
    </MarketingLayout>
  );
}
