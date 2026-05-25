"use client";

import Link from "next/link";
import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";
import { MarketingHero } from "@/components/adga/layout/MarketingHero";

export default function StoriesPage() {
  return (
    <MarketingLayout>
      <div className="wrap">
        <MarketingHero
          headline="Stories from the closers running ADGA."
          deck="Real names, real deals, real outcomes. In their own words."
          primaryCta={{ label: "Start closing deals", href: "/pricing" }}
          paddingBottom={24}
        />

        <section className="page-hero">
          <div>
            <div className="eyebrow">
              <span>From the reading room</span>
              <span className="dot" />
              <span>Customer stories</span>
            </div>
            <h1>
              Homes that<br />
              <em>closed.</em>
            </h1>
          </div>
          <div>
            <p className="lede">
              Four homes, four floors, four different rooms — every one running deals on ADGA.
            </p>
            <div className="actions">
              <Link href="/pricing" className="btn primary lg" prefetch>Start closing deals</Link>
              <Link href="/plan" className="btn lg" prefetch>Review the workspace</Link>
            </div>
          </div>
        </section>

        {/* Story 1 */}
        <section id="stories" className="story-spread">
          <div>
            <span className="label"><span className="dot" />Story · 01 · Mid-market M&amp;A</span>
            <h3>Concorde Group — <em>fourteen deals,</em> one operating system.</h3>
            <p>A cross-border M&amp;A home running twenty principals across three offices. Migrated from a patchwork of Salesforce, DocSend, and Asana into ADGA.</p>
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
