"use client";

import { useState } from "react";

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
    <main className="partner-page">
      <nav className="partner-nav">
        <a href="/" className="partner-brand"><span>A</span> ADGA</a>
        <div>
          <a href="/suite">Suite</a>
          <a href="/request-access">Contact ADGA</a>
        </div>
      </nav>

      <section className="partner-hero">
        <div>
          <p className="partner-kicker">ADGA affiliate partner</p>
          <h1>Send your payroll lead to ADP.</h1>
          <p>
            Use this page to submit a complete payroll lead for ADP follow-up. ADGA captures the contact,
            company, timing, needs, and consent details, then routes the record to the assigned ADP referral inbox.
          </p>
          <div className="partner-proof">
            <span>Lead details tracked</span>
            <span>Email routing logged</span>
            <span>Date and source recorded</span>
          </div>
        </div>
        <div className="partner-panel">
          <h2>What ADP can help with</h2>
          <ul>
            <li>Payroll processing and payroll taxes</li>
            <li>Hiring, onboarding, HR, and compliance support</li>
            <li>Time tracking, benefits, workers' compensation, and retirement support</li>
            <li>Small-business payroll options including RUN Powered by ADP</li>
          </ul>
        </div>
      </section>

      <section className="partner-form-wrap">
        <div>
          <p className="partner-kicker">Payroll lead form</p>
          <h2>Capture the full lead.</h2>
          <p>
            Capture the contact, company, payroll timing, selected needs, notes, and consent
            so ADGA can route the referral cleanly.
          </p>
        </div>

        <form className="partner-form" onSubmit={submit}>
          <div className="partner-grid">
            <label>Full name<input name="full_name" required /></label>
            <label>Email<input name="email" type="email" required /></label>
            <label>Phone<input name="phone" type="tel" /></label>
            <label>Company<input name="company" /></label>
            <label>Title<input name="job_title" /></label>
            <label>State<input name="state" /></label>
            <label>Company size
              <select name="company_size" defaultValue="">
                <option value="" disabled>Select size</option>
                <option>1-9 employees</option>
                <option>10-49 employees</option>
                <option>50-199 employees</option>
                <option>200+ employees</option>
              </select>
            </label>
            <label>Payroll timing
              <select name="payroll_timing" defaultValue="">
                <option value="" disabled>Select timing</option>
                <option>Immediately</option>
                <option>This month</option>
                <option>This quarter</option>
                <option>Researching options</option>
              </select>
            </label>
            <label className="partner-wide">Current payroll provider<input name="current_payroll_provider" placeholder="None, ADP, Gusto, Paychex, QuickBooks, other" /></label>
          </div>

          <fieldset>
            <legend>What does the lead need?</legend>
            <div className="partner-checks">
              {needs.map((need) => (
                <label key={need}><input type="checkbox" name="needs" value={need} /> {need}</label>
              ))}
            </div>
          </fieldset>

          <label>Notes<textarea name="notes" rows={5} placeholder="Anything ADP should know before follow-up." /></label>

          <label className="partner-consent">
            <input type="checkbox" name="consent_to_contact" required />
            This contact has agreed to be contacted about ADP payroll services.
          </label>

          <button className="partner-submit" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Sending lead..." : "Send payroll lead"}
          </button>

          {message && <p className={`partner-status ${status}`}>{message}</p>}
        </form>
      </section>
    </main>
  );
}
