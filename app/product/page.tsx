"use client";

import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";

export default function ProductPage() {
  return (
    <MarketingLayout>
      <div className="wrap">
        <section className="page-hero">
          <div>
            <div className="eyebrow">
              <span>The Product</span>
              <span className="dot" />
              <span>Deal Execution</span>
            </div>
            <h1>
              One suite,<br />
              <em>one record.</em>
            </h1>
          </div>
          <div>
            <p className="lede">
              A connected workspace for every person, company, touch, meeting, file, invoice, and next action behind a deal.
            </p>
            <div className="actions">
              <a href="/pricing" className="btn primary lg">Start closing deals</a>
              <a href="/login" className="btn lg">Sign in</a>
            </div>
          </div>
        </section>

        {/* Spread 1: Leads */}
        <section className="spread">
          <div className="copy">
            <span className="ed-label">01 · Leads</span>
            <h3>Capture the <em>entire</em> record.</h3>
            <p>Inbound, outbound, and referred prospects are scored, routed, and converted to a contact the moment they advance.</p>
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
            <span className="ed-label">02 · Contacts &amp; Accounts</span>
            <h3>A person, <em>a place,</em> a record.</h3>
            <p>Contacts are people. Accounts are the companies they belong to. Each one carries every touch, every deal, and every purchase from ADGA — for as long as the relationship lasts.</p>
            <ul>
              <li><span className="n">i.</span><span>Linked contact ↔ account structure</span></li>
              <li><span className="n">ii.</span><span>Customer status, lifetime value, product holdings</span></li>
              <li><span className="n">iii.</span><span>Relationship map across colleagues, counterparties</span></li>
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
            <span className="ed-label">03 · Pipeline</span>
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

        {/* Spread 4: Timeline */}
        <section className="spread flip">
          <div className="copy">
            <span className="ed-label">04 · Execution Timeline</span>
            <h3>Every touch, in <em>order.</em></h3>
            <p>A river of touchpoints — calls, meetings, notes, voice memos, video clips, documents, signatures — kept in chronological order. Open any record and read its lifetime, beginning to end.</p>
            <ul>
              <li><span className="n">i.</span><span>Vertical timeline with month markers</span></li>
              <li><span className="n">ii.</span><span>Audio recordings inline, transcribed on capture</span></li>
              <li><span className="n">iii.</span><span>Video clips with marginalia &amp; commentary</span></li>
              <li><span className="n">iv.</span><span>One-tap "add to the timeline" from any record</span></li>
            </ul>
          </div>
          <div className="photo">
            <div className="ph-title">The Timeline, scrolling</div>
            <div className="ph-meta">SCREEN · TIMELINE · 16:42</div>
          </div>
        </section>

        {/* Spread 5: Deal Files */}
        <section className="spread">
          <div className="copy">
            <span className="ed-label">05 · Deal Files</span>
            <h3>Secure <em>collaboration</em>.</h3>
            <p>Secure files per deal — for documents, due-diligence requests, e-signatures, and the people invited to read them. Every viewer audited, every page watermarked, every export logged.</p>
            <ul>
              <li><span className="n">i.</span><span>Structured due-diligence request lists</span></li>
              <li><span className="n">ii.</span><span>Watermarked viewing &amp; scoped redaction</span></li>
              <li><span className="n">iii.</span><span>External-party access without seat charges</span></li>
              <li><span className="n">iv.</span><span>Native e-signature with execution timestamps</span></li>
            </ul>
          </div>
          <div className="preview">
            <div className="frame">
              <div className="ph-title">Deal Files · DD checklist · five workstreams</div>
            </div>
            <div className="ph-meta">SCREEN · FILES · 10:14</div>
          </div>
        </section>

        {/* Spread 6: ADGA */}
        <section className="spread flip">
          <div className="copy">
            <span className="ed-label">06 · ADGA Agents</span>
            <h3>The AI on the <em>desk.</em></h3>
            <p>Ask. Speak. Attach. ADGA is the conversational interface to the entire workspace — pulling records onto the screen, drafting outreach, scheduling, and capturing voice notes.</p>
            <ul>
              <li><span className="n">i.</span><span>Type or speak — voice with live transcription</span></li>
              <li><span className="n">ii.</span><span>Open any record from a prompt ("open Meridian")</span></li>
              <li><span className="n">iii.</span><span>Attach files, reference deals, mention people</span></li>
              <li><span className="n">iv.</span><span>Conversation history, recoverable across sessions</span></li>
            </ul>
          </div>
          <div className="photo">
            <div className="ph-title">ADGA, listening</div>
            <div className="ph-meta">PORTRAIT · WAVEFORM · 09:14</div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
