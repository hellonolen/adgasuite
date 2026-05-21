// @ts-nocheck
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
    desc: "For heavy individual users who need more agent capacity and deeper deal work. Higher-capacity Max is available at $200/month.",
    cta: "Start Max",
    href: "/request-access?plan=max",
    featured: true,
    features: [
      "Everything in Pro",
      "5x individual agent capacity",
      "20x capacity option",
      "Advanced Story view for deals and contacts",
      "Priority follow-up and meeting preparation",
      "More active workspaces and deal rooms",
    ],
  },
  {
    id: "team",
    name: "Team",
    price: "$25",
    cadence: "per seat / month",
    desc: "For shared teams working the same pipeline, client records, and deal rooms.",
    cta: "Create team",
    href: "/request-access?plan=team",
    features: [
      "Everything teams need from Pro",
      "Shared workspace and team roles",
      "Internal and client communication lanes",
      "Team calendar, invoices, and files",
      "Central billing for all seats",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$20",
    cadence: "per seat + usage",
    desc: "For firms that need advanced controls, more capacity, and custom workflows.",
    cta: "Talk to ADGA",
    href: "/request-access?plan=enterprise",
    features: [
      "Everything in Team",
      "Advanced security and user controls",
      "Custom workflow and agent configuration",
      "Firm-level reporting and oversight",
      "Custom onboarding and commercial terms",
    ],
  },
];

const COMPARE = [
  ["Best for", "Trying ADGA", "Solo operator", "Heavy solo operator", "Shared teams", "Firms"],
  ["Users", "1", "1", "1", "2+ seats", "Custom"],
  ["Lead and contact management", "Limited", "Included", "Included", "Included", "Included"],
  ["Pipeline and deal rooms", "1 pipeline", "Included", "More capacity", "Shared", "Custom"],
  ["Live voice notes", "Limited", "Included", "Included", "Included", "Included"],
  ["ADGA agent actions", "Limited", "Standard", "5x or 20x capacity", "Team capacity", "Custom capacity"],
  ["Story view", "-", "Basic", "Advanced", "Advanced", "Custom"],
  ["Calendar and meeting follow-up", "-", "Included", "Priority", "Team-wide", "Custom"],
  ["Invoicing", "-", "Included", "Included", "Team-wide", "Custom"],
  ["Workspace administration", "-", "Basic", "Basic", "Team controls", "Advanced controls"],
  ["Operating path", "Self-serve", "AI-assisted", "Higher-capacity AI", "Team AI workspace", "Custom AI workspace"],
];

export default function PricingPage() {
  return (
    <main>
      <div className="wrap">
        <nav className="nav">
          <a href="/" className="brand">
            <span className="mark">A</span>
            ADGA
          </a>
          <div className="nav-links">
            <a href="/product">Product</a>
            <a href="/pricing" className="active">Pricing</a>
            <a href="/security">Security</a>
            <a href="/stories">Stories</a>
          </div>
          <div className="nav-cta">
            <span className="nav-mono">Plan ladder</span>
            <a href="/login" className="btn">Sign in</a>
            <a href="/request-access?plan=team" className="btn primary">Create team</a>
          </div>
        </nav>

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
            <div className="actions">
              <a href="/request-access?plan=pro" className="btn primary lg">Start Pro</a>
              <a href="#compare" className="btn lg">Compare plans</a>
            </div>
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

        <section className="section" id="compare" style={{ paddingTop: 48 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 24, flexWrap: "wrap", marginBottom: 8 }}>
            <h2 className="title" style={{ margin: 0 }}>Compare plans.</h2>
            <span className="ed-label">Simple plan ladder</span>
          </div>
          <div className="compare-wrap">
            <table className="compare">
              <thead>
                <tr>
                  <th>Plan detail</th>
                  <th>Start</th>
                  <th>Pro</th>
                  <th className="featured">Max</th>
                  <th>Team</th>
                  <th>Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, index) => (
                      <td key={index} className={index === 3 ? "featured" : ""}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
            <a href="/request-access?plan=pro" className="btn">Start Pro</a>
            <a href="/request-access?plan=max" className="btn primary">Start Max</a>
            <a href="/request-access?plan=team" className="btn">Create Team</a>
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
              <details className="faq-item">
                <summary>What is the difference between Max and Team?</summary>
                <p>Max gives one person more capacity. Team adds shared workspaces, team roles, central billing, shared communication lanes, and team-level coordination.</p>
              </details>
              <details className="faq-item">
                <summary>What does Enterprise add?</summary>
                <p>Enterprise adds custom usage, advanced controls, firm-level oversight, custom onboarding, and commercial terms matched to the organization.</p>
              </details>
            </div>
          </div>
        </section>

        <section className="cta" id="contact">
          <h2>
            Start with the<br />
            right level.
          </h2>
          <div className="right">
            <p>
              ADGA can begin with one operator or a full team. Choose the level that matches how much deal work you need the platform to carry.
            </p>
            <div className="ctas">
              <a href="/request-access?plan=max" className="btn primary lg">Start Max</a>
              <a href="/request-access?plan=enterprise" className="btn lg">Talk to ADGA</a>
            </div>
          </div>
        </section>

        <footer className="foot">
          <div>
            <a href="/" className="brand" style={{ fontSize: 22 }}>
              <span className="mark" style={{ width: 24, height: 24, fontSize: 13 }}>A</span>
              ADGA
            </a>
            <p style={{ marginTop: 10, fontSize: "12.5px", color: "var(--ink-2)", maxWidth: "36ch" }}>
              ADGA is the AI deal flow suite for lead capture, client work, follow-up, documents, meetings, invoices, and deal execution.
            </p>
          </div>
          <div className="foot-cols">
            <div className="foot-col">
              <h4>Product</h4>
              <ul>
                <li><a href="/product">Product</a></li>
                <li><a href="/pricing">Pricing</a></li>
                <li><a href="/security">Security</a></li>
                <li><a href="/login">Sign in</a></li>
              </ul>
            </div>
            <div className="foot-col">
              <h4>Company</h4>
              <ul>
                <li><a href="/stories">Stories</a></li>
                <li><a href="#contact">Contact</a></li>
              </ul>
            </div>
            <div className="foot-col">
              <h4>Legal</h4>
              <ul>
                <li><a href="#">Privacy</a></li>
                <li><a href="#">Terms</a></li>
                <li><a href="#">DPA</a></li>
              </ul>
            </div>
          </div>
        </footer>
        <div className="foot-end">
          <span>© 2026 ADGA · All rights reserved</span>
          <span>ADGA Suite</span>
          <span>Deal flow platform</span>
        </div>
      </div>
    </main>
  );
}
