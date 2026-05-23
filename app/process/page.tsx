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
    label: "Signal",
    body: "A new source appears: ad response, referral, inbound form, QR link, call, email, event, partner, import, or existing pipeline record. ADGA captures source, intent, contact, company, and context on arrival.",
    bullets: [
      "Capture source attribution: form, QR campaign, import, manual, or referral",
      "Match or create contact and company on first touch",
      "Stamp received date, time, time zone, and inbound channel",
      "Preserve QR path and campaign code on the lead record",
      "Hand off to Capture without losing intent or owner routing",
    ],
  },
  {
    num: "02",
    label: "Capture",
    body: "The signal becomes a lead or imported opportunity. The record is deduped, enriched, owned, ranked for urgency, and given a first next action — before the work begins.",
    bullets: [
      "Dedupe against existing leads, contacts, and accounts",
      "Assign owner by source, geography, or routing rule",
      "Set urgency: Immediate, Same Day, Scheduled, Normal, Low",
      "Trigger five-minute follow-up window on Immediate urgency",
      "Define first next action with due date and owner",
    ],
  },
  {
    num: "03",
    label: "Qualify",
    body: "The lead is checked for fit, budget, authority, need, timing, and strategic value. The owner runs the call, captures qualification notes, and records the reason if the lead is rejected.",
    bullets: [
      "Confirm fit, budget, authority, need, and timing",
      "Capture qualification notes against the lead record",
      "Record disqualification reason and archive if rejected",
      "Promote qualified leads to a real deal record",
      "Carry contact, company, source, and notes into the deal",
    ],
  },
  {
    num: "04",
    label: "Shape",
    body: "The qualified opportunity becomes a defined deal path. Offer, terms, stakeholders, expected value, close date, blockers, required files, and meeting plan all attach to the record.",
    bullets: [
      "Define offer, terms, and expected deal value",
      "Identify stakeholders, decision authority, and represented client",
      "Set close date and stage confidence",
      "List required files and due-diligence checklist",
      "Lay out the meeting plan and follow-up cadence",
    ],
  },
  {
    num: "05",
    label: "Advance",
    body: "The team moves the deal forward through follow-up, calls, meetings, documents, objections, and commitments. Stage confidence updates, the timeline grows, blockers stay visible.",
    bullets: [
      "Run the follow-up cadence and log every touch on the timeline",
      "Capture meeting briefs, call notes, voice memos, and transcripts",
      "Track tasks, commitments, and blockers against the deal",
      "Update stage confidence as evidence comes in",
      "Surface idle-deal nudges and stale-deal detection",
    ],
  },
  {
    num: "06",
    label: "Close",
    body: "The deal reaches purchase, signature, payment, or accepted commitment. Final documents, invoice and payment status, decision record, signed terms, and the close summary land together.",
    bullets: [
      "Track signature, purchase, and payment status",
      "Generate final documents and signed terms",
      "Issue invoice and route payment through connected provider",
      "Record the decision and close summary on the deal",
      "Hand off to delivery with owner and relationship context",
    ],
  },
  {
    num: "07",
    label: "Deliver",
    body: "The customer receives the promised product, service, access, or onboarding step. Milestones, delivery notes, support route, and the relationship owner move with the record.",
    bullets: [
      "Open onboarding tasks and assign owners",
      "Track delivery milestones and success markers",
      "Attach delivery notes, contracts, and access provisioning",
      "Define the support route and primary point of contact",
      "Keep the represented-client portal scoped to the deal",
    ],
  },
  {
    num: "08",
    label: "Expand",
    body: "The customer is evaluated for repeat purchase, renewal, referral, upsell, cross-sell, or partner opportunity. Outcome review, satisfaction signal, and the next offer path attach to the same record.",
    bullets: [
      "Review outcome and capture satisfaction signal",
      "Identify renewal, upsell, cross-sell, and referral paths",
      "Trigger expansion offers from prior deal history",
      "Open the next deal record without losing relationship context",
      "Feed expansion data back into the account and pipeline forecast",
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
          <h1 className="hero-display">The eight-stage deal spine.</h1>
          <p className="hero-lede-center">
            Signal, capture, qualify, shape, advance, close, deliver, expand. Built into every record. No setup.
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
          <h2 className="title">From first signal to <em>repeat purchase.</em></h2>
          <p style={{ maxWidth: "60ch", marginTop: 12, color: "var(--ink-2)" }}>
            ADGA gives every deal a visible operating path. Eight stages keep people, proof, documents, stage confidence, and the next move attached to the same record — whether the deal starts as a fresh lead or comes in from an existing pipeline.
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

        <section className="cta">
          <h2>
            Move every <em>deal forward.</em>
          </h2>
          <div className="right">
            <p>
              Pick a plan, open the workspace, and run the eight-stage process on real deals — from the first signal through repeat purchase.
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
