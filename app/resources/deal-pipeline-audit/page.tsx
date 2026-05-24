"use client";

import { type FormEvent, useState } from "react";
import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";
import { MarketingHero } from "@/components/adga/layout/MarketingHero";

const BENEFITS = [
  "Find stale deals before they become dead deals",
  "Spot missing owners, due dates, proof, invoices, and close blockers",
  "Create a focused recovery list for the next 48 hours",
];

const CHECKLIST = [
  "Lead source, owner, urgency, and first next action",
  "Stage age, stage confidence, and stale deal risk",
  "Call notes, documents, transcripts, and decision record",
  "Signature, invoice, payment link, and handoff status",
];

export default function DealPipelineAuditPage() {
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("submitting");

    const response = await fetch("/api/access/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(form.get("name") || ""),
        email: String(form.get("email") || ""),
        company: String(form.get("company") || ""),
        notes: "Lead magnet requested: Deal Pipeline Audit Checklist landing page",
      }),
    }).catch(() => null);

    setStatus(response?.ok ? "sent" : "error");
  }

  return (
    <MarketingLayout>
      <div className="wrap">
        <MarketingHero
          variant="compact"
          headline="Deal Pipeline Audit Checklist"
          deck="A practical free resource for finding stale deals, missing follow-ups, invoice gaps, and close blockers before your next pipeline review."
          primaryCta={{ label: "Download checklist", href: "#download" }}
          paddingBottom={24}
        />

        <section className="section" id="download" style={{ borderTop: 0, paddingTop: 48 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32, maxWidth: 1080, margin: "0 auto", alignItems: "start" }}>
            <div>
              <span className="ed-label">Free resource</span>
              <h2 className="title">Audit the pipeline before it costs you a close.</h2>
              <p style={{ marginTop: 14, color: "var(--adga-text-2)", lineHeight: 1.65 }}>
                Use the checklist when a pipeline feels full but unclear. It walks through lead capture, ownership, next actions, stage health, proof, context, invoice status, and close-path recovery.
              </p>
              <ul style={{ margin: "20px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 12 }}>
                {BENEFITS.map((benefit) => (
                  <li key={benefit} style={{ display: "grid", gridTemplateColumns: "22px 1fr", gap: 10, fontSize: 14.5, color: "var(--adga-text)" }}>
                    <span style={{ color: "var(--accent)" }}>✓</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid var(--rule)", borderRadius: 16, padding: 28 }}>
              <span className="ed-label">Get the checklist</span>
              <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 18 }}>
                <label style={{ display: "grid", gap: 7, fontSize: 12, color: "var(--adga-text-2)" }}>
                  Name
                  <input name="name" required autoComplete="name" style={{ height: 44, border: "1px solid var(--rule)", borderRadius: 10, padding: "0 12px", background: "var(--surface)" }} />
                </label>
                <label style={{ display: "grid", gap: 7, fontSize: 12, color: "var(--adga-text-2)" }}>
                  Work email
                  <input name="email" type="email" required autoComplete="email" style={{ height: 44, border: "1px solid var(--rule)", borderRadius: 10, padding: "0 12px", background: "var(--surface)" }} />
                </label>
                <label style={{ display: "grid", gap: 7, fontSize: 12, color: "var(--adga-text-2)" }}>
                  Company
                  <input name="company" autoComplete="organization" style={{ height: 44, border: "1px solid var(--rule)", borderRadius: 10, padding: "0 12px", background: "var(--surface)" }} />
                </label>
                <button className="btn primary" type="submit" disabled={status === "submitting"}>
                  {status === "submitting" ? "Sending..." : "Download checklist"}
                </button>
                {status === "sent" ? (
                  <p style={{ margin: 0, fontSize: 13, color: "var(--adga-text-2)" }}>
                    Request captured. <a href="/adga/deal-pipeline-audit-checklist.txt">Open the checklist</a>.
                  </p>
                ) : null}
                {status === "error" ? <p style={{ margin: 0, fontSize: 13, color: "#8a1f1a" }}>Could not submit. You can still open the checklist below.</p> : null}
              </form>
            </div>
          </div>
        </section>

        <section className="section">
          <span className="ed-label">What it covers</span>
          <h2 className="title">The checklist follows the close path.</h2>
          <div className="three" style={{ marginTop: 32, maxWidth: 1080, marginLeft: "auto", marginRight: "auto" }}>
            {CHECKLIST.map((item, index) => (
              <div className="three-card" key={item}>
                <span className="ed-label">{String(index + 1).padStart(2, "0")}</span>
                <div className="head">{item}</div>
              </div>
            ))}
          </div>
          <div className="ctas" style={{ marginTop: 28 }}>
            <a href="/adga/deal-pipeline-audit-checklist.txt" className="btn primary lg">Open checklist</a>
            <a href="/pricing" className="btn lg">Start closing deals</a>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
