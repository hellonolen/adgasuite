"use client";

import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";

export default function MarketingPage() {
  return (
    <MarketingLayout>
      <div className="wrap">
        {/* ===== Hero ===== */}
        <section className="hero">
          <div className="meta">
            <span>Deal execution platform</span>
            <span className="dot" />
            <span>Records · Calls · Documents</span>
            <span className="dot" />
            <span>Agentic deal flow</span>
          </div>
          <div className="hero-grid">
            <div>
              <h1>
                Your organized<br />
                deal flow from lead<br />
                to close, <em>then repeat.</em>
              </h1>
              <p className="lede">
                ADGA gives every lead, contact, call, document, meeting, task, payment, and next action a place in the deal process so teams can move from first signal to repeat purchase.
              </p>
              <div className="ctas">
                <a href="/pricing" className="btn primary lg">Start closing deals</a>
              </div>
              <div className="hero-proof" aria-label="ADGA operating proof">
                <div><b>01</b><span>Capture the record</span><small>Lead source, contact, company, urgency, owner, and route.</small></div>
                <div><b>02</b><span>Move the work</span><small>Calls, notes, files, tasks, approvals, calendar, and follow-up.</small></div>
                <div><b>03</b><span>Protect the close</span><small>Every decision, file, commitment, and next move remains attached to the deal.</small></div>
              </div>
            </div>
            <div className="hero-photo visual-card">
              <img src="/adga/visual-deal-desk.svg" alt="ADGA live execution record with deal, contact, file, and timeline context" />
              <div className="ph-meta">LEAD · CONTACT · DEAL</div>
            </div>
          </div>
          <div className="hero-command">
            <div>
              <span>Live pipeline</span>
              <b>$284.6M weighted</b>
              <small>Deal movement, stage risk, next meetings, and missing follow-up surfaced before the close slips.</small>
            </div>
            <div>
              <span>Contact memory</span>
              <b>Every touch attached</b>
              <small>Calls, voice notes, transcripts, documents, and decisions stay tied to the contact and company.</small>
            </div>
            <div>
              <span>Next action prep</span>
              <b>Next action ready</b>
              <small>ADGA prepares briefs, drafts outreach, queues tasks, and keeps judgment calls in front of the team.</small>
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
        {/* ===== Deal process ===== */}
        <section className="section process-section" id="deal-process">
          <span className="ed-label">Deal process</span>
          <div className="process-head">
            <h2 className="title">From signal to repeat purchase.</h2>
            <p>
              ADGA gives every deal a visible path, whether it starts as a new lead, an imported opportunity, a call, an email thread, or an existing pipeline record.
            </p>
          </div>
          <div className="process-rail" aria-label="ADGA deal process">
            {[
              ["01", "Signal", "Ad, referral, inbound form, QR, call, email, event, partner, or import."],
              ["02", "Capture", "Create or match the contact, company, source, owner, urgency, and first next action."],
              ["03", "Qualify", "Confirm fit, timing, value, authority, blockers, and reason to keep moving."],
              ["04", "Shape", "Define the offer, terms, stakeholders, files, close date, and meeting plan."],
              ["05", "Advance", "Run follow-up, calls, documents, objections, tasks, and commitments."],
              ["06", "Close", "Track signature, purchase, payment, decision record, and final handoff."],
              ["07", "Deliver", "Move from closed deal to onboarding, milestones, support route, and ownership."],
              ["08", "Expand", "Identify renewal, repeat purchase, referral, upsell, cross-sell, or partner path."]
            ].map(([num, label, body]) => (
              <div className="process-step" key={num}>
                <span>{num}</span>
                <b>{label}</b>
                <small>{body}</small>
              </div>
            ))}
          </div>
        </section>
        {/* ===== Activation ===== */}
        <section className="section activation-section" id="activation">
          <span className="ed-label">Workspace activation</span>
          <div className="activation-head">
            <h2 className="title">Set up the deal desk. Do the work.</h2>
            <p>
              ADGA should not be treated like a passive trial. The first week is an activation path that gets real deals, contacts, documents, and next actions into motion.
            </p>
          </div>
          <div className="activation-list" aria-label="Seven-step ADGA onboarding checklist">
            {[
              ["01", "Import or create deals", "Bring in active deals, old pipeline, or the first opportunity from a lead."],
              ["02", "Connect contacts and companies", "Attach the people, accounts, decision makers, and relationship context."],
              ["03", "Attach documents and notes", "Bring in proposals, contracts, voice notes, transcripts, folders, and files."],
              ["04", "Set stages and close paths", "Place each deal in Signal, Capture, Qualify, Shape, Advance, Close, Deliver, or Expand."],
              ["05", "Create next actions", "Assign the call, meeting, document, follow-up, task, or payment step that moves the deal."],
              ["06", "Review risk and blockers", "Identify missing data, no-response risk, stalled movement, unsigned files, and close-date drift."],
              ["07", "Run the weekly close plan", "Use the workspace to move priority deals, protect commitments, and surface expansion paths."]
            ].map(([num, label, body]) => (
              <div className="activation-row" key={num}>
                <span>{num}</span>
                <b>{label}</b>
                <small>{body}</small>
              </div>
            ))}
          </div>
        </section>
        {/* ===== Use cases ===== */}
        <section className="section usecase-section" id="use-cases">
          <span className="ed-label">Use cases</span>
          <div className="process-head">
            <h2 className="title">Different deals. One operating path.</h2>
            <p>
              ADGA is built around the anatomy of a deal, so the same system can support high-value commercial work across categories.
            </p>
          </div>
          <div className="usecase-grid">
            {[
              ["Capital raise", "Track investor contacts, diligence files, commitments, follow-up, and closing timeline."],
              ["Acquisition", "Keep buyer, seller, advisors, documents, approvals, meetings, and terms in one record."],
              ["Partnership", "Move introductions, stakeholders, commercial terms, documents, and launch steps forward."],
              ["Licensing", "Manage rights, counterparties, term sheets, review cycles, signatures, and renewal paths."],
              ["Procurement", "Track vendors, quotes, decision criteria, approvals, contracts, payments, and delivery."],
              ["High-ticket sales", "Turn qualified interest into calls, proposals, follow-up, close, delivery, and expansion."]
            ].map(([label, body]) => (
              <div className="usecase-card" key={label}>
                <b>{label}</b>
                <small>{body}</small>
              </div>
            ))}
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
                ADGA gives owners and teams a connected workspace for every person, company, touch, meeting, file, invoice, and next action behind a deal.
              </p>
              <ul>
                <li><span className="n">i.</span><span>Leads recorded with source, urgency, date, and owner</span><span className="meta">PIPELINE</span></li>
                <li><span className="n">ii.</span><span>Contacts &amp; accounts, with every touch on file</span><span className="meta">CRM</span></li>
                <li><span className="n">iii.</span><span>Secure deal files, signatures, due-diligence checklists</span><span className="meta">FILES</span></li>
                <li><span className="n">iv.</span><span>Internal and client communication tied to the deal</span><span className="meta">TIMELINE</span></li>
                <li><span className="n">v.</span><span>Voice notes, transcripts, documents, and meeting records</span><span className="meta">MEDIA</span></li>
                <li><span className="n">vi.</span><span>Next-step workflows that prepare the close</span><span className="meta">FLOW</span></li>
              </ul>
              <div style={{marginTop: 24}}><a href="/pricing" className="btn primary">Start closing deals</a></div>
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
              <div className="head">Deal work keeps moving.</div>
              <div className="body">ADGA prepares follow-up, surfaces open items, and keeps each deal moving toward the next action.</div>
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
              <a href="/pricing" className="btn primary lg">Start closing deals</a>
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
