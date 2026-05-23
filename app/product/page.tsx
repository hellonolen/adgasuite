import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";

type Feature = {
  label: string;
  head: string;
  body: string;
  bullets: ReadonlyArray<string>;
};

const FEATURES: ReadonlyArray<Feature> = [
  {
    label: "Lead intake",
    head: "Every signal becomes a record.",
    body: "Inbound forms, QR submissions, CSV imports, manual entries, and partner referrals all land as a complete lead — with source, urgency, owner, and the first next action attached on capture.",
    bullets: [
      "Source attribution preserved across form, QR, import, and manual entry",
      "Urgency separate from priority — Immediate, Same Day, Scheduled, Normal, Low",
      "Saved views: Most Recent, Needs Follow-Up, New Today, Stale, Unassigned, QR Leads",
      "Duplicate detection on email, phone, company, and matching submissions",
    ],
  },
  {
    label: "Pipeline & Kanban",
    head: "The same deals, three ways.",
    body: "Kanban for hands, table for eyes, timeline for the calendar. Drag a card, advance a stage, watch close-date risk and stage confidence roll up across the workspace.",
    bullets: [
      "Custom pipelines and stages per business line",
      "Weighted forecasting with stage confidence on every deal",
      "Stale-deal nudges and idle-stage detection",
      "Bulk actions for owner, status, tag, archive, and export",
    ],
  },
  {
    label: "Deal record",
    head: "Everything attached to the deal.",
    body: "The deal record carries the source signal, primary contact, company, owner, stage, stage confidence, next action, due date, commitments, risks, approvals, payment, and follow-on opportunity in one place.",
    bullets: [
      "Source, stage, confidence, owner, and next action on every record",
      "Commitments, blockers, and risks tracked against the deal timeline",
      "Represented-client field so the team knows who ADGA represents",
      "Decision record, signed terms, and close summary on the same page",
    ],
  },
  {
    label: "Contacts & accounts",
    head: "People and the companies they belong to.",
    body: "Contacts are people. Accounts are organizations. Each one carries every touch, every deal, every document, and every purchase — for as long as the relationship lasts.",
    bullets: [
      "Linked contact ↔ account structure with role and decision authority",
      "Preferred contact method, best time, time zone, and social profiles",
      "Lifetime value, product holdings, and prior deal history per account",
      "Custom fields per record, scoped by team",
    ],
  },
  {
    label: "Documents + R2",
    head: "Secure files for every deal.",
    body: "Proposals, contracts, due-diligence requests, signed terms, and exports stay tied to the deal. File bodies live in Cloudflare R2, metadata in D1 — encrypted in transit and at rest.",
    bullets: [
      "Structured due-diligence request lists per deal",
      "Watermarked viewing and scoped redaction for outside parties",
      "External-party access without seat charges",
      "Generated invoice PDFs, contracts, and exports archived per record",
    ],
  },
  {
    label: "Voice notes + transcripts",
    head: "Speak it. Find it. Act on it.",
    body: "Drop a voice note on a lead, contact, deal, or meeting. Audio lands in R2, transcripts run through Cloudflare Workers AI, and the text is searchable across the workspace within seconds.",
    bullets: [
      "Whisper-based speech-to-text via Cloudflare Workers AI",
      "Transcripts power agent summaries and follow-up tasks",
      "Voice notes attach to lead, deal, meeting, contact, or task",
      "Queued for transcription when AI capacity is unavailable",
    ],
  },
  {
    label: "Calendar + meetings",
    head: "Scheduling that writes back to the deal.",
    body: "Scheduling a meeting creates the calendar event, generates or preserves the meeting link, and sends an ICS invite that works with Gmail, Outlook, Apple Calendar, or any client.",
    bullets: [
      "ICS attachments on every invite for cross-client compatibility",
      "Invite delivery state: sent, accepted, declined, tentative, canceled",
      "Meeting records show attendees, link, source lead/deal, and agent prep",
      "Pre-meeting briefs and post-meeting summaries on the record",
    ],
  },
  {
    label: "Communication lanes",
    head: "Internal team. Client view. Same deal.",
    body: "Every deal has two communication lanes. Internal stays private — notes, voice memos, decisions, agent summaries. Client-facing is explicit — updates, meeting invites, documents, signatures.",
    bullets: [
      "Internal team lane: private notes, decisions, blockers, voice memos",
      "Client lane: status updates, documents, signatures, meeting invites",
      "Represented-client portal scoped to a single deal at a time",
      "Every SMS, email, call, and voice note carries a deal trace ID",
    ],
  },
  {
    label: "Invoicing center",
    head: "Invoice clients. Get paid. Track every dollar.",
    body: "Create, send, and track invoices against any deal. Line items, taxes, discounts, due dates, and payment links — with payouts routed through your connected Stripe, PayPal, Whop, or bank account.",
    bullets: [
      "Stripe, PayPal, Whop, QuickBooks, and bank-account connectors",
      "Invoice PDFs stored in R2, full metadata in D1",
      "Bank-account payout setup for companies and individuals",
      "Gross amount, platform fee, net to user, and payment status tracked",
    ],
  },
  {
    label: "Intelligence + battlecards",
    head: "Context surfaced before the call.",
    body: "Company profiles, battlecards, market notes, and prior-deal context pulled into the deal record before you dial. Surveys and signal capture feed the same workspace search.",
    bullets: [
      "Company profile and battlecard attached to the deal",
      "Prior deal history and account intelligence on the contact card",
      "Workspace search across notes, calls, documents, voice notes, meetings",
      "Survey and signal capture write back to the same record graph",
    ],
  },
  {
    label: "Approvals + agent actions",
    head: "AI drafts. You approve.",
    body: "Agents surface the next move, draft follow-up, summarize calls, and prepare client-facing actions. Every customer-facing action waits in an approval lane until you sign off.",
    bullets: [
      "Prepared-action queue with approve, edit, or reject",
      "Agent summary and recommended next move on every lead and deal",
      "Activity log for every status change, note, document, and agent action",
      "Conductor routing across Sales, Operations, Documents, Communication, Payments",
    ],
  },
  {
    label: "Affiliate center",
    head: "Partners, payouts, and attribution.",
    body: "Unique referral links, tracking codes, attribution from click to paid account, commission tracking, and payout records — without exposing private platform internals to your partners.",
    bullets: [
      "Referral links, tracking codes, and campaign attribution per affiliate",
      "Clicks, leads, signups, paid accounts, revenue, and commission owed",
      "Approve, pause, reject, or archive affiliates from one screen",
      "Payout history tracked even when execution happens off-platform",
    ],
  },
];

export default function ProductPage() {
  return (
    <MarketingLayout>
      <div className="wrap">
        <section className="hero hero-center" style={{ paddingBottom: 24 }}>
          <div className="hero-pill">
            <span className="hero-pill-dot" /> Platform
          </div>
          <h1 className="hero-display">The deal flow platform, end to end.</h1>
          <p className="hero-lede-center">
            Every contact, file, call, and next action attached to one deal record — across every stage from first signal to repeat purchase.
          </p>
          <div className="hero-ctas" style={{ gap: 12, display: "inline-flex", flexWrap: "wrap", justifyContent: "center" }}>
            <a href="/pricing" className="btn primary lg">See pricing</a>
            <a href="#anatomy" className="btn lg" style={{ background: "transparent", border: "1px solid var(--rule, #e8e4de)" }}>
              Inside a deal
            </a>
          </div>
        </section>

        <section id="anatomy" className="section" style={{ borderTop: 0, paddingTop: 64 }}>
          <span className="ed-label">Platform</span>
          <h2 className="title">Every move on <em>one record.</em></h2>
          <p style={{ maxWidth: "60ch", marginTop: 12, color: "var(--ink-2)" }}>
            ADGA is built around the deal record. Lead intake, pipeline, documents, calendar, communication, invoicing, and intelligence all attach to the same row — so the next move is visible before it gets missed.
          </p>

          <div
            style={{
              marginTop: 48,
              maxWidth: 1080,
              marginLeft: "auto",
              marginRight: "auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
            }}
          >
            {FEATURES.map((feature) => (
              <article
                key={feature.label}
                style={{
                  background: "var(--paper)",
                  border: "1px solid var(--rule)",
                  borderRadius: 14,
                  padding: 28,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <span className="ed-label">{feature.label}</span>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 22,
                    fontWeight: 400,
                    lineHeight: 1.2,
                    color: "var(--ink)",
                    letterSpacing: "-0.025em",
                  }}
                >
                  {feature.head}
                </div>
                <p
                  style={{
                    fontSize: 14.5,
                    color: "var(--ink-2)",
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  {feature.body}
                </p>
                <ul
                  style={{
                    marginTop: 4,
                    padding: 0,
                    listStyle: "none",
                    display: "grid",
                    gap: 8,
                    borderTop: "1px solid var(--rule)",
                    paddingTop: 16,
                  }}
                >
                  {feature.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      style={{
                        fontSize: 13,
                        color: "var(--ink-2)",
                        lineHeight: 1.5,
                        paddingLeft: 16,
                        position: "relative",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 7,
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "var(--accent)",
                        }}
                      />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="cta">
          <h2>
            One suite. <em>Every deal.</em>
          </h2>
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
