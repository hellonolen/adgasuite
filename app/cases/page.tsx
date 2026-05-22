"use client";

import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";

const USE_CASES = [
  ["Capital raise", "Track investor contacts, diligence files, commitments, follow-up, and closing timeline."],
  ["Acquisition", "Keep buyer, seller, advisors, documents, approvals, meetings, and terms in one record."],
  ["Partnership", "Move introductions, stakeholders, commercial terms, documents, and launch steps forward."],
  ["Licensing", "Manage rights, counterparties, term sheets, review cycles, signatures, and renewal paths."],
  ["Procurement", "Track vendors, quotes, decision criteria, approvals, contracts, payments, and delivery."],
  ["High-ticket sales", "Turn qualified interest into calls, proposals, follow-up, close, delivery, and expansion."],
];

export default function CasesPage() {
  return (
    <MarketingLayout>
      <div className="wrap">
        <section className="page-hero">
          <div>
            <div className="eyebrow">
              <span>Use Cases</span>
              <span className="dot" />
              <span>Different deals, one path</span>
            </div>
            <h1>
              Deal work across<br />
              serious categories.
            </h1>
          </div>
          <div>
            <p className="lede">
              ADGA is built around the anatomy of a deal, so the same operating system can support high-value commercial work without forcing every team into the same sales script.
            </p>
            <div className="actions">
              <a href="/pricing" className="btn primary lg">Start closing deals</a>
              <a href="/process" className="btn lg">View process</a>
            </div>
          </div>
        </section>

        <section className="section usecase-section" style={{ borderTop: 0, paddingTop: 36 }}>
          <span className="ed-label">Where ADGA fits</span>
          <div className="process-head">
            <h2 className="title">Each category keeps the same spine.</h2>
            <p>
              Capture the record, qualify the opportunity, shape the work, advance the close, deliver, and find the next purchase path.
            </p>
          </div>
          <div className="usecase-grid">
            {USE_CASES.map(([label, body]) => (
              <div className="usecase-card" key={label}>
                <b>{label}</b>
                <small>{body}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="section outcome-section">
          <span className="ed-label">Shared structure</span>
          <div className="process-head">
            <h2 className="title">Different categories still need the same operating record.</h2>
            <p>
              Each deal type needs the people, proof, movement, and close path visible in the same system.
            </p>
          </div>
          <div className="outcome-grid">
            <div className="outcome-card">
              <span>People</span>
              <b>Contacts and accounts</b>
              <small>Every category needs stakeholders, owners, company context, and relationship history.</small>
            </div>
            <div className="outcome-card">
              <span>Proof</span>
              <b>Documents and terms</b>
              <small>Every category needs notes, files, calls, commitments, pricing, agreements, and decisions.</small>
            </div>
            <div className="outcome-card">
              <span>Movement</span>
              <b>Actions and close</b>
              <small>Every category needs stage movement, risk visibility, scheduling, payment, and a repeat path.</small>
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
