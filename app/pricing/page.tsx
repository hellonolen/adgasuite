// @ts-nocheck
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
            <span className="nav-mono">No. 04 · Vol. III</span>
            <a href="/login" className="btn">Sign in</a>
            <a href="/request-access?plan=teams" className="btn primary">Request access</a>
          </div>
        </nav>
        {/* Page hero */}
        <section className="page-hero">
          <div>
            <div className="eyebrow">
              <span>Subscription</span>
              <span className="dot" />
              <span>For closing houses</span>
            </div>
            <h1>
              Three tiers,<br />
              <em>one ledger.</em>
            </h1>
          </div>
          <div>
            <p className="lede">
              Per-seat, billed monthly or annually. Annual saves twenty percent. A subscription is a relationship — kept simple, kept honest.
            </p>
            <div className="actions">
              <a href="/request-access?plan=teams" className="btn primary lg">Begin a subscription</a>
              <a href="#compare" className="btn lg">Compare tiers</a>
            </div>
          </div>
        </section>
        {/* Tier cards */}
        <section className="section" style={{paddingTop: 64, borderTop: 0}}>
          <div className="pricing">
            <div className="tier">
              <div>
                <div className="name">Individual</div>
                <div className="desc">For one closer running a private deal desk.</div>
              </div>
              <div className="price">$99<small>per month</small></div>
              <ul>
                <li>Leads, contacts, accounts</li>
                <li>Pipeline with kanban, table, timeline</li>
                <li>Tasks, checklists, milestones</li>
                <li>Standard email &amp; calendar sync</li>
                <li>10 GB storage</li>
                <li>1 named user</li>
              </ul>
              <a href="/request-access?plan=individual" className="btn">Begin</a>
            </div>
            <div className="tier featured">
              <span className="badge">For the room</span>
              <div>
                <div className="name">Teams</div>
                <div className="desc">For shared deal teams working across pipeline, rooms, calendar, and documents.</div>
              </div>
              <div className="price">$249<small>per seat / month</small></div>
              <ul>
                <li>Everything in Individual</li>
                <li>Virtual deal rooms &amp; due diligence</li>
                <li>The Story view — full lifetime per contact &amp; deal</li>
                <li>Voice memos &amp; video clips on every record</li>
                <li>Intelligence — forecasts, health flags, risk</li>
                <li>Automation playbooks &amp; native integrations</li>
                <li>ADGA conversational interface</li>
                <li>30 GB per seat · team workspace</li>
                <li>Priority AI operations queue</li>
              </ul>
              <a href="/request-access?plan=teams" className="btn primary">Request access</a>
            </div>
            <div className="tier">
              <div>
                <div className="name">Enterprise</div>
                <div className="desc">For larger firms that need more users, stronger security, and AI-run workflows.</div>
              </div>
              <div className="price">Custom<small>from $599 / seat</small></div>
              <ul>
                <li>Everything in Teams</li>
                <li>SSO · SAML · SCIM provisioning</li>
                <li>Granular permissions &amp; role engine</li>
                <li>Custom data retention &amp; legal hold</li>
                <li>Choose where company data is stored</li>
                <li>Custom audit exports &amp; SIEM hooks</li>
                <li>AI agents for setup, monitoring, and review queues</li>
                <li>99.95% uptime SLA</li>
              </ul>
              <a href="/request-access?plan=enterprise" className="btn">Arrange a meeting</a>
            </div>
          </div>
        </section>
        {/* Comparison matrix */}
        <section className="section" id="compare" style={{paddingTop: 48}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 24, flexWrap: 'wrap', marginBottom: 8}}>
            <h2 className="title" style={{margin: 0}}>A line-by-line <em>comparison</em>.</h2>
            <span className="ed-label">The fine print</span>
          </div>
          <div className="compare-wrap">
            <table className="compare">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Individual</th>
                  <th className="featured">Teams</th>
                  <th>Enterprise</th>
                </tr>
              </thead>
              <tbody>
                <tr className="section"><td colSpan={4}>The Ledger — Leads, Contacts, Accounts</td></tr>
                <tr><td>Leads management</td><td><span className="check">✓</span></td><td className="featured"><span className="check">✓</span></td><td><span className="check">✓</span></td></tr>
                <tr><td>Contacts &amp; Accounts (CRM)</td><td><span className="check">✓</span></td><td className="featured"><span className="check">✓</span></td><td><span className="check">✓</span></td></tr>
                <tr><td>Custom fields per record</td><td><span className="mini">25</span></td><td className="featured"><span className="mini">200</span></td><td><span className="mini">Unlimited</span></td></tr>
                <tr><td>Lead scoring &amp; routing rules</td><td><span className="dash">—</span></td><td className="featured"><span className="check">✓</span></td><td><span className="check">✓</span></td></tr>
                <tr><td>Customer &amp; product tracking</td><td><span className="dash">—</span></td><td className="featured"><span className="check">✓</span></td><td><span className="check">✓</span></td></tr>
                <tr className="section"><td colSpan={4}>The Floor — Pipeline &amp; Deals</td></tr>
                <tr><td>Kanban / Table / Timeline views</td><td><span className="check">✓</span></td><td className="featured"><span className="check">✓</span></td><td><span className="check">✓</span></td></tr>
                <tr><td>Custom pipelines</td><td><span className="mini">1</span></td><td className="featured"><span className="mini">10</span></td><td><span className="mini">Unlimited</span></td></tr>
                <tr><td>Multi-currency &amp; FX roll-up</td><td><span className="dash">—</span></td><td className="featured"><span className="check">✓</span></td><td><span className="check">✓</span></td></tr>
                <tr><td>Forecast intelligence &amp; risk flags</td><td><span className="dash">—</span></td><td className="featured"><span className="check">✓</span></td><td><span className="check">✓</span></td></tr>
                <tr className="section"><td colSpan={4}>The Room — Deal Rooms &amp; Due Diligence</td></tr>
                <tr><td>Virtual deal rooms (VDR)</td><td><span className="dash">—</span></td><td className="featured"><span className="check">✓</span></td><td><span className="check">✓</span></td></tr>
                <tr><td>Structured DD checklists</td><td><span className="dash">—</span></td><td className="featured"><span className="check">✓</span></td><td><span className="check">✓</span></td></tr>
                <tr><td>External-party access (guests)</td><td><span className="dash">—</span></td><td className="featured"><span className="mini">25 / month</span></td><td><span className="mini">Unlimited</span></td></tr>
                <tr><td>Watermarked viewing &amp; redaction</td><td><span className="dash">—</span></td><td className="featured"><span className="check">✓</span></td><td><span className="check">✓</span></td></tr>
                <tr><td>e-Signature (DocuSign, Dropbox Sign)</td><td><span className="check">✓</span></td><td className="featured"><span className="check">✓</span></td><td><span className="check">✓</span></td></tr>
                <tr className="section"><td colSpan={4}>The Story — Per-record Lifetime</td></tr>
                <tr><td>Activity feed per record</td><td><span className="check">✓</span></td><td className="featured"><span className="check">✓</span></td><td><span className="check">✓</span></td></tr>
                <tr><td>Story view (mind-map timeline)</td><td><span className="dash">—</span></td><td className="featured"><span className="check">✓</span></td><td><span className="check">✓</span></td></tr>
                <tr><td>Voice memos on any record</td><td><span className="dash">—</span></td><td className="featured"><span className="check">✓</span></td><td><span className="check">✓</span></td></tr>
                <tr><td>Video clips &amp; meeting recordings</td><td><span className="dash">—</span></td><td className="featured"><span className="check">✓</span></td><td><span className="check">✓</span></td></tr>
                <tr className="section"><td colSpan={4}>ADGA — The conversational interface</td></tr>
                <tr><td>ADGA chat in-app</td><td><span className="dash">—</span></td><td className="featured"><span className="check">✓</span></td><td><span className="check">✓</span></td></tr>
                <tr><td>Voice input &amp; transcription</td><td><span className="dash">—</span></td><td className="featured"><span className="check">✓</span></td><td><span className="check">✓</span></td></tr>
                <tr><td>Workflow actions from chat</td><td><span className="dash">—</span></td><td className="featured"><span className="check">✓</span></td><td><span className="check">✓</span></td></tr>
                <tr><td>Custom agent skills</td><td><span className="dash">—</span></td><td className="featured"><span className="dash">—</span></td><td><span className="check">✓</span></td></tr>
                <tr className="section"><td colSpan={4}>Integrations</td></tr>
                <tr><td>Email + Calendar (Google, Outlook)</td><td><span className="check">✓</span></td><td className="featured"><span className="check">✓</span></td><td><span className="check">✓</span></td></tr>
                <tr><td>Cloud storage (Box, Drive, OneDrive)</td><td><span className="dash">—</span></td><td className="featured"><span className="check">✓</span></td><td><span className="check">✓</span></td></tr>
                <tr><td>Slack &amp; Teams</td><td><span className="dash">—</span></td><td className="featured"><span className="check">✓</span></td><td><span className="check">✓</span></td></tr>
                <tr><td>Salesforce / NetSuite mirror</td><td><span className="dash">—</span></td><td className="featured"><span className="dash">—</span></td><td><span className="check">✓</span></td></tr>
                <tr><td>API &amp; Webhooks</td><td><span className="mini">Read-only</span></td><td className="featured"><span className="check">✓</span></td><td><span className="check">✓</span></td></tr>
                <tr className="section"><td colSpan={4}>Administration &amp; Security</td></tr>
                <tr><td>Role-based permissions</td><td><span className="mini">Basic</span></td><td className="featured"><span className="mini">Advanced</span></td><td><span className="mini">Custom roles</span></td></tr>
                <tr><td>SSO · SAML · SCIM</td><td><span className="dash">—</span></td><td className="featured"><span className="dash">—</span></td><td><span className="check">✓</span></td></tr>
                <tr><td>Audit log</td><td><span className="mini">30 days</span></td><td className="featured"><span className="mini">12 months</span></td><td><span className="mini">Unlimited + SIEM</span></td></tr>
                <tr><td>Choose where company data is stored</td><td><span className="mini">US</span></td><td className="featured"><span className="mini">US / EU</span></td><td><span className="mini">US / EU / APAC</span></td></tr>
                <tr><td>Legal hold &amp; retention controls</td><td><span className="dash">—</span></td><td className="featured"><span className="dash">—</span></td><td><span className="check">✓</span></td></tr>
                <tr className="section"><td colSpan={4}>Storage &amp; AI Operations</td></tr>
                <tr><td>Storage per seat</td><td><span className="mini">5 GB</span></td><td className="featured"><span className="mini">30 GB</span></td><td><span className="mini">Custom</span></td></tr>
                <tr><td>AI operations queue</td><td><span className="mini">Standard</span></td><td className="featured"><span className="mini">Priority</span></td><td><span className="mini">Custom workflows</span></td></tr>
                <tr><td>Onboarding</td><td><span className="mini">Self-serve</span></td><td className="featured"><span className="mini">Guided</span></td><td><span className="mini">White-glove</span></td></tr>
                <tr><td>Custom agent workflows</td><td><span className="dash">—</span></td><td className="featured"><span className="dash">—</span></td><td><span className="check">✓</span></td></tr>
                <tr><td>Uptime SLA</td><td><span className="mini">99.5%</span></td><td className="featured"><span className="mini">99.9%</span></td><td><span className="mini">99.95%</span></td></tr>
              </tbody>
            </table>
          </div>
          <div style={{display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32}}>
            <a href="/request-access?plan=individual" className="btn">Begin Individual</a>
            <a href="/request-access?plan=teams" className="btn primary">Request Teams</a>
            <a href="/request-access?plan=enterprise" className="btn">Arrange Enterprise</a>
          </div>
        </section>
        {/* FAQ */}
        <section className="section">
          <div className="faq">
            <div>
              <span className="ed-label">Often asked</span>
              <h2>The <em>fine print,</em> kept plain.</h2>
            </div>
            <div className="faq-list">
              <details className="faq-item" open>
                <summary>How is a "seat" defined?</summary>
                <p>A seat is one named user with login access. Read-only viewers do not count against seats on Teams or Enterprise. External counterparties invited to a deal room do not count as seats — they are billed separately as guest sessions on Teams, and unlimited on Enterprise.</p>
              </details>
              <details className="faq-item">
                <summary>Annual versus monthly billing?</summary>
                <p>Annual billing is twenty percent below the monthly rate, paid in advance. We do not lock you in — pro-rated refunds are issued on cancellation for any unused term. Monthly teams can switch to annual at any renewal.</p>
              </details>
              <details className="faq-item">
                <summary>Can we change tiers mid-term?</summary>
                <p>Yes. Upgrades take effect immediately and are pro-rated against your current term. Downgrades take effect at the next renewal. Enterprise contracts are bespoke and follow whatever change cadence is agreed in the order form.</p>
              </details>
              <details className="faq-item">
                <summary>What does Enterprise pricing actually look like?</summary>
                <p>Enterprise pricing depends on seat count, storage, security needs, and how many AI workflows the firm wants active. A typical mid-market closing house with twenty-five seats lands between $14k and $20k per month.</p>
              </details>
              <details className="faq-item">
                <summary>Is there a free trial?</summary>
                <p>Individual offers a fourteen-day trial, no card required. Teams starts with a guided setup flow inside the product. Enterprise starts with a scoped AI workflow setup.</p>
              </details>
              <details className="faq-item">
                <summary>What if our team has a hybrid of needs?</summary>
                <p>You can mix seats across tiers within a single workspace. Common pattern: principals and analysts on Teams, solo operators on Individual, external counsel on guest sessions. Billing aggregates on a single invoice.</p>
              </details>
              <details className="faq-item">
                <summary>Can we choose where company data is stored?</summary>
                <p>Yes. Teams can choose US or EU storage at setup. Enterprise can add APAC and other approved regions. This means your records, documents, and audit logs stay in the region selected for the workspace unless someone exports them.</p>
              </details>
              <details className="faq-item">
                <summary>Do you support compliance frameworks beyond SOC 2?</summary>
                <p>SOC 2 Type II and ISO 27001 are standard. Enterprise adds stronger security settings, stricter deal rooms, and custom audit tracking for regulated firms.</p>
              </details>
            </div>
          </div>
        </section>
        {/* CTA */}
        <section className="cta" id="contact">
          <h2>
            Begin your<br />
            <em>first issue.</em>
          </h2>
          <div className="right">
            <p>
              Subscriptions are handled through the product. AI agents prepare setup, review access requests, and keep the workspace moving.
            </p>
            <div className="ctas">
              <a href="/request-access?plan=teams" className="btn primary lg">Request access</a>
              <a href="/login" className="btn lg">Sign in</a>
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
            <p style={{marginTop: 10, fontSize: '12.5px', color: 'var(--ink-2)', maxWidth: '36ch'}}>
              A ledger for the closers. Composed in New York, Singapore, and Rotterdam.
            </p>
          </div>
          <div className="foot-cols">
            <div className="foot-col">
              <h4>Product</h4>
              <ul>
                <li><a href="/product">The ledger</a></li>
                <li><a href="/pricing">Pricing</a></li>
                <li><a href="/security">Security</a></li>
                <li><a href="/login">Sign in</a></li>
              </ul>
            </div>
            <div className="foot-col">
              <h4>Reading</h4>
              <ul>
                <li><a href="/stories">Stories</a></li>
                <li><a href="#">Field notes</a></li>
                <li><a href="#">Changelog</a></li>
              </ul>
            </div>
            <div className="foot-col">
              <h4>House</h4>
              <ul>
                <li><a href="#">About</a></li>
                <li><a href="#">Careers</a></li>
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
          <span>—— FIN ——</span>
          <span>composed in cream</span>
        </div>
      </div>
    </main>
  );
}
