import type { Metadata } from "next";
import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";
import { MarketingHero } from "@/components/adga/layout/MarketingHero";
import { PAGE_SEO } from "@/lib/marketing-config";

export const metadata: Metadata = {
  title: PAGE_SEO.cases.title,
  description: PAGE_SEO.cases.description,
  openGraph: { title: PAGE_SEO.cases.title, description: PAGE_SEO.cases.description },
  twitter: { title: PAGE_SEO.cases.title, description: PAGE_SEO.cases.description },
};

type UseCase = {
  label: string;
  who: string;
  body: string;
  bullets: ReadonlyArray<string>;
};

const USE_CASES: ReadonlyArray<UseCase> = [
  {
    label: "Real estate closing team",
    who: "For agents, brokers, transaction coordinators, attorneys, lenders, and inspectors working a single property to close.",
    body: "A real estate deal is a stack of moving parts: buyer, seller, listing agent, buyer agent, broker, attorney, lender, title, inspector, appraiser, escrow, and a calendar of contingencies. ADGA pins all of it to one deal record so the closing date doesn't move because someone missed a counter-signature or a disclosure form.",
    bullets: [
      "Buyer, seller, agents, attorney, lender, title, and inspector linked as contacts on the deal",
      "Listing source, lead source, and represented-client field tracked on the record",
      "Offer, counter, contingency dates, and inspection windows on the timeline",
      "Disclosures, addenda, inspection reports, appraisal, and closing docs attached to the deal",
      "Five-minute follow-up window on new buyer inquiries and showing requests",
      "Closing checklist, signatures, wire instructions, and decision record on one page",
    ],
  },
  {
    label: "Capital raise",
    who: "For founders, GPs, and IR leads running a round across dozens of investor conversations.",
    body: "A raise is a parallel pipeline of investor relationships, each with their own diligence pace, ticket size, and decision timeline. ADGA tracks every investor as a contact, every meeting on the timeline, every diligence document, and every commitment against the round target.",
    bullets: [
      "Investor contacts with check-size, fund stage, and check-history per record",
      "Diligence data room with watermarked viewing and external-party access",
      "Term sheet, side letters, and signed subscription docs on the deal",
      "Soft circles, verbal commits, and signed allocations tracked separately",
      "Meeting cadence, call notes, and voice memos from every investor touch",
      "Round target vs committed roll-up with weighted stage confidence",
    ],
  },
  {
    label: "Acquisition",
    who: "For founders, operators, and corp-dev teams running buy-side or sell-side M&A.",
    body: "An acquisition needs LOI, diligence, financial review, legal review, regulatory check, and close — across buyer, seller, advisors, lenders, and counsel. ADGA keeps the entire transaction on one record so the close date and the working group don't drift.",
    bullets: [
      "Buyer, seller, advisors, counsel, and lender attached as contacts",
      "LOI, NDA, diligence checklist, and definitive agreement attached to the deal",
      "Working group calls, management presentations, and site visits on the timeline",
      "Closing conditions, regulatory approvals, and decision record on the deal",
      "Wire instructions, escrow setup, and payment routing through the invoice center",
      "Post-close integration owner and milestone tracking in delivery",
    ],
  },
  {
    label: "Partnership",
    who: "For BD leads, founders, and ops teams negotiating commercial or strategic partnerships.",
    body: "Partnership work moves slowly across many stakeholders inside a counterparty. ADGA keeps the introduction trail, the working contacts, the commercial terms, the integration scope, and the launch plan in one place — so the deal doesn't die when a single champion leaves.",
    bullets: [
      "Counterparty company plus every working contact linked to the deal",
      "Introduction source, champion, and decision authority on the record",
      "Commercial term draft, integration scope, and launch plan as deal files",
      "Meeting cadence with each stakeholder tracked on the timeline",
      "Internal lane for private negotiation notes, client lane for the working draft",
      "Launch tasks, milestones, and owner handed off into delivery",
    ],
  },
  {
    label: "Licensing",
    who: "For IP owners, rights managers, and counsel running multi-territory licensing deals.",
    body: "Licensing is term sheets, royalties, term length, exclusivity, territory, and renewal — across counterparties that all want different carve-outs. ADGA keeps the rights, the counterparty, the term sheet, the review cycle, and the renewal calendar on the deal.",
    bullets: [
      "Counterparty, agent, and counsel as contacts on the deal",
      "Rights scope, exclusivity, territory, and term length on the record",
      "Term sheet revisions, redlines, and signed agreement attached to the deal",
      "Royalty schedule and reporting cadence tracked on the timeline",
      "Renewal date and option-to-extend surfaced as next-action items",
      "Decision record and signed terms carried into delivery",
    ],
  },
  {
    label: "Procurement",
    who: "For vendor managers, procurement leads, and finance owners running supplier selection.",
    body: "Procurement work needs vendor shortlists, RFPs, scored evaluations, approvals, contract negotiation, and delivery tracking. ADGA carries the requirement, the vendor responses, the evaluation matrix, the approval chain, and the executed contract on one record.",
    bullets: [
      "Requirement brief, RFP, and vendor responses on the deal",
      "Each vendor as a contact with quote, scope, and delivery terms",
      "Scored evaluation criteria and decision rationale on the record",
      "Approval chain with prepared-action queue and sign-off tracking",
      "Executed contract, payment terms, and invoice routing through the deal",
      "Delivery milestones and vendor performance tracked post-close",
    ],
  },
  {
    label: "High-ticket sales",
    who: "For consultants, agencies, coaches, and operators selling five- and six-figure engagements.",
    body: "A high-ticket sale needs qualified interest, a discovery call, a tailored proposal, a follow-up cadence, a contract, payment, and a kickoff — without losing the lead between steps. ADGA runs the conversation, the proposal, the close, and the delivery on one record.",
    bullets: [
      "Qualified lead with urgency, deal value, and decision authority",
      "Discovery call notes, voice memos, and transcripts on the contact",
      "Tailored proposal generated as a document and attached to the deal",
      "Follow-up cadence with five-minute window on hot leads",
      "Contract signed, invoice issued, payment routed through the invoice center",
      "Kickoff tasks, delivery owner, and expansion path opened post-close",
    ],
  },
  {
    label: "Boutique advisory",
    who: "For consultancies, family offices, advisory firms, and boutique service teams.",
    body: "Advisory work runs as a portfolio of long-running client engagements — each with its own scope, billing cadence, deliverables, and review cycle. ADGA carries the client, the engagement scope, the deliverables, the invoicing, and the renewal path on one record.",
    bullets: [
      "Represented-client field tracks who the firm is advising on each engagement",
      "Engagement scope, deliverables, and retainer terms on the deal",
      "Client communication lane separate from internal team lane",
      "Recurring invoice issuance and payment routing per engagement",
      "Voice notes, call transcripts, and meeting briefs against the client account",
      "Renewal date, scope expansion, and referral path opened from the same record",
    ],
  },
];

export default function CasesPage() {
  return (
    <MarketingLayout>
      <div className="wrap">
        <MarketingHero
          headline="Deals from closers."
          deck="Acquisitions, capital raises, M&A, partnerships, licensing, and high-ticket sales — closers, dealmakers, and operators running them inside ADGA."
          primaryCta={{ label: "Start closing deals", href: "/pricing" }}
          paddingBottom={24}
        />

        <section id="cases" className="section" style={{ borderTop: 0, paddingTop: 64 }}>
          <span className="ed-label">Use cases</span>
          <h2 className="title">Different deals. <em>One operating path.</em></h2>
          <p style={{ maxWidth: "60ch", marginTop: 12, color: "var(--ink-2)" }}>
            Real estate closings. Capital raises. Acquisitions. Partnerships. Licensing. Procurement. High-ticket sales. Closers run all of them inside ADGA — without forcing every team into the same script.
          </p>

          <div
            style={{
              marginTop: 48,
              maxWidth: 1080,
              marginLeft: "auto",
              marginRight: "auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 24,
            }}
          >
            {USE_CASES.map((useCase, index) => (
              <article
                key={useCase.label}
                style={{
                  background: "var(--paper)",
                  border: index === 0 ? "1.5px solid var(--accent)" : "1px solid var(--rule)",
                  borderRadius: 14,
                  padding: 28,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  boxShadow: index === 0
                    ? "0 20px 50px -25px color-mix(in srgb, var(--accent) 30%, transparent)"
                    : "0 4px 14px -6px rgba(20,20,30,0.06)",
                }}
              >
                {index === 0 && (
                  <span
                    style={{
                      alignSelf: "flex-start",
                      background: "var(--accent)",
                      color: "var(--accent-fg)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      padding: "4px 10px",
                      borderRadius: 2,
                    }}
                  >
                    Lead use case
                  </span>
                )}
                <span className="ed-label">{useCase.label}</span>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 14.5,
                    color: "var(--ink-2)",
                    lineHeight: 1.5,
                    margin: 0,
                    fontStyle: "italic",
                  }}
                >
                  {useCase.who}
                </p>
                <p
                  style={{
                    fontSize: 14.5,
                    color: "var(--ink)",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {useCase.body}
                </p>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    color: "var(--ink-3)",
                    textTransform: "uppercase",
                    marginTop: 4,
                  }}
                >
                  What ADGA handles
                </div>
                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: "none",
                    display: "grid",
                    gap: 8,
                    borderTop: "1px solid var(--rule)",
                    paddingTop: 14,
                  }}
                >
                  {useCase.bullets.map((bullet) => (
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
            Different deals. <em>One workspace.</em>
          </h2>
          <div className="right">
            <p>
              Pick a plan, open the workspace, and run real deals — real estate closings, raises, acquisitions, partnerships, licensing, procurement, and high-ticket sales — on the same operating path.
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
