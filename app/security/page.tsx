// @ts-nocheck
export default function SecurityPage() {
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
            <a href="/pricing">Pricing</a>
            <a href="/security" className="active">Security</a>
            <a href="/stories">Stories</a>
          </div>
          <div className="nav-cta">
            <span className="nav-mono">No. 04 · Vol. III</span>
            <a href="/login" className="btn">Sign in</a>
            <a href="/request-access?plan=teams" className="btn primary">Request access</a>
          </div>
        </nav>
        <section className="page-hero">
          <div>
            <div className="eyebrow">
              <span>Under glass</span>
              <span className="dot" />
              <span>The compliance file</span>
            </div>
            <h1>
              Kept<br />
              <em>under glass.</em>
            </h1>
          </div>
          <div>
            <p className="lede">
              The closing room is the most sensitive room in the house. Everything inside ADGA is encrypted, audited, and signed for.
            </p>
            <div className="actions">
              <a href="#contact" className="btn primary lg">Request our compliance file</a>
              <a href="#controls" className="btn lg">See the controls</a>
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
              <div className="d">Annual audit covering security, availability, processing integrity, confidentiality, and privacy. Report available under NDA.</div>
            </div>
            <div className="stat-cell">
              <div className="v">ISO <em>27001</em></div>
              <div className="l">Information security</div>
              <div className="d">Certified information security management system covering ADGA's full production environment and operational practices.</div>
            </div>
            <div className="stat-cell">
              <div className="v">GDPR</div>
              <div className="l">EU data protection</div>
              <div className="d">Data subject rights, DPA on request, EU residency, and Standard Contractual Clauses for any cross-border movement.</div>
            </div>
            <div className="stat-cell">
              <div className="v">CCPA</div>
              <div className="l">California privacy</div>
              <div className="d">Consumer right access, deletion, and opt-out of sale honored. We do not sell personal information under any tier.</div>
            </div>
            <div className="stat-cell">
              <div className="v"><em>AES</em>·256</div>
              <div className="l">Encryption at rest</div>
              <div className="d">Every document, audio file, video clip, and database record is encrypted at rest. Keys are rotated quarterly.</div>
            </div>
            <div className="stat-cell">
              <div className="v"><em>TLS</em>·1.3</div>
              <div className="l">In transit</div>
              <div className="d">All client-server communication uses TLS 1.3 with forward secrecy. We do not accept earlier protocols.</div>
            </div>
            <div className="stat-cell">
              <div className="v"><em>99</em>.95</div>
              <div className="l">Uptime SLA</div>
              <div className="d">Enterprise commitments of 99.95% monthly uptime, with service credits for any month falling below.</div>
            </div>
            <div className="stat-cell">
              <div className="v">24<em>/7</em></div>
              <div className="l">Security monitoring</div>
              <div className="d">Continuous SIEM monitoring, intrusion detection, and incident response. Customer notification within 24 hours of material incident.</div>
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
              <p>Every user is a named identity. Every action carries that name into the audit. SSO, SAML, and SCIM provisioning are standard on Enterprise — and so is JIT de-provisioning when an employee leaves.</p>
              <ul>
                <li><span className="n">i.</span><span>Single Sign-On with Okta, Azure AD, Google Workspace</span></li>
                <li><span className="n">ii.</span><span>SAML 2.0 with custom IdP support</span></li>
                <li><span className="n">iii.</span><span>SCIM 2.0 user provisioning &amp; de-provisioning</span></li>
                <li><span className="n">iv.</span><span>Enforced multi-factor authentication, workspace-wide</span></li>
              </ul>
            </div>
            <div className="preview">
              <div className="frame"><div className="ph-title">SSO &amp; permissions panel</div></div>
              <div className="ph-meta">SCREEN · ADMIN · IDENTITY</div>
            </div>
          </div>
          <div className="spread flip">
            <div className="copy">
              <span className="ed-label">Permissions</span>
              <h3>Granular by <em>design</em>.</h3>
              <p>Roles, scopes, deal-level permissions, and external guest sessions. The permissions matrix is a living document, not a static template — write your own roles, your own scopes, your own exceptions.</p>
              <ul>
                <li><span className="n">i.</span><span>Owner · Admin · Member · Viewer · External — and any custom role</span></li>
                <li><span className="n">ii.</span><span>Per-deal &amp; per-document override permissions</span></li>
                <li><span className="n">iii.</span><span>Time-boxed access grants with auto-expiry</span></li>
                <li><span className="n">iv.</span><span>Watermarking &amp; viewer-level redaction</span></li>
              </ul>
            </div>
            <div className="preview">
              <div className="frame"><div className="ph-title">Permissions matrix · 14 controls × 5 roles</div></div>
              <div className="ph-meta">SCREEN · ADMIN · PERMISSIONS</div>
            </div>
          </div>
          <div className="spread" style={{borderBottom: 0}}>
            <div className="copy">
              <span className="ed-label">Audit</span>
              <h3>Every action, <em>on the record</em>.</h3>
              <p>Workspace-wide audit log — searchable, exportable, and (on Enterprise) streamed live to your SIEM. Every read, every export, every signature, every external view. Kept twelve months on Teams, indefinitely on Enterprise.</p>
              <ul>
                <li><span className="n">i.</span><span>Immutable audit trail with cryptographic chain-of-custody</span></li>
                <li><span className="n">ii.</span><span>Filterable by user, action, severity, IP, time window</span></li>
                <li><span className="n">iii.</span><span>SIEM streaming (Splunk, Datadog, custom webhook)</span></li>
                <li><span className="n">iv.</span><span>Legal hold &amp; bespoke retention windows</span></li>
              </ul>
            </div>
            <div className="preview">
              <div className="frame"><div className="ph-title">Audit log · workspace events</div></div>
              <div className="ph-meta">SCREEN · ADMIN · AUDIT</div>
            </div>
          </div>
        </section>
        {/* Residency */}
        <section className="section">
          <span className="ed-label">Residency</span>
          <h2 className="title">Your data <em>stays</em> where you put it.</h2>
          <div className="stat-grid">
            <div className="stat-cell">
              <div className="v">US</div>
              <div className="l">United States</div>
              <div className="d">Primary US region in Northern Virginia. Standard for all tiers. Multi-AZ failover and quarterly DR testing.</div>
            </div>
            <div className="stat-cell">
              <div className="v">EU</div>
              <div className="l">European Union</div>
              <div className="d">Frankfurt region for Teams and Enterprise customers. GDPR-resident with no cross-Atlantic movement.</div>
            </div>
            <div className="stat-cell">
              <div className="v">APAC</div>
              <div className="l">Asia Pacific</div>
              <div className="d">Singapore region for Enterprise customers operating across APAC, with additional Tokyo and Sydney on request.</div>
            </div>
            <div className="stat-cell">
              <div className="v">Bespoke</div>
              <div className="l">By arrangement</div>
              <div className="d">Sovereign-cloud, on-premises, or air-gapped deployments are available for Enterprise engagements with regulated requirements.</div>
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
              The complete compliance file — SOC 2 Type II report, penetration test summary, DPA, and security questionnaire — is available within one working day, under mutual NDA.
            </p>
            <div className="ctas">
              <a href="/request-access?plan=teams" className="btn primary lg">Request the file</a>
              <a href="/pricing" className="btn lg">See pricing</a>
            </div>
          </div>
        </section>
        {/* Footer */}
        <footer className="foot">
          <div>
            <a href="/" className="brand" style={{fontSize: 22}}>
              <span className="mark" style={{width: 24, height: 24, fontSize: 13}}>A</span>
              ADGA
            </a>
            <p style={{marginTop: 10, fontSize: '12.5px', color: 'var(--ink-2)', maxWidth: '36ch'}}>A ledger for the closers. Composed in New York, Singapore, and Rotterdam.</p>
          </div>
          <div className="foot-cols">
            <div className="foot-col"><h4>Product</h4><ul><li><a href="/product">The ledger</a></li><li><a href="/pricing">Pricing</a></li><li><a href="/security">Security</a></li><li><a href="/login">Sign in</a></li></ul></div>
            <div className="foot-col"><h4>Reading</h4><ul><li><a href="/stories">Stories</a></li><li><a href="#">Field notes</a></li><li><a href="#">Changelog</a></li></ul></div>
            <div className="foot-col"><h4>House</h4><ul><li><a href="#">About</a></li><li><a href="#">Careers</a></li><li><a href="#contact">Contact</a></li></ul></div>
            <div className="foot-col"><h4>Legal</h4><ul><li><a href="#">Privacy</a></li><li><a href="#">Terms</a></li><li><a href="#">DPA</a></li></ul></div>
          </div>
        </footer>
        <div className="foot-end">
          <span>© 2026 ADGA · All rights reserved</span>
          <span>—— FIN ——</span>
          <span>composed in cream</span>
        </div>
      </div>
    </main>
  );
}
