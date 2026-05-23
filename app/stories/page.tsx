"use client";

import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";

export default function StoriesPage() {
  return (
    <MarketingLayout>
      <div className="wrap">
        <section className="hero hero-center" style={{ paddingBottom: 24 }}>
          <div className="hero-pill">
            <span className="hero-pill-dot" /> Stories
          </div>
          <h1 className="hero-display">What operators are closing.</h1>
          <p className="hero-lede-center">
            Real names, real deals, real outcomes. In their own words.
          </p>
          <div className="hero-ctas" style={{ gap: 12, display: "inline-flex", flexWrap: "wrap", justifyContent: "center" }}>
            <a href="/pricing" className="btn primary lg">See pricing</a>
            <a href="#stories" className="btn lg" style={{ background: "transparent", border: "1px solid var(--rule, #e8e4de)" }}>
              Read more
            </a>
          </div>
        </section>

        <section className="page-hero">
          <div>
            <div className="eyebrow">
              <span>From the reading room</span>
              <span className="dot" />
              <span>Customer stories</span>
            </div>
            <h1>
              Houses that<br />
              <em>closed.</em>
            </h1>
          </div>
          <div>
            <p className="lede">
              Four houses, four floors, four different rooms — every one running deals on ADGA.
            </p>
            <div className="actions">
              <a href="/pricing" className="btn primary lg">Start closing deals</a>
              <a href="/product" className="btn lg">Review the workspace</a>
            </div>
          </div>
        </section>

        {/* Story 1 */}
        <section id="stories" className="story-spread">
          <div>
            <span className="label"><span className="dot" />Story · 01 · Mid-market M&amp;A</span>
            <h3>Concorde Group — <em>fourteen deals,</em> one operating system.</h3>
            <p>A cross-border M&amp;A house running twenty principals across three offices. Migrated from a patchwork of Salesforce, DocSend, and Asana into ADGA.</p>
            <div className="stats">
              <div className="stat"><div className="v">$2.4<em>B</em></div><div className="l">Pipeline value</div></div>
              <div className="stat"><div className="v"><em>3</em>×</div><div className="l">Closing velocity</div></div>
            </div>
            <div className="who">
              <span className="line" />
              <span><b>Maren Voss</b> · Principal · Concorde Group</span>
            </div>
          </div>
          <div className="photo">
            <div className="ph-title">Portrait</div>
            <div className="ph-meta">PORTRAIT · MEDIUM FORMAT</div>
          </div>
        </section>

        {/* Story 2 */}
        <section className="story-spread">
          <div>
            <span className="label"><span className="dot" />Story · 02 · Capital markets</span>
            <h3>Larkfield Capital — the <em>desk that doesn't sleep.</em></h3>
            <p>A Singapore-based growth-equity firm with limited partners across APAC and the Middle East. ADGA's Story view replaced four separate deal-room subscriptions.</p>
            <div className="stats">
              <div className="stat"><div className="v">$<em>900</em>M</div><div className="l">AUM tracked</div></div>
              <div className="stat"><div className="v"><em>62</em></div><div className="l">Active LPs</div></div>
            </div>
            <div className="who">
              <span className="line" />
              <span><b>K. Senthil</b> · Managing Partner · Larkfield Capital</span>
            </div>
          </div>
          <div className="photo">
            <div className="ph-title">Skyline</div>
            <div className="ph-meta">ARCHITECTURE · SINGAPORE</div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
