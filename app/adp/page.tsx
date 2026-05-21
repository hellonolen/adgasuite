"use client";

import React, { useState } from "react";
import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";

const needs = [
  "Payroll",
  "Payroll tax filing",
  "Hiring and onboarding",
  "Time and attendance",
  "Benefits administration",
  "Workers' compensation",
  "Retirement plan support",
  "HR compliance",
];

export default function AdpPartnerPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("sending");
    setMessage("");

    const response = await fetch("/api/partners/adp/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: form.get("full_name"),
        email: form.get("email"),
        phone: form.get("phone"),
        company: form.get("company"),
        job_title: form.get("job_title"),
        company_size: form.get("company_size"),
        state: form.get("state"),
        payroll_timing: form.get("payroll_timing"),
        current_payroll_provider: form.get("current_payroll_provider"),
        needs: form.getAll("needs"),
        notes: form.get("notes"),
        consent_to_contact: form.get("consent_to_contact") === "on",
        source_path: "/adp",
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.ok) {
      setStatus("sent");
      setMessage("Your payroll lead has been received and routed for ADP follow-up.");
      event.currentTarget.reset();
    } else {
      setStatus("error");
      setMessage(payload.error || "The lead could not be submitted. Please try again.");
    }
  }

  return (
    <MarketingLayout>
      <div className="wrap">
        <section className="page-hero">
          <div>
            <div className="eyebrow">
              <span>ADGA Affiliate</span>
              <span className="dot" />
              <span>Partner Channel</span>
            </div>
            <h1>
              Send your<br />
              <em>payroll lead.</em>
            </h1>
          </div>
          <div>
            <p className="lede">
              ADGA captures the contact, company, timing, needs, and consent details, then routes the record to the assigned ADP referral inbox.
            </p>
          </div>
        </section>

        <section className="section" style={{ borderTop: 0 }}>
          <div className="split-view">
            <div className="partner-content">
              <div className="card">
                <div className="card-h"><span className="ttl">What ADP can help with</span></div>
                <div className="card-b">
                  <ul className="premium-list">
                    <li>Payroll processing and payroll taxes</li>
                    <li>Hiring, onboarding, HR, and compliance support</li>
                    <li>Time tracking, benefits, workers' compensation</li>
                    <li>Small-business payroll options (RUN)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="partner-form-container">
              <form className="partner-form premium-form" onSubmit={submit}>
                <div className="form-grid">
                  <div className="field"><label>Full name</label><input name="full_name" required /></div>
                  <div className="field"><label>Email</label><input name="email" type="email" required /></div>
                  <div className="field"><label>Phone</label><input name="phone" type="tel" /></div>
                  <div className="field"><label>Company</label><input name="company" /></div>
                </div>

                <div className="field">
                  <label>Notes</label>
                  <textarea name="notes" rows={3} placeholder="Anything ADP should know..." />
                </div>

                <div className="form-footer">
                  <button className="btn primary lg" type="submit" disabled={status === "sending"}>
                    {status === "sending" ? "Sending..." : "Send payroll lead"}
                  </button>
                  {message && <p className={`status-msg ${status}`}>{message}</p>}
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
