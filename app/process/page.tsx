import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";

type Stage = {
  num: string;
  label: string;
  body: string;
  bullets: ReadonlyArray<string>;
};

const STAGES: ReadonlyArray<Stage> = [
  {
    num: "01",
    label: "Lead",
    body: "A new lead lands in the workspace from an ad, referral, form, QR link, inbound call, email, event, partner, or import. Source, intent, contact, company, and context are captured on arrival.",
    bullets: [
      "Capture source: form, QR campaign, import, manual, or referral",
      "Match or create contact and company on first touch",
      "Stamp received date, time, time zone, and inbound channel",
      "Preserve QR path and campaign code on the lead record",
      "Route to the right owner without losing intent",
    ],
  },
  {
    num: "02",
    label: "Qualify",
    body: "The lead is checked for fit, budget, authority, need, timing, and strategic value. The owner runs the qualifying call, scores the lead, and decides whether to invest sales time.",
    bullets: [
      "Score fit, budget, authority, need, and timing",
      "Run the qualifying call against a guided brief",
      "Capture qualification notes against the lead record",
      "Record disqualification reason and archive if rejected",
      "Promote qualified leads to a real deal record",
    ],
  },
  {
    num: "03",
    label: "Discover",
    body: "The discovery call surfaces the real problem, the wall behind it, and what success looks like. The deal record fills with the situation, what has been tried, and the future state the buyer wants.",
    bullets: [
      "Run the discovery call against a guided brief",
      "Capture situation, history, and prior attempts",
      "Identify the blocker and the desired future state",
      "Attach stakeholders and decision authority to the deal",
      "Update stage confidence with first-hand evidence",
    ],
  },
  {
    num: "04",
    label: "Scope",
    body: "The tech call agrees terms, price, timeline, and stakeholders in principle. The deal becomes a defined path with an expected value, a close date, and a list of what still has to land.",
    bullets: [
      "Define offer, terms, and expected deal value",
      "Confirm timeline, stakeholders, and decision path",
      "Set close date and stage confidence",
      "List required files and due-diligence checklist",
      "Lay out the meeting plan and follow-up cadence",
    ],
  },
  {
    num: "05",
    label: "Design",
    body: "The high-level design, proposal, or plan is delivered. Documents, scope, and commitments converge into one shared artifact the buyer can react to.",
    bullets: [
      "Draft proposal, plan, or scope document",
      "Attach supporting design, references, and comparables",
      "Confirm scope with represented client and stakeholders",
      "Track open questions and outstanding decisions",
      "Move the deal toward verbal commitment",
    ],
  },
  {
    num: "06",
    label: "Close",
    body: "The closing call lands the verbal yes. Terms are accepted, the investment is agreed, and the deal commits — even before paperwork moves.",
    bullets: [
      "Run the closing call against a guided brief",
      "Capture verbal commitment and accepted terms",
      "Record the decision and close summary on the deal",
      "Surface any remaining blockers for a clean handoff",
      "Queue the signature and invoice path automatically",
    ],
  },
  {
    num: "07",
    label: "Sign",
    body: "Contract is signed. Invoice fires. Payment routes through the connected provider. Delivery work queues with full context attached.",
    bullets: [
      "Generate the final contract and signed terms",
      "Issue invoice and route payment through the connected provider",
      "Post payment status back to the deal timeline",
      "Land the prepared action in the approval lane before send",
      "Hand off to delivery with owner and relationship context",
    ],
  },
  {
    num: "08",
    label: "Deliver",
    body: "The customer receives what was sold. Onboarding tasks, delivery milestones, support route, and the relationship owner travel with the same deal record.",
    bullets: [
      "Open onboarding tasks and assign owners",
      "Track delivery milestones and success markers",
      "Attach delivery notes, contracts, and access provisioning",
      "Define the support route and primary point of contact",
      "Keep the represented-client portal scoped to the deal",
    ],
  },
  {
    num: "09",
    label: "Expand",
    body: "The customer is evaluated for renewal, repeat purchase, referral, upsell, cross-sell, or partner transition. Outcome and next offer attach to the same record without losing context.",
    bullets: [
      "Review outcome and capture satisfaction signal",
      "Identify renewal, upsell, cross-sell, and referral paths",
      "Trigger expansion offers from prior deal history",
      "Open the next deal record without losing relationship context",
      "Feed expansion data back into account and pipeline forecast",
    ],
  },
];

export default function ProcessPage() {
  return (
    <MarketingLayout>
      <div className="wrap">
        <section className="hero hero-center" style={{ paddingBottom: 24 }}>
          <div className="hero-pill">
            <span className="hero-pill-dot" /> Process
          </div>
          <h1 className="hero-display">The 9-stage system today&rsquo;s top dealmakers use to hit their number every quarter.</h1>
          <p className="hero-lede-center">
            For closers, dealmakers, and operators who refuse to drop another. Lead, qualify, discover, scope, design, close, sign, deliver, expand — one record, one path, every deal.
          </p>
          <div className="hero-ctas" style={{ gap: 12, display: "inline-flex", flexWrap: "wrap", justifyContent: "center" }}>
            <a href="/pricing" className="btn primary lg">Start closing deals</a>
            <a href="#stages" className="btn lg" style={{ background: "transparent", border: "1px solid var(--rule, #e8e4de)" }}>
              See the stages
            </a>
          </div>
        </section>

        <section id="stages" className="section" style={{ borderTop: 0, paddingTop: 64 }}>
          <span className="ed-label">Deal process</span>
          <h2 className="title">From first lead to <em>repeat purchase.</em></h2>
          <p style={{ maxWidth: "60ch", marginTop: 12, color: "var(--ink-2)" }}>
            ADGA gives every deal a visible operating path. Nine stages keep people, proof, documents, stage confidence, and the next move attached to the same record — whether the deal starts fresh or arrives from an existing pipeline.
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
            {STAGES.map((stage) => (
              <article
                key={stage.num}
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
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.18em",
                    color: "var(--accent)",
                    fontWeight: 600,
                  }}
                >
                  {stage.num}
                </span>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 24,
                    fontWeight: 400,
                    lineHeight: 1.1,
                    color: "var(--ink)",
                    letterSpacing: "-0.03em",
                  }}
                >
                  {stage.label}
                </div>
                <p
                  style={{
                    fontSize: 14.5,
                    color: "var(--ink-2)",
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  {stage.body}
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
                  Required work
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
                  {stage.bullets.map((bullet) => (
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

        <section className="section" style={{ paddingTop: 80 }}>
          <div
            style={{
              maxWidth: 880,
              marginLeft: "auto",
              marginRight: "auto",
              textAlign: "center",
            }}
          >
            <span className="ed-label">Inside every call</span>
            <h2 className="title" style={{ marginTop: 12 }}>
              A guided call flow runs <em>inside the stages.</em>
            </h2>
            <p style={{ marginTop: 16, color: "var(--ink-2)", fontSize: 16, lineHeight: 1.6 }}>
              Qualify, Discover, Scope, and Close each open with a structured call brief and close with a structured call summary. The framework is built into the workspace — your team runs it without thinking about it.
            </p>
            <p style={{ marginTop: 12, color: "var(--ink-3)", fontSize: 13 }}>
              The call methodology stays inside the product.
            </p>
          </div>
        </section>

        <section className="cta">
          <h2>
            Move every <em>deal forward.</em>
          </h2>
          <div className="right">
            <p>
              Pick a plan, open the workspace, and run the nine-stage process on real deals — from the first lead through repeat purchase.
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
