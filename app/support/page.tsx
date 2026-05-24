import type { Metadata } from "next";
import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";
import { MarketingHero } from "@/components/adga/layout/MarketingHero";
import { PAGE_SEO } from "@/lib/marketing-config";

export const metadata: Metadata = {
  title: PAGE_SEO.support.title,
  description: PAGE_SEO.support.description,
  openGraph: { title: PAGE_SEO.support.title, description: PAGE_SEO.support.description },
  twitter: { title: PAGE_SEO.support.title, description: PAGE_SEO.support.description },
};

type SupportCapability = {
  label: string;
  body: string;
};

const CAPABILITIES: ReadonlyArray<SupportCapability> = [
  {
    label: "Live inside the deal",
    body: "The agents handle questions where the deal already lives. No tab switching, no ticket queues, no waiting for a reply from somewhere else.",
  },
  {
    label: "Answers tied to your data",
    body: "The agents see the contact, the document, the call summary, the next action. Answers reference the exact record you’re looking at.",
  },
  {
    label: "Always on, always current",
    body: "Help is available the moment a question forms. Every answer reflects the current version of the platform, the current state of your deal, and the current policy.",
  },
  {
    label: "Escalation built in",
    body: "Anything that can’t be resolved by the agents — billing exceptions, security incidents, data requests — is routed automatically through the policies that govern it.",
  },
];

export default function SupportPage() {
  return (
    <MarketingLayout>
      <div className="wrap">
        <MarketingHero
          headline="The agents are your support."
          deck="ADGA support lives inside the workspace. Ask anything on the deal itself — the agents see what you see and resolve in context."
          primaryCta={{ label: "Start closing deals", href: "/pricing" }}
          paddingBottom={24}
        />

        <section className="section" style={{ borderTop: 0, paddingTop: 32 }}>
          <span className="ed-label">Support</span>
          <h2 className="title">
            Support runs inside the <em>deal.</em>
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
            {CAPABILITIES.map((cap) => (
              <article
                key={cap.label}
                style={{ background: "var(--paper)", border: "1px solid var(--rule)", borderRadius: 14, padding: 28, display: "flex", flexDirection: "column", gap: 12 }}
              >
                <h3 style={{ fontFamily: "var(--font-sans)", fontSize: 20, fontWeight: 400, lineHeight: 1.1, color: "var(--ink)", letterSpacing: "-0.02em", margin: 0 }}>
                  {cap.label}
                </h3>
                <p style={{ fontSize: 14.5, color: "var(--ink-2)", lineHeight: 1.55, margin: 0 }}>
                  {cap.body}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
