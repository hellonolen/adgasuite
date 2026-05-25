"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";
import { MarketingHero } from "@/components/adga/layout/MarketingHero";

const STAGES: ReadonlyArray<readonly [string, string, string]> = [
  ["01", "Lead", "Ad, referral, inbound form, QR, call, email, event, partner, or import — captured with source, owner, and intent."],
  ["02", "Qualify", "Confirm fit, budget, authority, need, timing, and the reason to invest sales time."],
  ["03", "Discover", "Surface the situation, what's been tried, the wall, the future state, and every stakeholder."],
  ["04", "Scope", "Agree offer, price, timeline, decision path, required files, and the due-diligence checklist."],
  ["05", "Design", "Draft the proposal, plan, or design. Confirm scope with the represented client."],
  ["06", "Close", "Land the verbal yes. Accepted terms. Close summary captured on the record."],
  ["07", "Sign", "Contract signed. Invoice fires. Payment routes through the connected provider."],
  ["08", "Deliver", "Onboarding, milestones, support route, and the relationship owner attached."],
  ["09", "Expand", "Renewal, upsell, cross-sell, referral, partner transition, acquire."],
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
    head: "Every lead becomes a record.",
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
    bullets: ["Secure deal files", "Due-diligence checklists", "Invoicing with payment payouts", "Watermark + scoped redaction"],
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

const NEGATIVE_STAKES = [
  "Hot leads go cold while the next action sits in somebody's head.",
  "Call notes, files, emails, and decisions scatter across tools before anyone can close.",
  "Teams lose confidence in the pipeline because stale deals look the same as live ones.",
  "Invoices and payment steps get handled after the close instead of inside the close path.",
  "A buyer, investor, or partner feels the delay and moves on to the team that follows through.",
];

const VALUE_STACK = [
  {
    icon: "01",
    title: "Capture every opportunity",
    body: "Turn inbound, referrals, imports, calls, emails, QR leads, and manual entries into structured deal records with owner, source, urgency, and next action attached.",
  },
  {
    icon: "02",
    title: "Keep every deal moving",
    body: "Surface missing context, proof, upcoming meetings, voice notes, documents, and next moves before momentum slips.",
  },
  {
    icon: "03",
    title: "Close with the money attached",
    body: "Keep terms, signatures, invoices, checkout, payment status, and handoff history connected to the same workspace.",
  },
];

const GUIDE_PROOF = [
  "Built around real deal records, not generic tasks",
  "Encrypted workspace records, files, notes, and generated documents",
  "Checkout, payment events, and invoicing paths wired into the close flow",
  "Voice notes, transcripts, DealFlows, contacts, calendars, and pipeline activity in one suite",
];

const SIMPLE_PLAN = [
  {
    label: "Pick the plan",
    body: "Choose Pro, Team, or Enterprise based on how many people work the deal with you.",
  },
  {
    label: "Bring in the pipeline",
    body: "Start fresh or import contacts, active deals, email context, files, calendars, and notes.",
  },
  {
    label: "Work the next move",
    body: "Use the workspace to see what needs attention, move stages, send invoices, and close.",
  },
];

const LEAD_MAGNET_BENEFITS = [
  "Confirm the contact, company, role, purpose, and decision position",
  "Spot missing owners, next moves, proof, invoices, and close blockers",
  "Turn an unclear deal into one assigned next action",
];

const FAQ_ITEMS = [
  {
    q: "Who is ADGA for?",
    a: "Closers, dealmakers, and operators running real deals — capital raisers, M&A advisors, partnership leads, procurement, licensing, high-ticket sales. If money moves and stakes are real, ADGA is the workspace.",
  },
  {
    q: "Can I bring existing deals over?",
    a: "Yes. Import from CSV, another CRM, an email thread, calendar history, a document folder, or a call transcript. Contacts, companies, deals, stages, files, and notes come with.",
  },
  {
    q: "How does pricing work?",
    a: "Three plans: Pro for the closer running their own book, Team for closers working deals together, Enterprise for organizations with 15+ closers. Monthly or annual (1 month free). Add seats anytime. See the pricing page for the full breakdown.",
  },
  {
    q: "Where does my data live?",
    a: "Deal records, documents, voice notes, and generated files are encrypted in transit and at rest. Your workspace is yours, with no shared customer data.",
  },
  {
    q: "Does the workspace act on its own?",
    a: "No. Every customer-facing action is prepared and waits for your approval. Drafts of follow-ups, missing-data prompts, suggested next moves, and call summaries all surface in the workspace — you keep the wheel.",
  },
];

function LeadMagnetForm({ source }: { source: string }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("submitting");

    const response = await fetch("/api/lead-magnets/five-secrets/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(form.get("email") || ""),
        source,
      }),
    }).catch(() => null);

    setStatus(response?.ok ? "sent" : "error");
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 7, fontSize: 12, color: "var(--adga-text-2)" }}>
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            style={{ width: "100%", minWidth: 0, height: 44, border: "1px solid var(--rule)", borderRadius: 10, padding: "0 12px", background: "var(--surface)" }}
          />
        </label>
      </div>
      <button className="btn primary" type="submit" disabled={status === "submitting"} style={{ justifySelf: "start" }}>
        {status === "submitting" ? "Sending..." : "Get Access"}
      </button>
      {status === "sent" ? (
        <p style={{ margin: 0, fontSize: 13, color: "var(--adga-text-2)" }}>
          Check your email for the Five Secrets access link.
        </p>
      ) : null}
      {status === "error" ? (
        <p style={{ margin: 0, fontSize: 13, color: "#8a1f1a" }}>
          The form did not submit. Please try again.
        </p>
      ) : null}
    </form>
  );
}

export default function HomePage() {
  const [leadMagnetOpen, setLeadMagnetOpen] = useState(false);

  return (
    <MarketingLayout>
      <div className="wrap">
        <MarketingHero
          headline="Close more deals."
          deck="Leverage this agentic deal system so you can open, position, and close more deals without missing a beat."
          primaryCta={{ label: "Start closing deals", href: "/pricing" }}
        >
          <figure className="hero-dealflow-shot">
            <picture>
              <source srcSet="/adga/dealflow-hero.webp" type="image/webp" />
              <img
                src="/adga/dealflow-hero.png"
                alt="ADGA DealFlow workspace with a populated deal graph, connected nodes, and the ADGA assistant panel."
                width={1440}
                height={960}
                fetchPriority="high"
                decoding="async"
              />
            </picture>
          </figure>
        </MarketingHero>

        <section className="section" id="value" style={{ borderTop: 0, paddingTop: 32 }}>
          <span className="ed-label">Deal management platform</span>
          <h2 className="title">One system for the work that gets deals closed.</h2>
          <div className="three" style={{ marginTop: 32, maxWidth: 1080, marginLeft: "auto", marginRight: "auto" }}>
            {VALUE_STACK.map((item) => (
              <div className="three-card" key={item.title}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    display: "inline-grid",
                    placeItems: "center",
                    background: "var(--accent-soft)",
                    color: "var(--accent)",
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 12,
                    letterSpacing: "0.08em",
                  }}
                >
                  {item.icon}
                </span>
                <div className="head">{item.title}</div>
                <div className="body">{item.body}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="stakes">
          <span className="ed-label">Where ADGA helps</span>
          <h2 className="title">Make the next move obvious.</h2>
          <p style={{ maxWidth: "62ch", marginTop: 12, color: "var(--adga-text-2)" }}>
            The offer can be strong and the buyer can still drift. ADGA keeps the next move, workspace, and close path visible before momentum turns into silence.
          </p>
          <div
            className="balanced-card-grid balanced-card-grid-5"
            style={{
              display: "grid",
              gap: 14,
              marginTop: 28,
              maxWidth: 1080,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {NEGATIVE_STAKES.map((stake) => (
              <div key={stake} style={{ border: "1px solid var(--rule)", borderRadius: 12, padding: "18px 20px", background: "var(--surface)" }}>
                <span style={{ color: "var(--accent)", fontSize: 18, lineHeight: 1 }}>-</span>
                <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.55, color: "var(--adga-text)" }}>{stake}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="guide">
          <div
            className="home-guide-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 0.9fr) minmax(280px, 1.1fr)",
              gap: 32,
              alignItems: "start",
              maxWidth: 1080,
              margin: "0 auto",
            }}
          >
            <div>
              <span className="ed-label">Built for closers</span>
              <h2 className="title">You should not have to remember the whole deal alone.</h2>
              <p style={{ marginTop: 14, color: "var(--adga-text-2)", lineHeight: 1.6 }}>
                ADGA is built for the operator carrying the number, the advisor coordinating the room, and the team that needs every person, file, note, invoice, and decision visible before the next call.
              </p>
            </div>
            <div className="home-guide-proof" style={{ background: "var(--surface)", border: "1px solid var(--rule)", borderRadius: 14, padding: 28 }}>
              <span className="ed-label">Proof points</span>
              <ul style={{ margin: "18px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 14 }}>
                {GUIDE_PROOF.map((item) => (
                  <li key={item} style={{ display: "grid", gridTemplateColumns: "22px 1fr", gap: 10, fontSize: 14, color: "var(--adga-text)", lineHeight: 1.45 }}>
                    <span style={{ color: "var(--accent)" }}>✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="section" id="simple-plan">
          <span className="ed-label">Simple plan</span>
          <h2 className="title">Open the workspace. Bring in the deal. Move the next action.</h2>
          <div
            className="process-rail balanced-process-rail"
            style={{
              marginTop: 32,
              maxWidth: 1080,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {SIMPLE_PLAN.map((step, index) => (
              <div className="process-step" key={step.label}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <b>{step.label}</b>
                <small>{step.body}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="anatomy">
          <span className="ed-label">Inside a deal record</span>
          <h2 className="title">Everything attached. Nothing lost.</h2>
          <p style={{ maxWidth: "60ch", marginTop: 12, color: "var(--adga-text-2)" }}>
            A deal is more than a card on a board. People, process, proof, and close path — together in one place.
          </p>
          <div
            className="anatomy-grid balanced-card-grid balanced-card-grid-4"
            style={{
              display: "grid",
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
          <h2 className="title">From first lead to repeat purchase.</h2>
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
          <span className="ed-label">Use cases</span>
          <h2 className="title">Different deals. One path to close.</h2>
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
            className="balanced-card-grid"
            style={{
              marginTop: 28,
              maxWidth: 1080,
              marginLeft: "auto",
              marginRight: "auto",
              display: "grid",
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

        <section className="section" id="deal-flow-software">
          <span className="ed-label">Why ADGA</span>
          <h2 className="title">Deal flow software for people who have to follow through.</h2>
          <p style={{ maxWidth: "84ch", marginTop: 18, color: "var(--adga-text-2)", fontSize: 17, lineHeight: 1.75 }}>
            Closers, dealmakers, advisors, and operators want the same thing: more qualified opportunities moving cleanly toward close. The problem is that real deals do not live in one clean place. A lead starts in an inbox, the first call creates notes, the diligence folder sits somewhere else, the decision maker changes, the invoice gets handled after the fact, and the next follow-up depends on somebody remembering what happened. ADGA brings the external work, the internal confidence, and the financial close path into one deal management platform. Start by choosing a plan, bring in your existing pipeline or capture new leads, then work every next move from the same workspace. The result is a cleaner pipeline, faster follow-up, clearer handoffs, and fewer deals lost to silence. The alternative is the same scattered process: missed commitments, stale opportunities, delayed payments, and a team that cannot trust what the pipeline says.
          </p>
          <div className="ctas" style={{ marginTop: 24 }}>
            <Link href="/pricing" className="btn primary lg" prefetch>Start closing deals</Link>
            <Link href="/5-secrets" className="btn lg" prefetch>Get the 5 Secrets</Link>
          </div>
        </section>

        <section className="section" id="lead-magnet">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 0.9fr)",
              gap: 32,
              alignItems: "center",
              maxWidth: 1080,
              margin: "0 auto",
              background: "var(--surface)",
              border: "1px solid var(--rule)",
              borderRadius: 16,
              padding: 28,
            }}
          >
            <div>
              <span className="ed-label">Five secrets access</span>
              <h2 className="title">Five Secrets to Not Losing Million-Dollar Deals</h2>
              <p style={{ marginTop: 12, color: "var(--adga-text-2)", lineHeight: 1.6 }}>
                Get the private ADGA guide for protecting high-stakes conversations before timing, trust, or follow-up costs you the deal.
              </p>
              <ul style={{ margin: "18px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
                {LEAD_MAGNET_BENEFITS.map((benefit) => (
                  <li key={benefit} style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: 10, fontSize: 14, color: "var(--adga-text)" }}>
                    <span style={{ color: "var(--accent)" }}>✓</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <button type="button" className="btn" style={{ marginTop: 22 }} onClick={() => setLeadMagnetOpen(true)}>
                Open as popup
              </button>
            </div>
            <LeadMagnetForm source="homepage" />
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

        {leadMagnetOpen ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lead-magnet-title"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              display: "grid",
              placeItems: "center",
              padding: 20,
              background: "rgba(13, 12, 10, 0.42)",
            }}
            onClick={() => setLeadMagnetOpen(false)}
          >
            <div
              style={{ width: "min(560px, 100%)", background: "var(--surface)", border: "1px solid var(--rule)", borderRadius: 16, padding: 28, boxShadow: "var(--shadow-lg)" }}
              onClick={(event) => event.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start" }}>
                <div>
                  <span className="ed-label">Five secrets access</span>
                  <h2 id="lead-magnet-title" style={{ margin: "8px 0 8px", fontSize: 28, lineHeight: 1.1 }}>Five Secrets to Not Losing Million-Dollar Deals</h2>
                  <p style={{ margin: "0 0 18px", color: "var(--adga-text-2)", lineHeight: 1.55 }}>
                    Get the free guide for creating clearer deal conversations.
                  </p>
                </div>
                <button type="button" className="btn" onClick={() => setLeadMagnetOpen(false)} aria-label="Close popup">
                  Close
                </button>
              </div>
              <LeadMagnetForm source="popup" />
            </div>
          </div>
        ) : null}

        <section className="cta">
          <h2>Move every <em>deal forward.</em></h2>
          <div className="right">
            <p>
              Pick a plan, verify your email, and open the workspace built to keep leads, contacts, documents, meetings, and decisions moving toward close.
            </p>
            <div className="ctas">
              <Link href="/pricing" className="btn primary lg" prefetch>Start closing deals</Link>
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
