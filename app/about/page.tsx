import type { Metadata } from "next";
import Link from "next/link";
import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";
import { MarketingHero } from "@/components/adga/layout/MarketingHero";
import { PAGE_SEO } from "@/lib/marketing-config";

export const metadata: Metadata = {
  title: PAGE_SEO.about.title,
  description: PAGE_SEO.about.description,
  openGraph: { title: PAGE_SEO.about.title, description: PAGE_SEO.about.description },
  twitter: { title: PAGE_SEO.about.title, description: PAGE_SEO.about.description },
};

const PROOF = [
  "Deal records, contacts, pipeline stages, files, invoices, maps, voice notes, and activity in one workspace",
  "Encrypted workspace records, files, voice notes, and generated documents",
  "Checkout and payment event paths connected to workspace provisioning and billing events",
  "Built for closers, advisors, capital raisers, M&A teams, partnership teams, and high-ticket sellers",
];

const PRINCIPLES = [
  {
    label: "The deal is the unit",
    body: "Every contact, call, document, invoice, approval, and decision should point back to the deal it affects.",
  },
  {
    label: "Momentum has to be visible",
    body: "A workspace should show what is stale, what is missing, and what needs to happen next without another meeting.",
  },
  {
    label: "People stay in control",
    body: "AI can draft, summarize, transcribe, and surface risk, but customer-facing actions should stay approval-driven.",
  },
];

export default function AboutPage() {
  return (
    <MarketingLayout>
      <div className="wrap">
        <MarketingHero
          headline="Built for the people carrying the deal."
          deck="ADGA exists for closers, dealmakers, advisors, and operators who need the whole close path in one place: people, proof, process, invoice, payment, and handoff."
          primaryCta={{ label: "Start closing deals", href: "/pricing" }}
          paddingBottom={24}
        />

        <section className="section" style={{ borderTop: 0, paddingTop: 64 }}>
          <span className="ed-label">Empathy</span>
          <h2 className="title">Real deals are too expensive to run from memory.</h2>
          <p style={{ maxWidth: "78ch", marginTop: 16, color: "var(--adga-text-2)", fontSize: 17, lineHeight: 1.75 }}>
            A serious deal is not a card on a board. It is a set of people, promises, files, dates, risks, decisions, terms, invoices, and follow-ups that all have to move together. ADGA is built around that reality. The workspace keeps the record intact so the closer can see the next move, the team can trust the pipeline, and the customer does not feel the drag of scattered operations.
          </p>
        </section>

        <section className="section">
          <div className="balanced-card-grid balanced-card-grid-2" style={{ display: "grid", gap: 24, maxWidth: 1080, margin: "0 auto" }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--rule)", borderRadius: 14, padding: 28 }}>
              <span className="ed-label">Authority</span>
              <h2 style={{ margin: "8px 0 0", fontSize: 32, lineHeight: 1.05 }}>The platform is wired around the close path.</h2>
            </div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--rule)", borderRadius: 14, padding: 28 }}>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 14 }}>
                {PROOF.map((item) => (
                  <li key={item} style={{ display: "grid", gridTemplateColumns: "22px 1fr", gap: 10, fontSize: 14.5, color: "var(--adga-text)", lineHeight: 1.5 }}>
                    <span style={{ color: "var(--accent)" }}>✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="section">
          <span className="ed-label">How ADGA thinks</span>
          <h2 className="title">Three operating principles.</h2>
          <div className="three" style={{ marginTop: 32, maxWidth: 1080, marginLeft: "auto", marginRight: "auto" }}>
            {PRINCIPLES.map((principle) => (
              <div className="three-card" key={principle.label}>
                <div className="head">{principle.label}</div>
                <div className="body">{principle.body}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="cta">
          <h2>Run the deal from one place.</h2>
          <div className="right">
            <p>Choose a plan, verify email, and open the workspace built for deal flow management, pipeline follow-up, invoices, and close execution.</p>
            <div className="ctas">
              <Link href="/pricing" className="btn primary lg" prefetch>Start closing deals</Link>
              <Link href="/5-secrets" className="btn lg" prefetch>Get the 5 Secrets</Link>
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
