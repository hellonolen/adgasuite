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
            <span className="nav-mono">Deal flow platform</span>
            <a href="/login" className="btn">Sign in</a>
            <a href="/request-access?plan=teams" className="btn primary">Request access</a>
          </div>
        </nav>
        {/* ===== Hero ===== */}
        <section className="hero">
          <div className="meta">
            <span>AI deal flow suite</span>
            <span className="dot" />
            <span>Leads · Clients · Deals</span>
            <span className="dot" />
            <span>Agent-operated</span>
          </div>
          <div className="hero-grid">
            <div>
              <h1>
                Run the<br />
                full deal<br />
                <em>cycle.</em>
              </h1>
              <p className="lede">
                ADGA brings lead capture, follow-up, client work, documents, meetings, invoices, and deal history into one operating system.
              </p>
              <div className="ctas">
                <a href="/request-access?plan=teams" className="btn primary lg">Request access</a>
                <a href="/product" className="btn lg">See the platform</a>
              </div>
              <div className="signin">
                Existing teams · <a href="/login">open ADGA</a>
              </div>
            </div>
            <div className="hero-product-panel hero-photo">
              <div className="hero-panel-top">
                <span>Live lead</span>
                <b>Immediate follow-up</b>
              </div>
              <div className="hero-lead-card">
                <div>
                  <span className="hero-score">92</span>
                </div>
                <div>
                  <strong>Aurore Chastain</strong>
                  <span>Sutter Maritime · Head of Corp Dev</span>
                </div>
                <em>Hot</em>
              </div>
              <div className="hero-workflow">
                <div><span /> Capture</div>
                <div><span /> Qualify</div>
                <div><span /> Schedule</div>
                <div><span /> Deal room</div>
              </div>
              <div className="hero-panel-grid">
                <div>
                  <small>Next action</small>
                  <strong>Call within 5 minutes</strong>
                </div>
                <div>
                  <small>Meeting</small>
                  <strong>Invite queued</strong>
                </div>
                <div>
                  <small>Files</small>
                  <strong>2 documents attached</strong>
                </div>
                <div>
                  <small>Owner</small>
                  <strong>Maren Voss</strong>
                </div>
              </div>
              <div className="hero-agent-note">
                ADGA prepared the reply, logged the record, and opened the client follow-up path.
              </div>
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
          <span className="ed-label">Operating layer</span>
          <h2 className="title">What ADGA keeps moving.</h2>
          <div className="three">
            <div className="three-card">
              <div className="photo">
                <div className="ph-title">Capture</div>
                <div className="ph-meta">FORM · QR · IMPORT</div>
              </div>
              <span className="ed-label">Lead intake</span>
              <div className="head">Capture the full record.</div>
              <div className="body">Inbound forms, QR links, manual entries, imported lists, urgency, source, date, owner, and next action.</div>
            </div>
            <div className="three-card">
              <div className="photo">
                <div className="ph-title">Follow-up</div>
                <div className="ph-meta">EMAIL · SMS · VOICE</div>
              </div>
              <span className="ed-label">Contact work</span>
              <div className="head">Keep the relationship current.</div>
              <div className="body">Calls, messages, voice notes, meeting requests, documents, reminders, and follow-up sequences stay tied to the person.</div>
            </div>
            <div className="three-card">
              <div className="photo">
                <div className="ph-title">Deal room</div>
                <div className="ph-meta">FILES · TERMS · INVOICE</div>
              </div>
              <span className="ed-label">Deal execution</span>
              <div className="head">Move the work to close.</div>
              <div className="body">Track the client, internal team, deal story, documents, meetings, approvals, invoices, and payment connectors together.</div>
            </div>
          </div>
        </section>
        {/* ===== Product showcase ===== */}
        <section className="section">
          <span className="ed-label">Product system</span>
          <div className="product">
            <div className="copy">
              <h3>
                One suite,<br />
                one record.
              </h3>
              <p>
                ADGA gives owners and teams a connected workspace for every person, company, touch, meeting, file, invoice, and agent action behind a deal.
              </p>
              <ul>
                <li><span className="n">i.</span><span>Leads recorded with source, urgency, date, and owner</span><span className="meta">PIPELINE</span></li>
                <li><span className="n">ii.</span><span>Contacts &amp; accounts, with every touch on file</span><span className="meta">CRM</span></li>
                <li><span className="n">iii.</span><span>Deal rooms, signatures, due-diligence checklists</span><span className="meta">ROOMS</span></li>
                <li><span className="n">iv.</span><span>Internal and client communication tied to the deal</span><span className="meta">STORY</span></li>
                <li><span className="n">v.</span><span>Voice notes, transcripts, documents, and meeting records</span><span className="meta">MEDIA</span></li>
                <li><span className="n">vi.</span><span>Agent workflows that prepare the next action</span><span className="meta">AGENTS</span></li>
              </ul>
              <div style={{marginTop: 24}}><a href="/product" className="btn primary">See the full platform</a></div>
            </div>
            <div className="preview">
              <div className="frame">
                <div style={{flex: 1, display: 'grid', placeItems: 'center', flexDirection: 'column', textAlign: 'center', padding: '8% 12%'}}>
                  <div className="ph-title" style={{fontSize: 28}}>Lead, contact, deal, and follow-up in view.</div>
                </div>
                <div className="ph-meta">SCREEN · ADGA · 09:14</div>
              </div>
            </div>
          </div>
        </section>
        {/* ===== Quote / Testimonial ===== */}
        <section className="section">
          <span className="ed-label">Built for deal owners</span>
          <div className="quote" style={{marginTop: 24}}>
            <div className="photo">
              <div className="ph-title">Operator view</div>
              <div className="ph-meta">OWNER · TEAM · CLIENT</div>
            </div>
            <div className="text">
              <q>ADGA is built for the work that happens after a lead arrives: the follow-up, the meeting, the client record, the file, the invoice, and the close.</q>
              <div className="who">
                <span className="line" />
                <span><b>Deal operator</b> · Principal · private market advisory</span>
              </div>
              <div style={{marginTop: 14}}><a href="/stories" className="btn">See customer stories</a></div>
            </div>
          </div>
        </section>
        {/* ===== Pricing teaser ===== */}
        <section className="section" id="pricing">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 24, flexWrap: 'wrap'}}>
            <div>
              <span className="ed-label">Subscription</span>
              <h2 className="title" style={{margin: '18px 0 0'}}>Plans for individuals, teams, and firms.</h2>
            </div>
            <a href="/pricing" className="btn lg">See pricing</a>
          </div>
          <div className="pricing" style={{marginTop: 48}}>
            <div className="tier">
              <div>
                <div className="name">Individual</div>
                <div className="desc">For one owner managing leads, contacts, follow-up, documents, and invoices.</div>
              </div>
              <div className="price">$99<small>per month</small></div>
              <a href="/pricing" className="btn">See what's included</a>
            </div>
            <div className="tier featured">
              <span className="badge">For teams</span>
              <div>
                <div className="name">Teams</div>
                <div className="desc">For shared teams working across pipeline, client records, calendar, documents, and deal communications.</div>
              </div>
              <div className="price">$249<small>per seat / month</small></div>
              <a href="/request-access?plan=teams" className="btn primary">Request access</a>
            </div>
            <div className="tier">
              <div>
                <div className="name">Enterprise</div>
                <div className="desc">For larger firms that need advanced controls, connected teams, and account-level oversight.</div>
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
              <span className="ed-label">Controls</span>
              <h2 className="title" style={{margin: '18px 0 0'}}>Structured for serious work.</h2>
            </div>
            <a href="/security" className="btn lg">Review security</a>
          </div>
          <div className="three" style={{marginTop: 48}}>
            <div className="three-card">
              <div className="num">01</div>
              <div className="head">Records stay organized.</div>
              <div className="body">Leads, contacts, deals, invoices, reminders, and activity history stay connected in one place.</div>
            </div>
            <div className="three-card">
              <div className="num">02</div>
              <div className="head">Files stay attached.</div>
              <div className="body">Documents, voice notes, uploads, summaries, and generated files stay tied to the right client or deal.</div>
            </div>
            <div className="three-card">
              <div className="num">03</div>
              <div className="head">Agents keep work moving.</div>
              <div className="body">ADGA helps prepare follow-up, surface open items, and keep each deal moving toward the next action.</div>
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
              ADGA is the AI deal flow suite for lead capture, client work, follow-up, documents, meetings, invoices, and deal execution.
            </p>
          </div>
          <div className="foot-cols">
            <div className="foot-col">
              <h4>Product</h4>
              <ul>
                <li><a href="/product">Product</a></li>
                <li><a href="/pricing">Pricing</a></li>
                <li><a href="/security">Security</a></li>
                <li><a href="/login">Sign in</a></li>
              </ul>
            </div>
            <div className="foot-col">
              <h4>Company</h4>
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
          <span>ADGA Suite</span>
          <span>Deal flow platform</span>
        </div>
      </div>
    </main>
  );
}
