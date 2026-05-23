"use client";

import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";

export default function SecurityPage() {
  return (
    <MarketingLayout>
      <div className="wrap">
        <section className="hero hero-center" style={{ paddingBottom: 24 }}>
          <div className="hero-pill">
            <span className="hero-pill-dot" /> Security
          </div>
          <h1 className="hero-display">Your deal data, your tenant.</h1>
          <p className="hero-lede-center">
            Cloudflare D1 and R2, encrypted in transit and at rest. Role-based access. Immutable audit log. No shared storage.
          </p>
          <div className="hero-ctas" style={{ gap: 12, display: "inline-flex", flexWrap: "wrap", justifyContent: "center" }}>
            <a href="#controls" className="btn primary lg">Read the controls</a>
            <a href="/pricing" className="btn lg" style={{ background: "transparent", border: "1px solid var(--rule, #e8e4de)" }}>
              See pricing
            </a>
          </div>
        </section>

        <section className="page-hero">
          <div>
            <div className="eyebrow">
              <span>Under glass</span>
              <span className="dot" />
              <span>The compliance file</span>
            </div>
            <h1>
              Kept<br />
              <em>under control.</em>
            </h1>
          </div>
          <div>
            <p className="lede">
              The closing room is the most sensitive room in the house. Everything inside ADGA is encrypted, audited, and signed for.
            </p>
            <div className="actions">
              <a href="#controls" className="btn primary lg">Review controls</a>
              <a href="/pricing" className="btn lg">See pricing</a>
            </div>
          </div>
        </section>

        {/* Big stat grid */}
        <section className="section" style={{paddingTop: 32, borderTop: 0}}>
          <span className="ed-label">Certifications &amp; controls</span>
          <h2 className="title">The <em>credentials</em> on file.</h2>
          <div className="stat-grid">
            <div className="stat-cell">
              <div className="v">SOC <em>2</em></div>
              <div className="l">Type II</div>
              <div className="d">Annual audit covering security, availability, processing integrity, confidentiality, and privacy.</div>
            </div>
            <div className="stat-cell">
              <div className="v">ISO <em>27001</em></div>
              <div className="l">Information security</div>
              <div className="d">Certified information security management system covering ADGA's full production environment.</div>
            </div>
            <div className="stat-cell">
              <div className="v">GDPR</div>
              <div className="l">EU data protection</div>
              <div className="d">Data subject rights, DPA on request, EU residency, and Standard Contractual Clauses.</div>
            </div>
            <div className="stat-cell">
              <div className="v">CCPA</div>
              <div className="l">California privacy</div>
              <div className="d">Consumer right access, deletion, and opt-out of sale honored. We do not sell personal information.</div>
            </div>
            <div className="stat-cell">
              <div className="v"><em>AES</em>·256</div>
              <div className="l">Encryption at rest</div>
              <div className="d">Every document, audio file, video clip, and database record is encrypted at rest.</div>
            </div>
            <div className="stat-cell">
              <div className="v"><em>TLS</em>·1.3</div>
              <div className="l">In transit</div>
              <div className="d">All client-server communication uses TLS 1.3 with forward secrecy.</div>
            </div>
            <div className="stat-cell">
              <div className="v"><em>99</em>.95</div>
              <div className="l">Uptime SLA</div>
              <div className="d">Enterprise commitments of 99.95% monthly uptime, with service credits for any month falling below.</div>
            </div>
            <div className="stat-cell">
              <div className="v">24<em>/7</em></div>
              <div className="l">Security monitoring</div>
              <div className="d">Continuous SIEM monitoring, intrusion detection, and incident response.</div>
            </div>
          </div>
        </section>

        {/* Controls */}
        <section className="section" id="controls">
          <span className="ed-label">The controls</span>
          <h2 className="title">Who sees <em>what,</em> and when.</h2>
          <div className="spread" style={{borderBottom: 0}}>
            <div className="copy">
              <span className="ed-label">Identity &amp; Access</span>
              <h3>One name, <em>scoped</em>.</h3>
              <p>Every user is a named identity. Every action carries that name into the audit. SSO, SAML, and SCIM provisioning are standard on Enterprise.</p>
              <ul>
                <li><span className="n">i.</span><span>Single Sign-On with Okta, Azure AD, Google Workspace</span></li>
                <li><span className="n">ii.</span><span>SAML 2.0 with custom IdP support</span></li>
                <li><span className="n">iii.</span><span>SCIM 2.0 user provisioning &amp; de-provisioning</span></li>
                <li><span className="n">iv.</span><span>Enforced multi-factor authentication</span></li>
              </ul>
            </div>
            <div className="preview">
              <div className="frame"><div className="ph-title">SSO &amp; permissions panel</div></div>
              <div className="ph-meta">SCREEN · ADMIN · IDENTITY</div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="cta" id="contact">
          <h2>
            Read the<br />
            <em>full file.</em>
          </h2>
          <div className="right">
            <p>
              Security controls, data-processing terms, and workspace audit details are available inside verified ADGA workspaces.
            </p>
            <div className="ctas">
              <a href="#controls" className="btn primary lg">Review security controls</a>
              <a href="/pricing" className="btn lg">See pricing</a>
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
