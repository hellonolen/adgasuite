import type { Metadata } from "next";
import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";
import { MarketingHero } from "@/components/adga/layout/MarketingHero";
import { PAGE_SEO } from "@/lib/marketing-config";

export const metadata: Metadata = {
  title: PAGE_SEO.plan.title,
  description: PAGE_SEO.plan.description,
  openGraph: { title: PAGE_SEO.plan.title, description: PAGE_SEO.plan.description },
  twitter: { title: PAGE_SEO.plan.title, description: PAGE_SEO.plan.description },
};

type Feature = {
  label: string;
  head: string;
  body: string;
  bullets: ReadonlyArray<string>;
};

const FEATURES: ReadonlyArray<Feature> = [
  {
    label: "Lead intake",
    head: "Every lead becomes a record.",
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
    body: "The deal record carries the source, primary contact, company, owner, stage, stage confidence, next action, due date, commitments, risks, approvals, payment, and follow-on opportunity in one place.",
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
    body: "Contacts are people. Accounts are organizations. Touches, deals, documents, and purchases stay linked to the contact and the account — for as long as the relationship lasts.",
    bullets: [
      "Linked contact ↔ account structure with role and decision authority",
      "Preferred contact method, best time, time zone, and social profiles",
      "Lifetime value, product holdings, and prior deal history per account",
      "Custom fields per record, scoped by team",
    ],
  },
  {
    label: "Documents",
    head: "Secure files for every deal.",
    body: "Proposals, contracts, due-diligence requests, signed terms, and exports stay tied to the deal, encrypted in transit and at rest.",
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
    body: "Drop a voice note on a lead, contact, deal, or meeting. Audio saves to the workspace, transcripts process automatically, and the text is searchable within seconds.",
    bullets: [
      "Speech-to-text transcripts attached to the voice note",
      "Transcripts power summaries and follow-up tasks",
      "Voice notes attach to lead, deal, meeting, contact, or task",
      "Queued for transcription when processing capacity is unavailable",
    ],
  },
  {
    label: "Calendar + meetings",
    head: "Scheduling that writes back to the deal.",
    body: "Scheduling a meeting creates the calendar event, generates or preserves the meeting link, and sends an ICS invite that works with Gmail, Outlook, Apple Calendar, or any client.",
    bullets: [
      "ICS attachments on every invite for cross-client compatibility",
      "Invite delivery state: sent, accepted, declined, tentative, canceled",
      "Meeting records show attendees, link, source lead or deal, and the pre-meeting brief",
      "Pre-meeting briefs and post-meeting summaries on the record",
    ],
  },
  {
    label: "Communication lanes",
    head: "Internal team. Client view. Same deal.",
    body: "Two communication lanes per deal. Internal stays private — notes, voice memos, decisions, summary records. Client-facing is explicit — updates, meeting invites, documents, signatures.",
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
    body: "Create, send, and track invoices against any deal. Line items, taxes, discounts, due dates, and payment links — with payouts routed through your payment processor, accounting system, PayPal, or a connected bank account.",
    bullets: [
      "Payment processor, PayPal, QuickBooks, and bank-account connectors",
      "Invoice PDFs and billing records tied to the workspace",
      "Bank-account payout setup for companies and individuals",
      "Gross amount, platform fee, net to user, and payment status tracked",
    ],
  },
  {
    label: "Intelligence + battlecards",
    head: "Context surfaced before the call.",
    body: "Company profiles, battlecards, market notes, and prior-deal context pulled into the deal record before you dial. Surveys and survey responses feed the same workspace search.",
    bullets: [
      "Company profile and battlecard attached to the deal",
      "Prior deal history and account intelligence on the contact card",
      "Workspace search across notes, calls, documents, voice notes, meetings",
      "Survey responses write back to the same record graph",
    ],
  },
  {
    label: "Approval lane",
    head: "Drafts prepared. You approve.",
    body: "Every customer-facing action — follow-up emails, SMS, invoices, signature requests — lands in an approval lane with the draft, the reasoning, and the risk class. Approve, edit, or reject. Always reversible inside the grace window.",
    bullets: [
      "Prepared-action queue with approve, edit, or reject",
      "Suggested next move and draft surfaced on every lead and deal",
      "Activity log for every status change, note, document, and approval",
      "Drafts routed by domain — sales, operations, documents, communication, payments",
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

export default function PlanPage() {
  return (
    <MarketingLayout>
      <div className="wrap">
        <MarketingHero
          headline="Keep momentum in your deal."
          deck="Designed for closers, dealmakers, and operators who refuse to lose deals to slipped follow-ups. Every contact, file, call, commitment, and next move locked to the deal — surfaced when it’s time to act."
          primaryCta={{ label: "Start closing deals", href: "/pricing" }}
          paddingBottom={24}
        />

        <section id="anatomy" className="section" style={{ borderTop: 0, paddingTop: 64 }}>
          <span className="ed-label">Plan</span>
          <h2 className="title">Every move on <em>one record.</em></h2>
          <p style={{ maxWidth: "60ch", marginTop: 12, color: "var(--ink-2)" }}>
            Every lead, pipeline stage, document, meeting, call, and invoice attaches to the same deal — so closers see the next move before it gets missed.
          </p>

          <div
            className="balanced-card-grid"
            style={{
              marginTop: 48,
              maxWidth: 1080,
              marginLeft: "auto",
              marginRight: "auto",
              display: "grid",
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
