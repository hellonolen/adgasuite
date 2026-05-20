// @ts-nocheck
export default function StoriesPage() {
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
            <a href="/security">Security</a>
            <a href="/stories" className="active">Stories</a>
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
              <a href="/request-access?plan=teams" className="btn primary lg">Begin a subscription</a>
              <a href="/product" className="btn lg">See the product</a>
            </div>
          </div>
        </section>
        {/* Story 1 */}
        <section className="story-spread">
          <div>
            <span className="label"><span className="dot" />Story · 01 · Mid-market M&amp;A</span>
            <h3>Concorde Group — <em>fourteen deals,</em> one ledger.</h3>
            <p>A cross-border M&amp;A house running twenty principals across three offices. Migrated from a patchwork of Salesforce, DocSend, and Asana — onto ADGA's single ledger. The result: every deal, every room, every signature in one place.</p>
            <div className="stats">
              <div className="stat"><div className="v">$2.4<em>B</em></div><div className="l">Pipeline value</div></div>
              <div className="stat"><div className="v"><em>3</em>×</div><div className="l">Closing velocity</div></div>
              <div className="stat"><div className="v">42<em>%</em></div><div className="l">Less time in DD</div></div>
              <div className="stat"><div className="v">14</div><div className="l">Months on ADGA</div></div>
            </div>
            <div className="who">
              <span className="line" />
              <span><b>Maren Voss</b> · Principal · Concorde Group</span>
            </div>
          </div>
          <div className="photo">
            <div className="ph-title">Portrait</div>
            <div className="ph-meta">PORTRAIT · MEDIUM FORMAT · NATURAL LIGHT</div>
          </div>
        </section>
        {/* Story 2 */}
        <section className="story-spread">
          <div>
            <span className="label"><span className="dot" />Story · 02 · Capital markets</span>
            <h3>Larkfield Capital — the <em>desk that doesn't sleep.</em></h3>
            <p>A Singapore-based growth-equity firm with limited partners across APAC and the Middle East. ADGA's Story view replaced four separate deal-room subscriptions and gave them, for the first time, a single record per LP relationship across every fund they've raised.</p>
            <div className="stats">
              <div className="stat"><div className="v">$<em>900</em>M</div><div className="l">AUM tracked</div></div>
              <div className="stat"><div className="v"><em>62</em></div><div className="l">Active LPs</div></div>
              <div className="stat"><div className="v">4→<em>1</em></div><div className="l">Tools consolidated</div></div>
              <div className="stat"><div className="v">22</div><div className="l">Months on ADGA</div></div>
            </div>
            <div className="who">
              <span className="line" />
              <span><b>K. Senthil</b> · Managing Partner · Larkfield Capital</span>
            </div>
          </div>
          <div className="photo">
            <div className="ph-title">Skyline · dusk</div>
            <div className="ph-meta">ARCHITECTURE · GOLDEN HOUR · SINGAPORE</div>
          </div>
        </section>
        {/* Story 3 */}
        <section className="story-spread">
          <div>
            <span className="label"><span className="dot" />Story · 03 · Industrial deals</span>
            <h3>Heliograph Industries — the <em>room behind the room.</em></h3>
            <p>A Rotterdam-based industrial conglomerate using ADGA as their corporate-development desk. Every bolt-on candidate, every banker introduction, every legal exception — stored as a contact, surfaced through the Story view, and worked through Pipeline.</p>
            <div className="stats">
              <div className="stat"><div className="v"><em>120</em></div><div className="l">Active opportunities</div></div>
              <div className="stat"><div className="v"><em>9</em></div><div className="l">Closed bolt-ons / year</div></div>
              <div className="stat"><div className="v">$<em>180</em>M</div><div className="l">In closed value</div></div>
              <div className="stat"><div className="v">8</div><div className="l">Months on ADGA</div></div>
            </div>
            <div className="who">
              <span className="line" />
              <span><b>Ines van Dijk</b> · Director, Corp Dev · Heliograph Industries</span>
            </div>
          </div>
          <div className="photo">
            <div className="ph-title">Still life</div>
            <div className="ph-meta">STILL LIFE · PEN, PAPER, ESPRESSO</div>
          </div>
        </section>
        {/* Story 4 */}
        <section className="story-spread">
          <div>
            <span className="label"><span className="dot" />Story · 04 · Brokerage</span>
            <h3>Brunswick Spectrum — the <em>floor, finally orderly.</em></h3>
            <p>A boutique brokerage placing private-credit and structured-equity deals across the UK and Continent. Replaced spreadsheets, a personal Notion, and a shared inbox with ADGA's Pipeline and Story views. The morning brief replaced their Monday standup.</p>
            <div className="stats">
              <div className="stat"><div className="v">£<em>340</em>M</div><div className="l">In placement</div></div>
              <div className="stat"><div className="v"><em>5</em>→<em>1</em></div><div className="l">Brokers → one room</div></div>
              <div className="stat"><div className="v">0</div><div className="l">Spreadsheets remaining</div></div>
              <div className="stat"><div className="v">11</div><div className="l">Months on ADGA</div></div>
            </div>
            <div className="who">
              <span className="line" />
              <span><b>Saskia Krieg</b> · Managing Partner · Brunswick Spectrum</span>
            </div>
          </div>
          <div className="photo">
            <div className="ph-title">Portrait, studio</div>
            <div className="ph-meta">PORTRAIT · BLACK &amp; WHITE</div>
          </div>
        </section>
        {/* CTA */}
        <section className="cta" id="contact">
          <h2>
            Begin your<br />
            <em>own story.</em>
          </h2>
          <div className="right">
            <p>
              Subscriptions are handled through the product. AI agents prepare setup, review access requests, and keep the workspace moving.
            </p>
            <div className="ctas">
              <a href="/request-access?plan=teams" className="btn primary lg">Request access</a>
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
