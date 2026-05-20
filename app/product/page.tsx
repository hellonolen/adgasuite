// @ts-nocheck
export default function ProductPage() {
  return (
    <main>
      <div className="wrap">
        <nav className="nav">
          <a href="/" className="brand">
            <span className="mark">A</span>
            ADGA
          </a>
          <div className="nav-links">
            <a href="/product" className="active">Product</a>
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
        <section className="page-hero">
          <div>
            <div className="eyebrow">
              <span>The Product</span>
              <span className="dot" />
              <span>An object study</span>
            </div>
            <h1>
              Every record,<br />
              <em>opened.</em>
            </h1>
          </div>
          <div>
            <p className="lede">
              Six surfaces, one ledger. Open any lead, any contact, any account — and read the full record, beginning to end.
            </p>
            <div className="actions">
              <a href="/login" className="btn primary lg">Open the ledger</a>
              <a href="/pricing" className="btn lg">See pricing</a>
            </div>
          </div>
        </section>
        {/* Spread 1: Leads */}
        <section className="spread">
          <div className="copy">
            <span className="ed-label">Surface · 01 · Leads</span>
            <h3>The room <em>before</em> the room.</h3>
            <p>Inbound, outbound, and referred prospects entered into one ledger — scored, routed, and converted to a contact the moment they advance.</p>
            <ul>
              <li><span className="n">i.</span><span>Lead score with intent &amp; channel signals</span></li>
              <li><span className="n">ii.</span><span>Automated routing rules by sector, geography, value</span></li>
              <li><span className="n">iii.</span><span>One-click conversion to a contact + account + opportunity</span></li>
              <li><span className="n">iv.</span><span>Inbound source attribution &amp; banker tagging</span></li>
            </ul>
          </div>
          <div className="photo">
            <div className="ph-title">Leads inbox, ranked</div>
            <div className="ph-meta">SCREEN · LEADS · 09:14</div>
          </div>
        </section>
        {/* Spread 2: Contacts & Accounts */}
        <section className="spread flip">
          <div className="copy">
            <span className="ed-label">Surface · 02 · Contacts &amp; Accounts</span>
            <h3>A person, <em>a place,</em> a record.</h3>
            <p>Contacts are people. Accounts are the companies they belong to. Each one carries every touch, every deal, and every purchase from ADGA — for as long as the relationship lasts.</p>
            <ul>
              <li><span className="n">i.</span><span>Linked contact ↔ account structure (Salesforce-aligned)</span></li>
              <li><span className="n">ii.</span><span>Customer status, lifetime value, product holdings</span></li>
              <li><span className="n">iii.</span><span>Relationship map across colleagues, counterparties, bankers</span></li>
              <li><span className="n">iv.</span><span>Custom fields per record, scoped by team</span></li>
            </ul>
          </div>
          <div className="photo">
            <div className="ph-title">Account detail, opened</div>
            <div className="ph-meta">SCREEN · ACCOUNTS · 11:02</div>
          </div>
        </section>
        {/* Spread 3: Pipeline */}
        <section className="spread">
          <div className="copy">
            <span className="ed-label">Surface · 03 · Pipeline</span>
            <h3>The floor, in <em>three views.</em></h3>
            <p>Kanban for hands. Table for eyes. Timeline for the calendar. The same deals, looked at three ways — drag a card, advance a stage, watch the forecast roll.</p>
            <ul>
              <li><span className="n">i.</span><span>Custom pipelines &amp; stages per business line</span></li>
              <li><span className="n">ii.</span><span>Multi-currency roll-up, FX policy on the record</span></li>
              <li><span className="n">iii.</span><span>Weighted forecasting &amp; stage SLA enforcement</span></li>
              <li><span className="n">iv.</span><span>WIP limits, idle-deal nudges, drift detection</span></li>
            </ul>
          </div>
          <div className="preview">
            <div className="frame">
              <div className="ph-title">Pipeline · Kanban · drag &amp; advance</div>
            </div>
            <div className="ph-meta">SCREEN · PIPELINE · 14:08</div>
          </div>
        </section>
        {/* Spread 4: Story */}
        <section className="spread flip">
          <div className="copy">
            <span className="ed-label">Surface · 04 · Story</span>
            <h3>Every touch, in <em>order.</em></h3>
            <p>A river of touchpoints — calls, meetings, notes, voice memos, video clips, documents, signatures — kept in chronological order. Open any record and read its lifetime, beginning to end.</p>
            <ul>
              <li><span className="n">i.</span><span>Vertical timeline with month markers &amp; key-moment cards</span></li>
              <li><span className="n">ii.</span><span>Audio recordings inline, transcribed on capture</span></li>
              <li><span className="n">iii.</span><span>Video clips with marginalia &amp; commentary</span></li>
              <li><span className="n">iv.</span><span>One-tap "add to the story" from any record or call</span></li>
            </ul>
          </div>
          <div className="photo">
            <div className="ph-title">The Story, scrolling</div>
            <div className="ph-meta">SCREEN · STORY · 16:42</div>
          </div>
        </section>
        {/* Spread 5: Deal Rooms */}
        <section className="spread">
          <div className="copy">
            <span className="ed-label">Surface · 05 · Deal Rooms</span>
            <h3>Under <em>glass</em>.</h3>
            <p>Secure rooms per deal — for documents, due-diligence requests, e-signatures, and the people invited to read them. Every viewer audited, every page watermarked, every export logged.</p>
            <ul>
              <li><span className="n">i.</span><span>Structured due-diligence request lists by workstream</span></li>
              <li><span className="n">ii.</span><span>Watermarked viewing &amp; scoped redaction</span></li>
              <li><span className="n">iii.</span><span>External-party access without seat charges</span></li>
              <li><span className="n">iv.</span><span>Native e-signature with execution timestamps on the audit</span></li>
            </ul>
          </div>
          <div className="preview">
            <div className="frame">
              <div className="ph-title">Deal Room · DD checklist · five workstreams</div>
            </div>
            <div className="ph-meta">SCREEN · ROOM · 10:14</div>
          </div>
        </section>
        {/* Spread 6: ADGA */}
        <section className="spread flip">
          <div className="copy">
            <span className="ed-label">Surface · 06 · ADGA</span>
            <h3>The voice on the <em>desk.</em></h3>
            <p>Ask. Speak. Attach. ADGA is the conversational interface to the entire ledger — pulling records onto the screen, drafting outreach, scheduling, listening to your room.</p>
            <ul>
              <li><span className="n">i.</span><span>Type or speak — voice with live transcription</span></li>
              <li><span className="n">ii.</span><span>Open any record from a prompt ("open Meridian story")</span></li>
              <li><span className="n">iii.</span><span>Attach files, reference deals, mention people</span></li>
              <li><span className="n">iv.</span><span>Conversation history, recoverable across sessions</span></li>
            </ul>
          </div>
          <div className="photo">
            <div className="ph-title">ADGA, listening</div>
            <div className="ph-meta">PORTRAIT · WAVEFORM · 09:14</div>
          </div>
        </section>
        {/* CTA */}
        <section className="cta" id="contact">
          <h2>
            Open the<br />
            <em>ledger.</em>
          </h2>
          <div className="right">
            <p>
              A subscription is a relationship. We walk you through every surface, on a working day's notice.
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
