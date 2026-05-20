// @ts-nocheck
export default function MarketingPage() {
  return (
    <main>
      <div className="wrap">
        {/* ===== Nav ===== */}
        <nav className="nav">
          <a href="/" className="brand">
            <span className="mark">A</span>
            ADGA
          </a>
          <div className="nav-links">
            <a href="/product">Product</a>
            <a href="/pricing">Pricing</a>
            <a href="/security">Security</a>
            <a href="/stories">Stories</a>
          </div>
          <div className="nav-cta">
            <span className="nav-mono">No. 04 · Vol. III</span>
            <a href="/login" className="btn">Sign in</a>
            <a href="/request-access?plan=teams" className="btn primary">Request access</a>
          </div>
        </nav>
        {/* ===== Hero ===== */}
        <section className="hero">
          <div className="meta">
            <span>The deal-closers' ledger</span>
            <span className="dot" />
            <span>Spring · 2026</span>
            <span className="dot" />
            <span>Volume Three</span>
          </div>
          <div className="hero-grid">
            <div>
              <h1>
                A ledger<br />
                for the<br />
                <em>closers.</em>
              </h1>
              <p className="lede">
                Every lead. Every touch. Every signature, in one ledger composed by hand and kept by ADGA.
              </p>
              <div className="ctas">
                <a href="/request-access?plan=teams" className="btn primary lg">Request access</a>
                <a href="/product" className="btn lg">Read the issue</a>
              </div>
              <div className="signin">
                Existing teams · <a href="/login">enter the ledger</a>
              </div>
            </div>
            <div className="photo hero-photo">
              <div className="ph-title">Cover plate</div>
              <div className="ph-meta">PORTRAIT · 35mm · NATURAL LIGHT</div>
            </div>
          </div>
          {/* Marquee strip */}
          <div className="strip">
            <div className="strip-row">
              <span>Acquisition</span><span className="dot">·</span>
              <span><em>Capital raise</em></span><span className="dot">·</span>
              <span>Partnership</span><span className="dot">·</span>
              <span>Licensing</span><span className="dot">·</span>
              <span><em>Joint venture</em></span><span className="dot">·</span>
              <span>Buyout</span><span className="dot">·</span>
              <span>Procurement</span><span className="dot">·</span>
              <span><em>Reseller</em></span><span className="dot">·</span>
              <span>Acquisition</span><span className="dot">·</span>
              <span><em>Capital raise</em></span><span className="dot">·</span>
              <span>Partnership</span><span className="dot">·</span>
              <span>Licensing</span><span className="dot">·</span>
              <span><em>Joint venture</em></span><span className="dot">·</span>
              <span>Buyout</span><span className="dot">·</span>
              <span>Procurement</span><span className="dot">·</span>
              <span><em>Reseller</em></span><span className="dot">·</span>
            </div>
          </div>
        </section>
        {/* ===== Three columns ===== */}
        <section className="section">
          <span className="ed-label">By the numbers · 01</span>
          <h2 className="title">What the room <em>kept</em>.</h2>
          <div className="three">
            <div className="three-card">
              <div className="photo">
                <div className="ph-title">Still life</div>
                <div className="ph-meta">STILL LIFE · PEN, PAPER, ESPRESSO</div>
              </div>
              <span className="ed-label">No. 01 · Pipeline</span>
              <div className="head"><em>Every lead,</em> recorded.</div>
              <div className="body">From inbound bell to closed signature — every conversation, every artifact, kept where you left it.</div>
            </div>
            <div className="three-card">
              <div className="photo">
                <div className="ph-title">Portrait</div>
                <div className="ph-meta">PORTRAIT · NATURAL LIGHT · MEDIUM FORMAT</div>
              </div>
              <span className="ed-label">No. 02 · Contacts</span>
              <div className="head"><em>Each name,</em> their full lifetime.</div>
              <div className="body">A contact is not a row in a database. It is a person you can recall — every call, every memo, every decision in one place.</div>
            </div>
            <div className="three-card">
              <div className="photo">
                <div className="ph-title">Interior, dusk</div>
                <div className="ph-meta">ARCHITECTURE · GOLDEN HOUR</div>
              </div>
              <span className="ed-label">No. 03 · The room</span>
              <div className="head">A <em>secure room,</em> by design.</div>
              <div className="body">Every document. Every signature. Every audit line. Kept under glass for the rooms that need it.</div>
            </div>
          </div>
        </section>
        {/* ===== Product showcase ===== */}
        <section className="section">
          <span className="ed-label">An object study</span>
          <div className="product">
            <div className="copy">
              <h3>
                The ledger,<br />
                <em>opened.</em>
              </h3>
              <p>
                ADGA holds the entire run of a deal — and the entire lifetime of a contact — under one cover. You drill in. You drill back. You leave a note. You sign.
              </p>
              <ul>
                <li><span className="n">i.</span><span>Leads, recorded the moment they enter the room</span><span className="meta">PIPELINE</span></li>
                <li><span className="n">ii.</span><span>Contacts &amp; accounts, with every touch on file</span><span className="meta">CRM</span></li>
                <li><span className="n">iii.</span><span>Deal rooms, signatures, due-diligence checklists</span><span className="meta">ROOMS</span></li>
                <li><span className="n">iv.</span><span>Conversations recorded for the next reader</span><span className="meta">STORY</span></li>
                <li><span className="n">v.</span><span>Voice memos, video clips, marginalia, handwritten</span><span className="meta">MEDIA</span></li>
                <li><span className="n">vi.</span><span>A composed brief, every morning, by ADGA</span><span className="meta">VOICE</span></li>
              </ul>
              <div style={{marginTop: 24}}><a href="/product" className="btn primary">Read the full issue →</a></div>
            </div>
            <div className="preview">
              <div className="frame">
                <div style={{flex: 1, display: 'grid', placeItems: 'center', flexDirection: 'column', textAlign: 'center', padding: '8% 12%'}}>
                  <div className="ph-title" style={{fontSize: 28}}>The desk, as you arranged it.</div>
                </div>
                <div className="ph-meta">SCREEN · ADGA · 09:14</div>
              </div>
            </div>
          </div>
        </section>
        {/* ===== Quote / Testimonial ===== */}
        <section className="section">
          <span className="ed-label">From a reader</span>
          <div className="quote" style={{marginTop: 24}}>
            <div className="photo">
              <div className="ph-title">Portrait</div>
              <div className="ph-meta">PORTRAIT · STUDIO · BLACK &amp; WHITE</div>
            </div>
            <div className="text">
              <q>You don't run deals the way you run a database. You run them the way you run a room — and ADGA finally treats it that way.</q>
              <div className="who">
                <span className="line" />
                <span><b>A reader</b> · Principal · cross-border M&amp;A</span>
              </div>
              <div style={{marginTop: 14}}><a href="/stories" className="btn">Read four stories →</a></div>
            </div>
          </div>
        </section>
        {/* ===== Pricing teaser ===== */}
        <section className="section" id="pricing">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 24, flexWrap: 'wrap'}}>
            <div>
              <span className="ed-label">Subscription</span>
              <h2 className="title" style={{margin: '18px 0 0'}}>A subscription, <em>by issue</em>.</h2>
            </div>
            <a href="/pricing" className="btn lg">See the full table →</a>
          </div>
          <div className="pricing" style={{marginTop: 48}}>
            <div className="tier">
              <div>
                <div className="name">Individual</div>
                <div className="desc">For one closer running a private deal desk.</div>
              </div>
              <div className="price">$99<small>per month</small></div>
              <a href="/pricing" className="btn">See what's included</a>
            </div>
            <div className="tier featured">
              <span className="badge">For the room</span>
              <div>
                <div className="name">Teams</div>
                <div className="desc">For shared deal teams working across pipeline, rooms, calendar, and documents.</div>
              </div>
              <div className="price">$249<small>per seat / month</small></div>
              <a href="/request-access?plan=teams" className="btn primary">Request access</a>
            </div>
            <div className="tier">
              <div>
                <div className="name">Enterprise</div>
                <div className="desc">For the house that runs the rooms inside other rooms.</div>
              </div>
              <div className="price">Custom</div>
              <a href="/request-access?plan=enterprise" className="btn">Arrange a meeting</a>
            </div>
          </div>
        </section>
        {/* ===== Security teaser ===== */}
        <section className="section" id="security">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 24, flexWrap: 'wrap'}}>
            <div>
              <span className="ed-label">Under glass</span>
              <h2 className="title" style={{margin: '18px 0 0'}}>Kept <em>under glass</em>.</h2>
            </div>
            <a href="/security" className="btn lg">Read the compliance file →</a>
          </div>
          <div className="three" style={{marginTop: 48}}>
            <div className="three-card">
              <div className="num">SOC<em>2</em></div>
              <div className="head">A room that audits itself.</div>
              <div className="body">SOC 2 Type II controls across every touch — every viewer, every signature, every export.</div>
            </div>
            <div className="three-card">
              <div className="num"><em>EU</em>·US</div>
              <div className="head">Stored where you choose.</div>
              <div className="body">Pick where company data is stored. Records, documents, and audit logs stay tied to that choice.</div>
            </div>
            <div className="three-card">
              <div className="num">99.<em>95</em></div>
              <div className="head">Uptime, on the record.</div>
              <div className="body">Service-level commitments are written on the cover, not buried in the appendix.</div>
            </div>
          </div>
        </section>
        {/* ===== CTA ===== */}
        <section className="cta" id="contact">
          <h2>
            Bring every<br />
            <em>lead into view.</em>
          </h2>
          <div className="right">
            <p>
              Send a contact request into ADGA with the details your team needs to act quickly, route the lead, and schedule the next follow-up.
            </p>
            <form action="/api/leads/intake" method="post" style={{display: 'grid', gap: 10, margin: '18px 0'}}>
              <input type="hidden" name="source" value="Footer contact form" />
              <input type="hidden" name="qr_source" value="footer-contact-qr" />
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10}}>
                <input name="full_name" placeholder="Full name" required />
                <input name="email" type="email" placeholder="Email" required />
                <input name="phone" placeholder="Phone" />
                <input name="company" placeholder="Company" required />
                <input name="job_title" placeholder="Title" />
                <input name="website" placeholder="Business website" />
                <input name="linkedin_url" placeholder="LinkedIn or social profile" />
                <input name="state_region" placeholder="State" />
              </div>
              <textarea name="need_summary" rows={3} placeholder="What should we know about this lead?" />
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10}}>
                <select name="urgency" defaultValue="Normal">
                  <option>Immediate</option>
                  <option>Same Day</option>
                  <option>Scheduled</option>
                  <option>Normal</option>
                  <option>Low</option>
                </select>
                <select name="preferred_contact_method" defaultValue="Email">
                  <option>Email</option>
                  <option>Phone</option>
                  <option>Text</option>
                  <option>LinkedIn</option>
                </select>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap'}}>
                <div aria-label="Footer QR code" style={{width: 82, height: 82, border: '1px solid var(--line)', display: 'grid', placeItems: 'center', fontSize: 11, color: 'var(--ink-2)'}}>QR</div>
                <button className="btn primary lg" type="submit">Send contact</button>
              </div>
            </form>
            <div className="ctas">
              <a href="/request-access?plan=teams" className="btn primary lg">Request access</a>
              <a href="/pricing" className="btn lg">See pricing</a>
            </div>
          </div>
        </section>
        {/* ===== Foot ===== */}
        <footer className="foot">
          <div>
            <div className="brand" style={{fontSize: 22}}>
              <span className="mark" style={{width: 24, height: 24, fontSize: 13}}>A</span>
              ADGA
            </div>
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
