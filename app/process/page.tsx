"use client";

import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";

const PROCESS_STEPS = [
  ["01", "Signal", "Ad, referral, inbound form, QR, call, email, event, partner, or import."],
  ["02", "Capture", "Create or match the contact, company, source, owner, urgency, and first next action."],
  ["03", "Qualify", "Confirm fit, timing, value, authority, blockers, and reason to keep moving."],
  ["04", "Shape", "Define the offer, terms, stakeholders, files, close date, and meeting plan."],
  ["05", "Advance", "Run follow-up, calls, documents, objections, tasks, and commitments."],
  ["06", "Close", "Track signature, purchase, payment, decision record, and final handoff."],
  ["07", "Deliver", "Move from closed deal to onboarding, milestones, support route, and ownership."],
  ["08", "Expand", "Identify renewal, repeat purchase, referral, upsell, cross-sell, or partner path."],
];

export default function ProcessPage() {
  return (
    <MarketingLayout>
      <div className="wrap">
        <section className="page-hero">
          <div>
            <div className="eyebrow">
              <span>Deal Process</span>
              <span className="dot" />
              <span>Lead to close to repeat</span>
            </div>
            <h1>
              The path every<br />
              deal moves through.
            </h1>
          </div>
          <div>
            <p className="lede">
              ADGA gives each deal a visible operating path, whether it starts as a new lead, an imported opportunity, a call, an email thread, or an existing pipeline record.
            </p>
            <div className="actions">
              <a href="/pricing" className="btn primary lg">Start closing deals</a>
              <a href="/product" className="btn lg">View platform</a>
            </div>
          </div>
        </section>

        <section className="section process-section" style={{ borderTop: 0, paddingTop: 36 }}>
          <span className="ed-label">Operating path</span>
          <div className="process-head">
            <h2 className="title">From first signal to repeat purchase.</h2>
            <p>
              The process keeps people, proof, stage, follow-up, files, decisions, and payment context attached to the same record.
            </p>
          </div>
          <div className="process-rail" aria-label="ADGA deal process">
            {PROCESS_STEPS.map(([num, label, body]) => (
              <div className="process-step" key={num}>
                <span>{num}</span>
                <b>{label}</b>
                <small>{body}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="section outcome-section">
          <span className="ed-label">Workspace outcome</span>
          <div className="process-head">
            <h2 className="title">Every record shows stage, context, and next move.</h2>
            <p>
              The suite should make it obvious where the deal stands, what relationship data is attached, and what has to happen next.
            </p>
          </div>
          <div className="outcome-grid">
            <div className="outcome-card">
              <span>Stage</span>
              <b>Where the deal is</b>
              <small>Current stage, missing items, owner, close path, and movement history stay visible.</small>
            </div>
            <div className="outcome-card">
              <span>Context</span>
              <b>What is attached</b>
              <small>Contacts, companies, calls, meetings, documents, approvals, and decisions stay connected.</small>
            </div>
            <div className="outcome-card">
              <span>Next move</span>
              <b>What happens now</b>
              <small>Follow-up, scheduling, document review, invoice movement, and close risk stay in front of the team.</small>
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
