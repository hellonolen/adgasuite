"use client";

import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";

const STAGES: ReadonlyArray<readonly [string, string, string]> = [
  ["01", "Signal", "Ad, referral, inbound form, QR, call, email, event, partner, or import."],
  ["02", "Capture", "Match contact, company, source, owner, urgency, and first next action."],
  ["03", "Qualify", "Confirm fit, timing, value, authority, blockers, and reason to keep moving."],
  ["04", "Shape", "Define offer, terms, stakeholders, files, close date, and meeting plan."],
  ["05", "Advance", "Run follow-up, calls, documents, objections, tasks, and commitments."],
  ["06", "Close", "Track signature, purchase, payment, decision record, and final handoff."],
  ["07", "Deliver", "Move from closed deal to onboarding, milestones, support route, ownership."],
  ["08", "Expand", "Identify renewal, repeat purchase, referral, upsell, cross-sell, or partner."],
];

const ANATOMY = [
  {
    label: "People",
    items: ["Primary contact", "Company or account", "Owner & stakeholders", "Decision authority", "Represented client"],
  },
  {
    label: "Process",
    items: ["Current stage", "Stage confidence", "Next action", "Due date", "Blockers & risks"],
  },
  {
    label: "Proof",
    items: ["Calls & transcripts", "Meetings & briefs", "Voice notes", "Documents & terms", "Activity timeline"],
  },
  {
    label: "Close",
    items: ["Approvals", "Signature", "Invoice & payment", "Decision record", "Handoff to delivery"],
  },
];

const SUITE_FEATURES = [
  {
    img: "/adga/visual-capture.svg",
    metaText: "LEADS · INTAKE · ROUTE",
    label: "Lead intake",
    head: "Every signal becomes a record.",
    body: "Forms, QR links, imports, manual entries — captured with source, urgency, owner, and first next action attached automatically.",
    bullets: ["Inbound form + QR submissions", "CSV imports", "Routing by source or geography", "Stale-lead detection"],
  },
  {
    img: "/adga/visual-followup.svg",
    metaText: "EMAIL · SMS · VOICE",
    label: "Contact work",
    head: "Every touch stays on file.",
    body: "Calls, messages, voice notes, meetings, documents, and follow-up sequences stay tied to the contact and the deal — for as long as you need.",
    bullets: ["Internal & client communication lanes", "Voice notes with auto-transcription", "Meeting invites with ICS attachments", "Follow-up sequence editor"],
  },
  {
    img: "/adga/visual-execution.svg",
    metaText: "FILES · TERMS · INVOICE",
    label: "Execution",
    head: "Move the deal to close.",
    body: "Track client, internal team, decisions, documents, approvals, invoices, and payment connectors in one record — without leaving the deal.",
    bullets: ["Secure deal files in R2 storage", "Due-diligence checklists", "Invoicing with Stripe payouts", "Watermark + scoped redaction"],
  },
];

const USE_CASES = [
  { label: "Acquisition", body: "Keep buyer, seller, advisors, documents, approvals, meetings, and terms attached to one deal record." },
  { label: "Capital raise", body: "Track investor contacts, diligence files, commitments, follow-up cadence, and closing timeline in one place." },
  { label: "M&A", body: "Move NDA → CIM → IOI → LOI → diligence → SPA → close → 100-day integration with every party visible." },
  { label: "Partnership", body: "Move introductions, stakeholders, commercial terms, documents, and launch steps forward." },
  { label: "Licensing", body: "Manage rights, counterparties, term sheets, review cycles, signatures, and renewal paths." },
  { label: "High-ticket sales", body: "Turn qualified interest into calls, proposals, follow-up, close, delivery, and expansion." },
];

const IMPORT_SOURCES = [
  "CSV export from another CRM",
  "Manual entry of an existing pipeline",
  "Email thread or shared inbox",
  "Calendar history of past meetings",
  "Document folder for a deal already in motion",
  "Call transcript from prior conversations",
];

const FAQ_ITEMS = [
  {
    q: "Who is ADGA for?",
    a: "Operators running real deals: solo closers, deal teams, capital raisers, M&A advisors, partnership leads, procurement, licensing, and high-ticket sales. If money moves and stakes are real, ADGA is the workspace.",
  },
  {
    q: "Can I bring existing deals over?",
    a: "Yes. Import from CSV, another CRM, an email thread, calendar history, a document folder, or a call transcript. Contacts, companies, deals, stages, files, and notes come with.",
  },
  {
    q: "How does pricing work?",
    a: "Three plans: Pro for one operator, Team for closing teams, Enterprise for firms. Monthly or annual (2 months free). Add seats anytime. See the pricing page for the full breakdown.",
  },
  {
    q: "Where does my data live?",
    a: "Cloudflare D1 for deal records and metadata. Cloudflare R2 for documents, voice notes, and generated files. Encrypted in transit and at rest. Your workspace is yours — no shared tenants in your data.",
  },
  {
    q: "Does the AI act on its own?",
    a: "No. Every customer-facing action is prepared and waits for your approval. The AI drafts follow-up, surfaces missing data, suggests next moves, and summarizes calls — you keep the wheel.",
  },
];

export default function HomePage() {
  return (
    <MarketingLayout>
      <div className="wrap">
        <section className="hero hero-center">
          <div className="hero-pill">
            <span className="hero-pill-dot" /> Built for closing teams
          </div>
          <h1 className="hero-display">Built to close deals.</h1>
          <p className="hero-lede-center">
            ADGA is the deal flow platform that keeps every contact, call, document, and next action tied to the deal — so closes happen on schedule, not by accident.
          </p>
          <div className="hero-ctas">
            <a href="/pricing" className="btn primary lg">Start closing deals</a>
          </div>

          <div className="hero-mocks" aria-hidden="true">
            <div className="hero-mock hero-mock-left">
              <div className="hero-mock-head">
                <span className="hero-mock-badge hero-mock-badge-dark">Deal</span>
                <span className="hero-mock-id">DEAL-1224</span>
              </div>
              <div className="hero-mock-title">Capital raise — Series B</div>
              <div className="hero-mock-meta">
                <span>Closing</span>
                <span className="dot">·</span>
                <span>$24M</span>
                <span className="dot">·</span>
                <span>3 stakeholders</span>
              </div>
              <div className="hero-mock-row">
                <span className="hero-mock-icon">·</span>
                <span>Term sheet · sent</span>
                <span className="hero-mock-tag">Signed</span>
              </div>
              <div className="hero-mock-row">
                <span className="hero-mock-icon">·</span>
                <span>Diligence call · Thu 3:00pm</span>
                <span className="hero-mock-tag">Confirmed</span>
              </div>
              <div className="hero-mock-row hero-mock-row-active">
                <span className="hero-mock-icon">→</span>
                <span>Counter offer · draft ready</span>
                <span className="hero-mock-tag hero-mock-tag-accent">Next</span>
              </div>
            </div>

            <div className="hero-mock hero-mock-right">
              <div className="hero-mock-head">
                <span className="hero-mock-badge">Contact</span>
                <span className="hero-mock-id">+12 More</span>
              </div>
              <div className="hero-mock-title">Aurore Chastain</div>
              <div className="hero-mock-meta">
                <span>Head of Corp Dev</span>
                <span className="dot">·</span>
                <span>Sutter Maritime</span>
              </div>
              <div className="hero-mock-row">
                <span className="hero-mock-label">Stage</span>
                <span>Negotiation</span>
              </div>
              <div className="hero-mock-row">
                <span className="hero-mock-label">Value</span>
                <span>$22M weighted</span>
              </div>
              <div className="hero-mock-row">
                <span className="hero-mock-label">Owner</span>
                <span>Maren Voss</span>
              </div>
              <div className="hero-mock-row">
                <span className="hero-mock-label">Next</span>
                <span className="hero-mock-next">Send counter · 5 min</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="anatomy">
          <span className="ed-label">Inside a deal record</span>
          <h2 className="title">Everything attached. Nothing lost.</h2>
          <p style={{ maxWidth: "60ch", marginTop: 12, color: "var(--adga-text-2)" }}>
            A deal is more than a card on a board. Every record carries the people, the process, the proof, and the close path — together.
          </p>
          <div
            className="anatomy-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 24,
              marginTop: 32,
              maxWidth: 1080,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {ANATOMY.map((column) => (
              <div
                key={column.label}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--rule)",
                  borderRadius: 14,
                  padding: 24,
                }}
              >
                <span className="ed-label">{column.label}</span>
                <ul style={{ marginTop: 16, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
                  {column.items.map((item) => (
                    <li key={item} style={{ fontSize: 14, color: "var(--adga-text)" }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="process">
          <span className="ed-label">The deal process</span>
          <h2 className="title">From first signal to repeat purchase.</h2>
          <div
            className="process-rail"
            style={{
              marginTop: 32,
              maxWidth: 1080,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {STAGES.map(([num, label, body]) => (
              <div className="process-step" key={num}>
                <span>{num}</span>
                <b>{label}</b>
                <small>{body}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="suite">
          <span className="ed-label">What's in the suite</span>
          <h2 className="title">One workspace. Every deal.</h2>
          <div
            className="three"
            style={{
              marginTop: 32,
              maxWidth: 1080,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {SUITE_FEATURES.map((feature) => (
              <div className="three-card" key={feature.label}>
                <div className="photo visual-card">
                  <img src={feature.img} alt={feature.head} />
                  <div className="ph-meta">{feature.metaText}</div>
                </div>
                <span className="ed-label">{feature.label}</span>
                <div className="head">{feature.head}</div>
                <div className="body">{feature.body}</div>
                <ul style={{ marginTop: 12, padding: 0, listStyle: "none", display: "grid", gap: 6, fontSize: 13, color: "var(--adga-text-2)" }}>
                  {feature.bullets.map((bullet) => (
                    <li key={bullet} style={{ paddingLeft: 14, position: "relative" }}>
                      <span style={{ position: "absolute", left: 0, color: "var(--accent)" }}>·</span>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="use-cases">
          <span className="ed-label">Built for</span>
          <h2 className="title">Different deals. One operating path.</h2>
          <div
            className="usecase-grid"
            style={{
              marginTop: 32,
              maxWidth: 1080,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {USE_CASES.map((useCase) => (
              <div className="usecase-card" key={useCase.label}>
                <b>{useCase.label}</b>
                <small>{useCase.body}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="import">
          <span className="ed-label">Bring existing deals in</span>
          <h2 className="title">Don't start over.</h2>
          <p style={{ maxWidth: "60ch", marginTop: 12, color: "var(--adga-text-2)" }}>
            Most platforms make you abandon what you've built. ADGA brings active pipeline, contacts, files, and notes with you — match on day one.
          </p>
          <div
            style={{
              marginTop: 28,
              maxWidth: 1080,
              marginLeft: "auto",
              marginRight: "auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {IMPORT_SOURCES.map((source, index) => (
              <div
                key={source}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--rule)",
                  borderRadius: 12,
                  padding: "18px 20px",
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                }}
              >
                <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11, color: "var(--accent)", letterSpacing: "0.12em" }}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span style={{ fontSize: 14, color: "var(--adga-text)" }}>{source}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="faq">
          <div className="faq" style={{ maxWidth: 1080, marginLeft: "auto", marginRight: "auto" }}>
            <div>
              <span className="ed-label">FAQ</span>
              <h2>Common questions.</h2>
            </div>
            <div className="faq-list">
              {FAQ_ITEMS.map((item, index) => (
                <details className="faq-item" key={item.q} open={index === 0}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="cta">
          <h2>Move every <em>deal forward.</em></h2>
          <div className="right">
            <p>
              Pick a plan, verify your email, and open the workspace built to keep leads, contacts, documents, meetings, and decisions moving toward close.
            </p>
            <div className="ctas">
              <a href="/pricing" className="btn primary lg">Start closing deals</a>
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
