"use client";

import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";

const PLANS = [
  {
    id: "pro",
    name: "Pro",
    price: "$99",
    cadence: "per month",
    desc: "For one owner managing leads, contacts, follow-up, documents, and invoices.",
    cta: "Get started",
    href: "/request-access?plan=pro",
    features: [
      "Lead capture and contact records",
      "Pipeline, calendar, documents, and tasks",
      "Voice notes and transcripts",
      "Standard ADGA agent actions",
      "Individual workspace",
    ],
  },
  {
    id: "team",
    name: "Team",
    price: "$249",
    cadence: "per seat / month",
    desc: "For shared teams working across pipeline, client records, calendar, documents, and deal communications.",
    cta: "Get started",
    href: "/request-access?plan=team",
    featured: true,
    features: [
      "Everything in Pro",
      "Shared workspace and team roles",
      "Internal and client lanes",
      "Team calendar and invoices",
      "Central billing",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    cadence: "annual contract",
    desc: "For larger firms that need advanced controls, connected teams, and account-level oversight.",
    cta: "Arrange a meeting",
    href: "/request-access?plan=enterprise",
    features: [
      "Everything in Team",
      "Advanced security controls",
      "Custom agent configuration",
      "Firm-level reporting",
      "Custom onboarding",
    ],
  },
];

export default function PricingPage() {
  return (
    <MarketingLayout>
      <div className="wrap">
        <section className="page-hero">
          <div>
            <div className="eyebrow">
              <span>Pricing</span>
              <span className="dot" />
              <span>Individuals, teams, firms</span>
            </div>
            <h1>
              Pick the level<br />
              of ADGA you need.
            </h1>
          </div>
          <div>
            <p className="lede">
              Start small, move up when the work demands more capacity, and bring the team in when the deal flow becomes shared.
            </p>
          </div>
        </section>

        <section className="section" style={{ paddingTop: 64, borderTop: 0 }}>
          <div className="pricing">
            {PLANS.map((plan) => (
              <div className={"tier " + (plan.featured ? "featured" : "")} key={plan.id}>
                {plan.featured && <span className="badge">Most capacity for one owner</span>}
                <div>
                  <div className="name">{plan.name}</div>
                  <div className="desc">{plan.desc}</div>
                </div>
                <div className="price">{plan.price}<small>{plan.cadence}</small></div>
                <ul>
                  {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
                </ul>
                <a href={plan.href} className={plan.featured ? "btn primary" : "btn"}>{plan.cta}</a>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="faq">
            <div>
              <span className="ed-label">Plan questions</span>
              <h2>Keep pricing simple.</h2>
            </div>
            <div className="faq-list">
              <details className="faq-item" open>
                <summary>How is this structured?</summary>
                <p>Pro is for one active owner. Team is for shared workspaces with multiple operators. Enterprise is for firms that need custom capacity and account-level controls.</p>
              </details>
              <details className="faq-item">
                <summary>Can users move between plans?</summary>
                <p>Yes. A solo Pro workspace can move up to Team without rebuilding records, and Team can move to Enterprise when the firm needs custom controls.</p>
              </details>
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
