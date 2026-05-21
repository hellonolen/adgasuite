"use client";

import React from "react";
import { Icon, companyOf } from "@/components/adga/shared/Primitives";

const SAMPLE_HISTORY = [
  { id: 'c-201', title: 'Meridian Cold Chain — closing memo',  when: '09:14', active: true },
  { id: 'c-200', title: 'Forecast slipping risks',              when: 'Yesterday' },
  { id: 'c-199', title: 'Quorum JV term sheet review',          when: 'Yesterday' },
  { id: 'c-198', title: 'Q2 weighted pipeline breakdown',       when: 'Mon' },
  { id: 'c-197', title: 'Outreach draft — Northbound',          when: 'Mon' },
  { id: 'c-196', title: 'DD §4.3 Heliograph',                   when: 'Fri' },
  { id: 'c-195', title: 'Banker performance · TTM',             when: 'Apr 30' },
  { id: 'c-194', title: 'Cap table reconciliation',             when: 'Apr 28' },
  { id: 'c-193', title: 'Customer references for Halcyon',      when: 'Apr 22' },
];

const VOICE_TRANSCRIPT = [
  { who: 'agent', text: 'Morning Maren. You have 3 deals advancing today — Bramble entered Closing, Tessellate has a signature request open, and Meridian needs your sign-off on the working capital memo.' },
  { who: 'user',  text: 'What\'s the total weighted pipeline this quarter?' },
  { who: 'agent', text: '$284.6M weighted across 17 active deals. That\'s up 11% from last week, mostly from Meridian moving to Closing. Want me to pull the breakdown by stage?', cite: 'forecast/Q2-2026' },
  { who: 'user',  text: 'No — flag anything that\'s slipping.' },
  { who: 'agent', text: 'Two flags: Northbound Therapeutics has been in Discovery for 41 days with no activity in 9. And Quorum Energy hasn\'t responded to the JV term sheet sent April 28th. Want me to draft outreach?' },
];

function parseWorkflow(text: string, deals: any[]) {
  const t = text.toLowerCase();
  const moduleMatch: Record<string, string[]> = {
    pipeline: ['pipeline', 'kanban', 'board'],
    leads: ['lead', 'prospect'],
    crm: ['contact', 'company', 'companies', 'crm'],
    documents: ['document', 'docs', 'files', 'vdr', 'deal room'],
    knowledge: ['knowledge', 'playbook', 'template', 'sop'],
    intelligence: ['intelligence', 'forecast', 'analytics', 'risk'],
    reports: ['report', 'dashboard'],
    tasks: ['task', 'todo', 'checklist'],
    calendar: ['calendar', 'meeting', 'schedule', 'call', 'availability', 'agenda'],
    inbox: ['inbox', 'mail', 'message'],
    story: ['story', 'timeline', 'history', 'history of', 'mind map'],
    home: ['home', 'today', 'morning'],
    billing: ['billing', 'plan', 'invoice'],
    admin: ['admin', 'permission', 'audit'],
    settings: ['setting', 'profile'],
  };

  const dealMatch = deals.find(d => {
    const short = d.name.split(' — ')[0].toLowerCase();
    const co = (companyOf(d.company)?.name || '').toLowerCase();
    return t.includes(short.split(' ')[0]) || t.includes(co.split(' ')[0]);
  });

  const idMatch = t.match(/deal[\s-]?(\d+)/);

  if (idMatch) {
    const id = 'DEAL-' + idMatch[1].padStart(4, '0');
    const d = deals.find(x => x.id === id);
    if (d) return { type: 'open-deal', deal: d };
  }
  if (dealMatch && (t.includes('story') || t.includes('history') || t.includes('timeline'))) {
    return { type: 'story', dealId: dealMatch.id };
  }
  if (dealMatch && (t.includes('open') || t.includes('show') || t.includes('pull'))) {
    return { type: 'open-deal', deal: dealMatch };
  }
  for (const [route, words] of Object.entries(moduleMatch)) {
    if (words.some(w => t.includes(w))) return { type: 'route', route };
  }
  if (dealMatch) return { type: 'open-deal', deal: dealMatch };
  return null;
}

function routeAgentKey(text: string) {
  const t = (text || '').toLowerCase();
  if (t.includes('invoice') || t.includes('payment') || t.includes('payout') || t.includes('bank') || t.includes('subscription')) return 'payments';
  if (t.includes('sms') || t.includes('email') || t.includes('message') || t.includes('call') || t.includes('voice') || t.includes('meeting') || t.includes('invite')) return 'communication';
  if (t.includes('document') || t.includes('proposal') || t.includes('contract') || t.includes('memo') || t.includes('file')) return 'documents';
  if (t.includes('risk') || t.includes('market') || t.includes('battlecard') || t.includes('research') || t.includes('forecast')) return 'intelligence';
  if (t.includes('lead') || t.includes('follow') || t.includes('deal') || t.includes('pipeline')) return 'sales';
  if (t.includes('calendar') || t.includes('task') || t.includes('setup') || t.includes('remind')) return 'operations';
  return 'conductor';
}

function routeAgentLabel(agent: string) {
  const labels: Record<string, string> = {
    conductor: 'Conductor',
    sales: 'Sales',
    intelligence: 'Intelligence',
    documents: 'Documents',
    operations: 'Operations',
    communication: 'Communication',
    payments: 'Payments',
  };
  return labels[agent] || 'Conductor';
}

export function ADGAPanel({ state, setState, collapsed, setCollapsed, onWorkflow, deals }: any) {
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [draft, setDraft] = React.useState('');
  const [attachments, setAttachments] = React.useState<any[]>([]);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [activeChat, setActiveChat] = React.useState(SAMPLE_HISTORY[0].id);
  const [messages, setMessages] = React.useState(VOICE_TRANSCRIPT);

  React.useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, state]);

  const autosize = () => {
    if (!taRef.current) return;
    taRef.current.style.height = 'auto';
    taRef.current.style.height = Math.min(220, taRef.current.scrollHeight) + 'px';
  };
  React.useEffect(() => { autosize(); }, [draft]);

  const send = async () => {
    const text = draft.trim();
    if (!text && attachments.length === 0) return;
    const userMsg = { who: 'user', text: text || '[attachments]' };
    setMessages(m => [...m, userMsg]);
    setDraft('');
    setAttachments([]);
    setState('working');

    const action = parseWorkflow(text, deals || []);
    let agentReply: any;
    if (action?.type === 'open-deal') {
      agentReply = { who: 'agent', text: `Opening “${(action.deal as any).name.split(' — ')[0]}.” Loading the file on your desk now.`, cite: (action.deal as any).id };
    } else if (action?.type === 'story') {
      const d = (deals || []).find(x => x.id === action.dealId);
      agentReply = { who: 'agent', text: `Pulling the full story for ${d?.name.split(' — ')[0]}. Every touch, in order.`, cite: action.dealId };
    } else if (action?.type === 'route') {
      agentReply = { who: 'agent', text: `Bringing up ${action.route} for you.`, cite: 'workflow/route' };
    } else {
      agentReply = { who: 'agent', text: 'Working on that — pulling the relevant deals and surfacing context now.', cite: 'context/active-pipeline' };
    }

    try {
      const response = await fetch('/api/agent/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: routeAgentKey(text),
          job_type: 'suite.agent_command',
          prompt: text || 'Process attached files.',
          context: {
            workflow_action: action,
            attachment_count: attachments.length,
          },
        }),
      });
      const result = await response.json();
      const summary = result?.output?.summary || result?.job?.output?.summary;
      if (summary) {
        agentReply = {
          who: 'agent',
          text: summary,
          cite: result?.job?.id || agentReply.cite || 'agent/job',
        };
      }
    } catch (e) {
      agentReply = {
        ...agentReply,
        cite: agentReply.cite || 'local/workflow',
      };
    }

    setTimeout(() => {
      setMessages(m => [...m, agentReply]);
      setState('idle');
      if (action && onWorkflow) onWorkflow(action);
    }, 450);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(a => [...a, ...files.map(f => ({ name: f.name, size: f.size }))]);
    e.target.value = '';
  };

  const toggleMic = () => {
    setState((s: string) => s === 'listening' ? 'idle' : 'listening');
  };

  if (collapsed) {
    return <aside className="voice collapsed" data-state={state} aria-hidden="true"/>;
  }

  return (
    <aside className="voice" data-state={state}>
      <div className="voice-h">
        <div className="voice-orb" aria-hidden="true"></div>
        <div className="voice-title">
          <span>ADGA</span>
          {state !== 'idle' && (
            <span className="state">
              {state === 'listening' && '• Listening'}
              {state === 'talking' && '• Speaking'}
            </span>
          )}
        </div>
        <div className="voice-tools">
          <button
            className={'composer-tool' + (historyOpen ? ' active' : '')}
            type="button"
            onClick={() => setHistoryOpen(o => !o)}
            title="Chat history"
            aria-label="Toggle history"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/>
            </svg>
          </button>
          <button
            className="composer-tool"
            type="button"
            onClick={() => { setMessages([]); setDraft(''); }}
            title="New chat"
            aria-label="New chat"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>
            </svg>
          </button>
          <button
            className="composer-tool"
            type="button"
            onClick={() => setCollapsed(true)}
            title="Hide"
            aria-label="Hide ADGA"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="voice-command">
        <div className="voice-command-kicker">
          <span>AI command</span>
          <span>{routeAgentLabel(routeAgentKey(draft))} agent</span>
        </div>
        <div className="composer-box command-first">
          {attachments.length > 0 && (
            <div className="composer-attachments">
              {attachments.map((a, i) => (
                <div key={i} className="composer-chip">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{color:'var(--text-3)'}}>
                    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/>
                    <path d="M14 3v5h5"/>
                  </svg>
                  <span>{a.name}</span>
                  <span
                    className="x"
                    onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                    role="button"
                    aria-label="Remove attachment"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                  </span>
                </div>
              ))}
            </div>
          )}
          <textarea
            ref={taRef}
            className="composer-textarea"
            placeholder="Tell ADGA what to do across leads, deals, meetings, invoices, documents, or follow-up."
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={onKey}
            rows={3}
          />
          <div className="composer-bar">
            <button className="composer-tool" type="button" onClick={() => fileRef.current?.click()} title="Attach files" aria-label="Attach files">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12 12 21a6 6 0 1 1-8.5-8.5L13 3a4 4 0 0 1 5.7 5.7L9.4 18a2 2 0 1 1-2.8-2.8L15 7"/>
              </svg>
            </button>
            <button className={'composer-tool mic' + (state === 'listening' ? ' live' : '')} type="button" onClick={toggleMic} title={state === 'listening' ? 'Stop voice input' : 'Start voice input'} aria-label="Voice input">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="3" width="6" height="12" rx="3"/>
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>
              </svg>
            </button>
            <button className="composer-send" type="button" onClick={send} disabled={!draft.trim() && attachments.length === 0} aria-label="Send">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
            </button>
            <input ref={fileRef} type="file" multiple hidden onChange={onFile} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.csv,.txt"/>
          </div>
        </div>
      </div>

      <div className={'voice-history ' + (historyOpen ? 'open' : '')}>
        <div className="vh-head">
          <span>Recent chats</span>
          <button type="button" style={{fontSize:10,color:'var(--accent)',background:'none',border:0,padding:0,cursor:'pointer',textTransform:'uppercase',letterSpacing:'0.08em',fontWeight:500}}>View all</button>
        </div>
        {SAMPLE_HISTORY.map(c => (
          <div
            key={c.id}
            className={'vh-item ' + (c.id === activeChat ? 'active' : '')}
            onClick={() => { setActiveChat(c.id); setHistoryOpen(false); }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{color:'var(--text-3)',flexShrink:0}}>
              <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>
            </svg>
            <span className="ttl">{c.title}</span>
            <span className="when">{c.when}</span>
          </div>
        ))}
      </div>

      <div className="voice-body" ref={bodyRef}>
        {messages.length === 0 ? (
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,padding:'24px 16px',textAlign:'center'}}>
            <div style={{width:48,height:48,borderRadius:'50%',background:'var(--accent-soft)',display:'grid',placeItems:'center'}}>
              <div style={{width:18,height:18,borderRadius:'50%',background:'var(--accent)'}}/>
            </div>
            <div>
              <div style={{fontSize:15,fontWeight:600,letterSpacing:'-0.01em'}}>How can I help, Maren?</div>
              <div style={{fontSize:12.5,color:'var(--text-3)',marginTop:4,lineHeight:1.5,maxWidth:260}}>
                Ask about deals, draft outreach, pull reports, or run actions across your pipeline.
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="voice-meta">Session · 09:14 · {messages.length} messages</div>
            {messages.map((m, i) => (
              <div key={i} className={'voice-msg ' + m.who}>
                <span className="who">{m.who === 'user' ? 'You' : 'ADGA'}</span>
                <div className="what">
                  {m.text}
                  {m.cite && (
                    <div className="cite">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12 12 21a6 6 0 1 1-8.5-8.5L13 3a4 4 0 0 1 5.7 5.7L9.4 18a2 2 0 1 1-2.8-2.8L15 7"/>
                      </svg>
                      {m.cite}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {state === 'talking' && (
              <div className="voice-msg agent">
                <span className="who">ADGA</span>
                <div className="what">
                  <span style={{display:'inline-flex',gap:4,alignItems:'center'}}>
                    <span className="dot-typing"/>
                    <span className="dot-typing" style={{animationDelay:'0.15s'}}/>
                    <span className="dot-typing" style={{animationDelay:'0.3s'}}/>
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {state === 'listening' && (
        <div className="voice-live" style={{borderTop:'1px solid var(--border)'}}>
          <div className="voice-live-wave" aria-hidden="true">
            {Array.from({length: 28}).map((_, i) => (
              <i key={i} style={{animationDelay: (i * 0.04) + 's'}}/>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
