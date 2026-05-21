"use client";

import React from "react";
import { Icon } from "@/components/adga/shared/Primitives";

export const AGENTS = [
  {
    id: 'margaret',
    name: 'Margaret',
    role: 'Pipeline',
    scope: 'Advances stages, watches SLAs, flags slippage',
    color: '#5b21b6',
    initials: 'M',
    status: 'working',
    statusText: 'Watching 17 active deals · 3 advances pending your review',
  },
  {
    id: 'theo',
    name: 'Theo',
    role: 'Due Diligence',
    scope: 'Reviews DD items, flags legal & financial risks',
    color: '#c47214',
    initials: 'T',
    status: 'working',
    statusText: 'Reviewing §4.3 of Heliograph DA · ETA 8 minutes',
  },
  {
    id: 'liam',
    name: 'Liam',
    role: 'Drafting',
    scope: 'Drafts emails, memos, briefs in your voice',
    color: '#2d4a32',
    initials: 'L',
    status: 'idle',
    statusText: 'Idle · 2 drafts queued for your review',
  },
  {
    id: 'iris',
    name: 'Iris',
    role: 'Call intelligence',
    scope: 'Listens, transcribes, extracts decisions',
    color: '#7a1f1a',
    initials: 'I',
    status: 'listening',
    statusText: 'Live · transcribing your Quorum call',
  },
  {
    id: 'owen',
    name: 'Owen',
    role: 'Operations',
    scope: 'Handoffs, scheduling, admin chores',
    color: '#0e7490',
    initials: 'O',
    status: 'idle',
    statusText: 'Idle · 1 handoff queued',
  },
];

export const PENDING_ACTIONS = [
  {
    id: 'pa-001',
    agent: 'liam',
    type: 'email_draft',
    urgency: 'high',
    target: { type: 'deal', id: 'DEAL-1210', label: 'Meridian Cold Chain — Acquisition' },
    title: 'Reply to Aurore Chastain · §4 working capital',
    proposed: `Hi Aurore,

Thanks for the careful read. Three quick responses, in order:

(1) Working-capital peg — we agree. We'll move from the rolling-average mechanism to a fixed peg at the September close. Maren has signed off.

(2) Earnout EBITDA definition — happy to sharpen. Proposing we use the same definition as §3.2 of the management presentation, which is GAAP-EBITDA less stock-comp and capex. If that works for your team I'll have counsel mark it up by Wednesday.

(3) R&W cap — 13.5% is our floor with insurance backstop. We can walk you through the math on the call.

Wednesday afternoon at 3pm EST works on our end. I'll send the invite.

Best,
Maren`,
    reasoning: 'Aurore raised three §4 items in her email yesterday. Maren signed off on items 1 and 3 in your morning brief; item 2 is consistent with the management deck. Tone matches Maren\'s last 12 replies to Aurore.',
    timeline: 'Send by 11:00 EST · maintains 24h reply SLA',
    created: '4m ago',
  },
  {
    id: 'pa-002',
    agent: 'margaret',
    type: 'stage_advance',
    urgency: 'high',
    target: { type: 'deal', id: 'DEAL-1221', label: 'Bramble & Co — Growth equity' },
    title: 'Advance Bramble to Closing',
    proposed: 'Stage: Negotiation → Closing · Probability: 88% → 92%',
    reasoning: 'Term sheet executed May 2nd. All DD items cleared. Signing scheduled Friday May 23rd. The deal has been sitting in Negotiation past its 14-day SLA. Recommended move.',
    timeline: 'Apply immediately',
    created: '12m ago',
  },
  {
    id: 'pa-003',
    agent: 'theo',
    type: 'risk_flag',
    urgency: 'high',
    target: { type: 'deal', id: 'DEAL-1219', label: 'Halcyon Payments — Buyout' },
    title: 'Flag: customer concentration risk (top 3 = 47%)',
    proposed: 'Add to deal risks · notify Maren and Hana · request seller breakdown by tier',
    reasoning: 'Just finished reviewing the audited financials. Top 3 merchants = 47% of GMV. Above your 35% threshold. Pricing implication estimated at $4-7M reduction. Recommend flagging before Friday\'s SC.',
    timeline: 'Flag now · request breakdown by EOD',
    created: '34m ago',
  },
  {
    id: 'pa-004',
    agent: 'owen',
    type: 'meeting_schedule',
    urgency: 'med',
    target: { type: 'deal', id: 'DEAL-1213', label: 'Quorum Energy — JV' },
    title: 'Schedule JV term sheet review with Magnus Bell',
    proposed: 'Thursday May 22 · 14:00 EST · 60min · Zoom · attendees: Maren, Aisha, Magnus Bell, Quorum counsel',
    reasoning: 'Magnus replied to our outreach yesterday — proposed "next week." This slot works for all parties based on calendar availability. Quorum has not responded to the term sheet sent April 28th; this re-opens the dialogue.',
    timeline: 'Send invite if approved',
    created: '52m ago',
  },
  {
    id: 'pa-005',
    agent: 'liam',
    type: 'memo_draft',
    urgency: 'med',
    target: { type: 'deal', id: 'DEAL-1210', label: 'Meridian Cold Chain' },
    title: 'Working capital memo · v2 for SC review',
    proposed: '12-page memo covering: peg mechanism, $14M adjustment in our favor, sensitivity table, recommended floor & ceiling. Draft attached for review.',
    reasoning: 'You asked for a SC-ready memo by Friday. Pulled the numbers from Theo\'s DD output and the working model. Format matches your last memo to the SC (Tessellate, April).',
    timeline: 'Memo ready for review · 8 minutes to read',
    created: '1h ago',
  },
  {
    id: 'pa-006',
    agent: 'margaret',
    type: 'idle_nudge',
    urgency: 'med',
    target: { type: 'deal', id: 'DEAL-1208', label: 'Northbound Therapeutics' },
    title: 'Idle 9 days · suggest disposition decision',
    proposed: 'Propose: (a) reach out to Dr. Reyes, (b) downgrade probability to 25%, or (c) park deal in cold pipeline',
    reasoning: 'No activity for 9 days. Probability still at 45% but trending stale. Northbound\'s competing process likely advancing. Either we engage this week or we should park it.',
    timeline: 'Decision needed today',
    created: '2h ago',
  },
  {
    id: 'pa-007',
    agent: 'iris',
    type: 'call_summary',
    urgency: 'low',
    target: { type: 'deal', id: 'DEAL-1218', label: 'Tessellate Robotics' },
    title: 'Call summary · CFO sync · 22 min',
    proposed: 'Decisions: (1) cap table reflects new SAFE conversions, (2) Series B closes June 28, (3) board observer seat goes to Maren. Three action items extracted.',
    reasoning: 'Listened on the call this morning. Extracted decisions and assigned action items based on speakers. Confidence: high. Ready to file under the deal Story.',
    timeline: 'File when approved',
    created: '3h ago',
  },
  {
    id: 'pa-008',
    agent: 'owen',
    type: 'handoff',
    urgency: 'low',
    target: { type: 'deal', id: 'DEAL-1220', label: 'Driftless Studios — Won' },
    title: 'Hand off to Operations team for post-close',
    proposed: 'Pass DEAL-1220 to Operations · transfer ownership · create 30/60/90 onboarding tasks',
    reasoning: 'Deal moved to Won 8 hours ago. Standard playbook: hand off to Ops for post-close onboarding. Saves you the manual step.',
    timeline: 'Apply when approved',
    created: '8h ago',
  },
];

export const AGENT_HISTORY = [
  { agent: 'margaret', action: 'Advanced',  target: 'DEAL-1221', detail: 'Negotiation → Closing',           when: '12m ago', approver: 'Maren', icon: '✓' },
  { agent: 'liam',     action: 'Sent',       target: 'DEAL-1218', detail: 'Cap table follow-up to CFO',       when: '34m ago', approver: 'Maren', icon: '✓' },
  { agent: 'theo',     action: 'Filed',      target: 'DEAL-1207', detail: '§4.3 clearance memo · 2 pages',    when: '1h ago',  approver: 'Maren', icon: '✓' },
  { agent: 'iris',     action: 'Transcribed',target: 'DEAL-1213', detail: 'Quorum call · 47 min',             when: '2h ago',  approver: 'Auto',  icon: '◉' },
  { agent: 'owen',     action: 'Scheduled',  target: 'DEAL-1210', detail: 'Mgmt presentation · Wed 3pm',      when: '3h ago',  approver: 'Maren', icon: '✓' },
  { agent: 'liam',     action: 'Drafted',    target: 'DEAL-1219', detail: 'Customer-ref talking points · v2', when: '5h ago',  approver: 'Edited', icon: '✎' },
  { agent: 'margaret', action: 'Flagged',    target: 'DEAL-1217', detail: 'Stage SLA exceeded · 14d',         when: '8h ago',  approver: 'Maren', icon: '⚑' },
  { agent: 'theo',     action: 'Approved',   target: 'DEAL-1218', detail: 'DD F-01 audited financials · clear',when: '1d ago', approver: 'Maren', icon: '✓' },
];

export const AGENT_FEED = [
  { agent: 'theo',     verb: 'Reviewing',    target: 'Heliograph §4.3',      tag: 'live', eta: '8 min remaining' },
  { agent: 'iris',     verb: 'Transcribing', target: 'Quorum call',          tag: 'live', eta: 'Now · 23 min in' },
  { agent: 'margaret', verb: 'Watching',     target: '17 active deals',      tag: 'live', eta: 'Continuous' },
  { agent: 'liam',     verb: 'Drafted',      target: 'Reply to Aurore',      tag: 'pending', eta: '4 min ago' },
  { agent: 'theo',     verb: 'Flagged',      target: 'Halcyon concentration',tag: 'pending', eta: '34 min ago' },
  { agent: 'owen',     verb: 'Proposed',     target: 'Schedule Magnus',      tag: 'pending', eta: '52 min ago' },
];

export const agentOf = (id: string) => AGENTS.find(a => a.id === id) || AGENTS[0];

async function recordApprovalDecision(item: any, status: string, proposedAction: string) {
  const create = await fetch('/api/agent/approvals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent: item.agent,
      title: item.title,
      proposed_action: proposedAction || item.proposed,
      risk: item.urgency === 'med' ? 'medium' : item.urgency,
      resource_type: item.target?.id?.startsWith('DEAL') ? 'deal' : 'suite_item',
      resource_id: item.target?.id || item.id,
      payload: {
        target: item.target,
        reasoning: item.reasoning,
        timeline: item.timeline,
      },
    }),
  });
  if (!create.ok) return null;
  const data = await create.json();
  if (!data?.approval?.id) return data;
  const patch = await fetch(`/api/agent/approvals/${data.approval.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status,
      proposed_action: proposedAction || item.proposed,
      payload: { source_pending_id: item.id },
    }),
  });
  return patch.ok ? patch.json() : data;
}

export function AgentConsole({ state, setState, collapsed, setCollapsed, onWorkflow, deals }: any) {
  const [tab, setTab] = React.useState('live');
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const taRef = React.useRef<HTMLTextAreaElement>(null);

  if (collapsed) {
    return <aside className="voice collapsed" data-state={state} aria-hidden="true"/>;
  }

  const pending = PENDING_ACTIONS;

  return (
    <aside className="voice agent-console" data-state={state}>
      {/* Header */}
      <div className="ac-h">
        <div className="ac-h-title">
          <span className="ac-pulse"/>
          <span>The Room</span>
          <span className="ac-h-state">{AGENTS.filter(a => a.status === 'working' || a.status === 'listening').length} working</span>
        </div>
        <div className="voice-tools">
          <button
            className="composer-tool"
            type="button"
            onClick={() => setComposeOpen(o => !o)}
            title="Speak to the room"
            aria-label="Speak"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>
            </svg>
          </button>
          <button
            className="composer-tool"
            type="button"
            onClick={() => setCollapsed(true)}
            title="Hide"
            aria-label="Hide"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      {/* Agent roster strip */}
      <div className="ac-roster">
        {AGENTS.map(a => {
          const pendingCount = pending.filter(p => p.agent === a.id).length;
          return (
            <div key={a.id} className="ac-agent" title={`${a.name} · ${a.role}`}>
              <div className="ac-agent-av" style={{background: a.color}}>{a.initials}</div>
              <div className="ac-agent-meta">
                <div className="ac-agent-name">{a.name}</div>
                <div className="ac-agent-role">{a.role}</div>
              </div>
              <div className={'ac-agent-st st-' + a.status}>
                {a.status === 'listening' ? '● Live' : a.status === 'working' ? '● Working' : '○ Idle'}
              </div>
              {pendingCount > 0 && <span className="ac-agent-badge">{pendingCount}</span>}
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="ac-tabs">
        <button className={'ac-tab ' + (tab === 'live' ? 'active' : '')} type="button" onClick={() => setTab('live')}>
          Live
        </button>
        <button className={'ac-tab ' + (tab === 'pending' ? 'active' : '')} type="button" onClick={() => setTab('pending')}>
          Pending <span className="ac-tab-count">{pending.length}</span>
        </button>
        <button className={'ac-tab ' + (tab === 'history' ? 'active' : '')} type="button" onClick={() => setTab('history')}>
          History
        </button>
      </div>

      {/* Body */}
      <div className="ac-body">
        {tab === 'live'    && <AgentLive/>}
        {tab === 'pending' && <AgentPending compact onWorkflow={onWorkflow} deals={deals}/>}
        {tab === 'history' && <AgentHistory/>}
      </div>

      {/* Speak panel */}
      {composeOpen && (
        <div className="ac-speak">
          <div className="ac-speak-h">
            <span className="ed-tag">Speak to the room</span>
            <button className="btn ghost sm" type="button" onClick={() => setComposeOpen(false)}>Close</button>
          </div>
          <textarea
            ref={taRef}
            placeholder="Tell the room what to do. They'll draft an action you can review."
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={3}
          />
          <div className="ac-speak-foot">
            <span className="ed-tag">Routes to · <b style={{color:'var(--text)'}}>{routeAgent(draft)}</b></span>
            <button
              className="btn primary sm"
              type="button"
              onClick={() => { setDraft(''); setComposeOpen(false); setTab('pending'); }}
            >
              <Icon name="send" size={12}/> Queue
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

function routeAgent(text: string) {
  const t = (text || '').toLowerCase();
  if (t.includes('draft') || t.includes('email') || t.includes('reply') || t.includes('memo')) return 'Liam · drafting';
  if (t.includes('schedule') || t.includes('meeting') || t.includes('handoff')) return 'Owen · operations';
  if (t.includes('flag') || t.includes('risk') || t.includes('dd') || t.includes('diligence')) return 'Theo · DD';
  if (t.includes('listen') || t.includes('call') || t.includes('record')) return 'Iris · call intelligence';
  return 'Margaret · pipeline';
}

function AgentLive() {
  return (
    <div className="ac-live">
      <div className="ac-section-h">
        <span className="ed-tag">Live activity</span>
        <span className="ed-tag" style={{color:'var(--text-3)'}}>Real-time</span>
      </div>
      {AGENT_FEED.map((f, i) => {
        const a = agentOf(f.agent);
        return (
          <div key={i} className={'ac-feed-card ' + f.tag}>
            <div className="ac-feed-avatar" style={{background: a.color}}>{a.initials}</div>
            <div className="ac-feed-body">
              <div className="ac-feed-line">
                <b>{a.name}</b>
                <span style={{color:'var(--text-3)'}}> · {a.role.toLowerCase()}</span>
              </div>
              <div className="ac-feed-verb">{f.verb} <b>{f.target}</b></div>
              <div className="ac-feed-eta">{f.eta}</div>
            </div>
            {f.tag === 'live' && <span className="ac-live-dot"/>}
          </div>
        );
      })}

      <div className="ac-promote">
        <div className="ed-tag" style={{marginBottom:8}}>Waiting on you</div>
        <div className="ac-promote-list">
          {PENDING_ACTIONS.filter(p => p.urgency === 'high').slice(0, 2).map(p => {
            const a = agentOf(p.agent);
            return (
              <div key={p.id} className="ac-promote-card">
                <div className="ac-promote-h">
                  <div className="ac-feed-avatar" style={{background: a.color}}>{a.initials}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12.5,fontWeight:500}}>{p.title}</div>
                    <div style={{fontSize:11.5,color:'var(--text-3)'}}>{a.name} · {p.target.id}</div>
                  </div>
                  <span className="ac-urg-dot" data-urgency={p.urgency}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AgentPending({ compact, onWorkflow, deals }: any) {
  const [editing, setEditing] = React.useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [decided, setDecided] = React.useState<Record<string, string>>({});

  const decide = (item: any, verdict: string) => {
    setDecided(d => ({ ...d, [item.id]: verdict }));
    recordApprovalDecision(item, verdict === 'approved' ? 'approved' : 'rejected', drafts[item.id] || item.proposed).catch(() => {});
  };
  const startEdit = (id: string, current: string) => {
    setEditing(e => ({ ...e, [id]: true }));
    setDrafts(d => ({ ...d, [id]: current }));
  };

  const visible = PENDING_ACTIONS.filter(p => !decided[p.id]);

  return (
    <div className="ac-pending">
      <div className="ac-section-h">
        <span className="ed-tag">{visible.length} waiting · sorted by urgency</span>
        <button className="btn ghost sm" type="button">Bulk approve safe</button>
      </div>

      {visible.map(p => {
        const a = agentOf(p.agent);
        const isEditing = editing[p.id];
        const draft = drafts[p.id] !== undefined ? drafts[p.id] : p.proposed;
        return (
          <div key={p.id} className="ac-card" data-urgency={p.urgency}>
            <div className="ac-card-h">
              <div className="ac-feed-avatar" style={{background: a.color}}>{a.initials}</div>
              <div style={{flex:1,minWidth:0}}>
                <div className="ac-card-author">
                  <b>{a.name}</b>
                  <span style={{color:'var(--text-3)'}}> · {a.role.toLowerCase()}</span>
                  <span className="ac-urg-dot" data-urgency={p.urgency}/>
                  <span className="ed-tag" style={{marginLeft:'auto',color:'var(--text-3)'}}>{p.created}</span>
                </div>
                <div className="ac-card-title">{p.title}</div>
                <div className="ac-card-target mono">{p.target.id} · {p.target.label}</div>
              </div>
            </div>

            <div className="ac-card-section">
              <div className="ed-tag">Proposed</div>
              {isEditing ? (
                <textarea
                  className="ac-card-edit"
                  value={draft}
                  onChange={e => setDrafts(d => ({ ...d, [p.id]: e.target.value }))}
                  rows={Math.min(14, draft.split('\n').length + 1)}
                />
              ) : (
                <div className="ac-card-proposed">{draft}</div>
              )}
            </div>

            <div className="ac-card-section">
              <div className="ed-tag">Why · {a.name}'s reasoning</div>
              <div className="ac-card-reasoning">{p.reasoning}</div>
            </div>

            <div className="ac-card-meta">
              <span className="ed-tag">Timing</span>
              <span>{p.timeline}</span>
            </div>

            <div className="ac-card-actions">
              {isEditing ? (
                <>
                  <button className="btn" type="button" onClick={() => setEditing(e => ({ ...e, [p.id]: false }))}>Cancel</button>
                  <button className="btn primary" type="button" onClick={() => { setEditing(e => ({ ...e, [p.id]: false })); decide(p, 'approved'); }}>
                    <Icon name="check" size={13}/> Save &amp; approve
                  </button>
                </>
              ) : (
                <>
                  <button className="btn ghost" type="button" onClick={() => decide(p, 'rejected')}>Reject</button>
                  <button className="btn" type="button" onClick={() => startEdit(p.id, p.proposed)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                    Edit
                  </button>
                  <button className="btn primary" type="button" onClick={() => decide(p, 'approved')}>
                    <Icon name="check" size={13}/> Approve
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}

      {visible.length === 0 && (
        <div className="ac-empty">
          <div style={{fontFamily:'var(--font-serif)',fontSize:22,fontStyle:'italic',color:'var(--text-2)',marginBottom:6}}>The room is settled.</div>
          <div className="text-sm muted">No actions are waiting on you right now.</div>
        </div>
      )}
    </div>
  );
}

function AgentHistory() {
  return (
    <div className="ac-history">
      <div className="ac-section-h">
        <span className="ed-tag">Today · {AGENT_HISTORY.length} actions taken</span>
      </div>
      {AGENT_HISTORY.map((h, i) => {
        const a = agentOf(h.agent);
        return (
          <div key={i} className="ac-h-row">
            <div className="ac-feed-avatar sm" style={{background: a.color}}>{a.initials}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13}}><b>{a.name}</b> {h.action.toLowerCase()} <span className="mono muted">{h.target}</span></div>
              <div style={{fontSize:11.5,color:'var(--text-3)'}}>{h.detail}</div>
            </div>
            <div style={{textAlign:'right',fontSize:11,color:'var(--text-3)'}}>
              <div>{h.when}</div>
              <div style={{fontFamily:'var(--font-mono)',letterSpacing:'.1em'}}>{h.icon} {h.approver}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
