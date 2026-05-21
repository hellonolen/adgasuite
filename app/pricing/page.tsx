"use client";

import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";

const PLANS = [
  {
    id: "start",
    name: "Start",
    price: "$0",
    cadence: "limited workspace",
    desc: "For one operator testing ADGA with a small active pipeline.",
    cta: "Start free",
    href: "/request-access?plan=start",
    features: [
      "Lead capture and contact records",
      "One active pipeline",
      "Basic follow-up reminders",
      "Limited voice notes",
      "Individual workspace",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$20",
    cadence: "per month",
    desc: "For a solo deal owner running live leads, contacts, and follow-up.",
    cta: "Start Pro",
    href: "/request-access?plan=pro",
    features: [
      "Everything in Start",
      "Unlimited leads and contacts",
      "Pipeline, calendar, documents, and tasks",
      "Live voice notes and transcripts",
      "Standard ADGA agent actions",
    ],
  },
  {
    id: "max",
    name: "Max",
    price: "$100",
    cadence: "per month",
    desc: "For heavy individual users who need more agent capacity and deeper deal work.",
    cta: "Start Max",
    href: "/request-access?plan=max",
    featured: true,
    features: [
      "Everything in Pro",
      "5x individual agent capacity",
      "Advanced Story view for deals",
      "Priority follow-up preparation",
      "More active workspaces",
    ],
  },
  {
    id: "team",
    name: "Team",
    price: "$25",
    cadence: "per seat / month",
    desc: "For shared teams working the same pipeline and deal rooms.",
    cta: "Create team",
    href: "/request-access?plan=team",
    features: [
      "Everything teams need from Pro",
      "Shared workspace and team roles",
      "Internal and client lanes",
      "Team calendar and invoices",
      "Central billing",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$20",
    cadence: "per seat + usage",
    desc: "For firms that need advanced controls and custom workflows.",
    cta: "Talk to ADGA",
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
          <div className="pricing pricing-five">
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
                <p>Start is for trying ADGA. Pro is for one active operator. Max is for a heavy individual user. Team is for shared workspaces. Enterprise is for firms that need custom capacity and controls.</p>
              </details>
              <details className="faq-item">
                <summary>Can users move between plans?</summary>
                <p>Yes. A user can move from Start to Pro or Max as usage grows. A solo workspace can become a Team workspace without rebuilding records.</p>
              </details>
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
