"use client";

import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";

export default function MarketingPage() {
  return (
    <MarketingLayout>
      <div className="wrap">
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
                ADGA keeps<br />
                deal work from<br />
                <em>getting scattered.</em>
              </h1>
              <p className="lede">
                Every lead, contact, meeting, document, decision, task, and agent action belongs to a live execution record, so the next move is visible before it gets missed.
              </p>
              <div className="ctas">
                <a href="/pricing" className="btn primary lg">Get started</a>
                <a href="/login" className="btn lg">Open ADGA</a>
              </div>
              <div className="signin">
                Existing teams · <a href="/login">open ADGA</a>
              </div>
            </div>
            <div className="hero-photo visual-card">
              <img src="/adga/visual-deal-desk.svg" alt="ADGA live execution record with deal, contact, file, and timeline context" />
              <div className="ph-meta">LEAD · CONTACT · DEAL</div>
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
              <div className="photo visual-card">
                <img src="/adga/visual-capture.svg" alt="Lead capture workspace with form, QR, import, and routing signals" />
                <div className="ph-meta">FORM · QR · IMPORT</div>
              </div>
              <span className="ed-label">Lead intake</span>
              <div className="head">Capture the full record.</div>
              <div className="body">Inbound forms, QR links, manual entries, imported lists, urgency, source, date, owner, and next action.</div>
            </div>
            <div className="three-card">
              <div className="photo visual-card">
                <img src="/adga/visual-followup.svg" alt="Follow-up timeline with email, calls, meetings, and voice notes" />
                <div className="ph-meta">EMAIL · SMS · VOICE</div>
              </div>
              <span className="ed-label">Contact work</span>
              <div className="head">Keep the relationship current.</div>
              <div className="body">Calls, messages, voice notes, meeting requests, documents, reminders, and follow-up sequences stay tied to the person.</div>
            </div>
            <div className="three-card">
              <div className="photo visual-card">
                <img src="/adga/visual-execution.svg" alt="Deal execution board with files, terms, approvals, and invoices" />
                <div className="ph-meta">FILES · TERMS · INVOICE</div>
              </div>
              <span className="ed-label">Execution path</span>
              <div className="head">Move the work to close.</div>
              <div className="body">Track the client, internal team, decisions, documents, meetings, approvals, invoices, and payment connectors together.</div>
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
                <li><span className="n">iii.</span><span>Secure deal files, signatures, due-diligence checklists</span><span className="meta">FILES</span></li>
                <li><span className="n">iv.</span><span>Internal and client communication tied to the deal</span><span className="meta">TIMELINE</span></li>
                <li><span className="n">v.</span><span>Voice notes, transcripts, documents, and meeting records</span><span className="meta">MEDIA</span></li>
                <li><span className="n">vi.</span><span>Agent workflows that prepare the next action</span><span className="meta">AGENTS</span></li>
              </ul>
              <div style={{marginTop: 24}}><a href="/pricing" className="btn primary">Get started</a></div>
            </div>
            <div className="preview">
              <div className="frame visual-card">
                <img src="/adga/visual-suite-record.svg" alt="ADGA suite view showing pipeline, documents, contacts, and AI notes in one record" />
                <div className="ph-meta">SCREEN · ADGA · 09:14</div>
              </div>
            </div>
          </div>
        </section>
        {/* ===== Quote / Testimonial ===== */}
        <section className="section">
          <span className="ed-label">Built for deal owners</span>
          <div className="quote" style={{marginTop: 24}}>
            <div className="photo visual-card">
              <img src="/adga/visual-operator.svg" alt="Operator view with meetings, tasks, and deal context" />
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
        <section className="cta" id="start">
          <h2>
            Move every<br />
            <em>deal forward.</em>
          </h2>
          <div className="right">
            <p>
              Choose a plan, verify email, and open the suite built to keep leads, contacts, documents, meetings, and decisions moving toward close.
            </p>
            <div className="cta-steps" aria-label="Start using ADGA">
              <div><span>01</span><b>Choose a plan</b><small>Pick the plan that matches the team and deal volume.</small></div>
              <div><span>02</span><b>Verify email</b><small>Use the magic link to enter the suite after checkout.</small></div>
              <div><span>03</span><b>Move deals forward</b><small>Track leads, contacts, documents, meetings, and deal movement.</small></div>
            </div>
            <div className="ctas">
              <a href="/pricing" className="btn primary lg">Get started</a>
              <a href="/login" className="btn lg">Open ADGA</a>
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
