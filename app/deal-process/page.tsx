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

export default function DealProcessPage() {
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

        <section className="section">
          <span className="ed-label">What changes</span>
          <div className="three">
            <div className="three-card">
              <div className="num">01</div>
              <div className="head">The deal has a visible stage.</div>
              <div className="body">The workspace shows where the deal is, what is missing, who owns the next move, and what has to happen before close.</div>
            </div>
            <div className="three-card">
              <div className="num">02</div>
              <div className="head">The relationship stays attached.</div>
              <div className="body">Contacts, companies, calls, meetings, documents, approvals, and decisions stay connected to the record.</div>
            </div>
            <div className="three-card">
              <div className="num">03</div>
              <div className="head">The next action is clear.</div>
              <div className="body">Follow-up, scheduling, document review, invoice movement, and close risk are surfaced in the flow of work.</div>
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
