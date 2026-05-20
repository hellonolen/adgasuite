// @ts-nocheck
"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("hellonolen@gmail.com");
  const [status, setStatus] = useState("");

  async function submit(event) {
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
    setStatus("Access could not be opened from this browser.");
  }

  return (
    <main className="auth-page">
      <a href="/" className="auth-brand"><span className="mark">A</span> ADGA</a>
      <section className="auth-card">
        <p className="auth-kicker">Workspace access</p>
        <h1>Enter the suite.</h1>
        <p className="auth-copy">Local development keeps owner access open for the approved admin emails. Production sign-in can be connected when payment and identity are ready.</p>
        <form onSubmit={submit} className="auth-form">
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <button className="btn primary lg" type="submit">Continue to suite</button>
        </form>
        {status && <p className="auth-status">{status}</p>}
        <div className="auth-links">
          <a href="/request-access">Request access</a>
          <a href="/">Back to ADGA</a>
        </div>
      </section>
    </main>
  );
}
