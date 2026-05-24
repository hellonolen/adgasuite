import type { Metadata } from "next";
import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";
import { MarketingHero } from "@/components/adga/layout/MarketingHero";
import { PAGE_SEO } from "@/lib/marketing-config";

export const metadata: Metadata = {
  title: PAGE_SEO.contact.title,
  description: PAGE_SEO.contact.description,
  openGraph: { title: PAGE_SEO.contact.title, description: PAGE_SEO.contact.description },
  twitter: { title: PAGE_SEO.contact.title, description: PAGE_SEO.contact.description },
};

type ContactRoute = {
  label: string;
  body: string;
};

const ROUTES: ReadonlyArray<ContactRoute> = [
  {
    label: "Inside your workspace",
    body: "Every conversation with ADGA happens on the deal. The agents handle the question right where the deal lives, with the full context already attached.",
  },
  {
    label: "Before you open a workspace",
    body: "Pricing, configuration, and getting started questions are answered on the pricing page and inside the agents from the first sign-in.",
  },
  {
    label: "Policy, security, or compliance",
    body: "The Policy Center holds every policy that governs how ADGA collects, secures, and handles your data — privacy, terms, SMS, email, cookies, acceptable use, and data processing.",
  },
  {
    label: "Partnerships and press",
    body: "Strategic partnerships, integrations, and media inquiries are coordinated through the workspace once an account is opened.",
  },
];

export default function ContactPage() {
  return (
    <MarketingLayout>
      <div className="wrap">
        <MarketingHero
          headline="The deal is the conversation."
          deck="ADGA is an agentic platform. Every interaction — questions, requests, escalations — runs through the agents inside the workspace, on the deal itself."
          primaryCta={{ label: "Start closing deals", href: "/pricing" }}
          paddingBottom={24}
        />

        <section className="section" style={{ borderTop: 0, paddingTop: 32 }}>
          <span className="ed-label">Contact</span>
          <h2 className="title">
            Every conversation lives <em>inside the deal.</em>
          </h2>

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
            {ROUTES.map((route) => (
              <article
                key={route.label}
                style={{ background: "var(--paper)", border: "1px solid var(--rule)", borderRadius: 14, padding: 28, display: "flex", flexDirection: "column", gap: 12 }}
              >
                <h3 style={{ fontFamily: "var(--font-sans)", fontSize: 20, fontWeight: 400, lineHeight: 1.1, color: "var(--ink)", letterSpacing: "-0.02em", margin: 0 }}>
                  {route.label}
                </h3>
                <p style={{ fontSize: 14.5, color: "var(--ink-2)", lineHeight: 1.55, margin: 0 }}>
                  {route.body}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
