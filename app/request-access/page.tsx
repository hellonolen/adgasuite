// @ts-nocheck
"use client";

import { useEffect, useState } from "react";

export default function RequestAccessPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", role: "", plan: "teams", seats: "3", notes: "" });

  useEffect(() => {
    const plan = new URLSearchParams(window.location.search).get("plan");
    if (["individual", "teams", "enterprise"].includes(plan || "")) {
      setForm((current) => ({ ...current, plan, seats: plan === "individual" ? "1" : current.seats }));
    }
  }, []);

  async function submit(event) {
    event.preventDefault();
    const response = await fetch("/api/access/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (response.ok) setSent(true);
  }

  return (
    <main className="auth-page request-page">
      <a href="/" className="auth-brand"><span className="mark">A</span> ADGA</a>
      <section className="auth-card wide">
        <div>
          <p className="auth-kicker">ADGA Suite</p>
          <h1>Request a workspace.</h1>
          <p className="auth-copy">Choose the way you want to run ADGA: one individual deal desk, a shared team workspace, or an enterprise environment.</p>
          <div className="auth-proof">
            <span>Individual</span>
            <span>Teams</span>
            <span>Enterprise</span>
            <span>Lead capture</span>
            <span>Deal workspace</span>
          </div>
        </div>
        {sent ? (
          <div className="auth-success">
            <h2>Request received.</h2>
            <p>The access request is now in the ADGA operations queue.</p>
            <a className="btn primary lg" href="/login">Go to sign in</a>
          </div>
        ) : (
          <form onSubmit={submit} className="auth-form">
            <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" required /></label>
            <label>Company<input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required /></label>
            <div className="row2">
              <label>Plan
                <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
                  <option value="individual">Individual</option>
                  <option value="teams">Teams</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </label>
              <label>Seats<input value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} /></label>
            </div>
            <label>Role<input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></label>
            <label>What are you trying to run?<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} /></label>
            <button className="btn primary lg" type="submit">Request access</button>
          </form>
        )}
      </section>
    </main>
  );
}
