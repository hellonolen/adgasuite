"use client";

import React, { useEffect, useState } from "react";
import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";

export default function VerifyAuthPage() {
  const [status, setStatus] = useState("Verifying your ADGA sign-in link...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setStatus("This sign-in link is missing a token.");
      return;
    }

    fetch("/api/auth/magic/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Could not verify this link.");
        window.location.href = data.redirect || "/suite";
      })
      .catch((error) => setStatus(error.message || "This sign-in link is invalid or expired."));
  }, []);

  return (
    <MarketingLayout>
      <main className="auth-page auth-two-panel wrap">
        <section className="auth-brand">
          <span className="auth-kicker">Secure sign in</span>
          <h1>ADGA is verifying your deal workspace.</h1>
          <p>Magic links are short-lived, single-use, and tied to the email address that requested the sign-in link.</p>
        </section>
        <section className="auth-card">
          <span className="auth-kicker">Verification</span>
          <h2>Checking link</h2>
          <p className="auth-status">{status}</p>
          <div className="auth-links">
            <a href="/login">Send a new sign-in link</a>
          </div>
        </section>
      </main>
    </MarketingLayout>
  );
}
