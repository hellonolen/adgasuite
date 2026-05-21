"use client";

import React from "react";
import { workspaces } from "@/lib/data/seed";

const NAV = [
  { section: 'WORKSPACE', items: [
    { id: 'home',         label: 'Home' },
    { id: 'pending',      label: 'Pending',         badge: 8, indicator: 'accent' },
    { id: 'inbox',        label: 'Inbox',           badge: 7 },
    { id: 'tasks',        label: 'Tasks',           badge: 12 },
    { id: 'calendar',     label: 'Calendar',        badge: 3 },
    { id: 'teams',        label: 'Teams',           badge: 5 },
  ]},
  { section: 'DEAL FLOW', items: [
    { id: 'leads',        label: 'Leads' },
    { id: 'pipeline',     label: 'Pipeline' },
    { id: 'story',        label: 'Story',                indicator: 'red' },
    { id: 'crm',          label: 'Contacts' },
    { id: 'documents',    label: 'Documents' },
  ]},
  { section: 'TOOLS', items: [
    { id: 'knowledge',    label: 'Knowledge Hub' },
    { id: 'intelligence', label: 'Intelligence' },
    { id: 'voice-notes',  label: 'Voice Notes' },
    { id: 'messaging',    label: 'Messaging' },
    { id: 'reports',      label: 'Reports' },
  ]},
  { section: 'ADMIN', items: [
    { id: 'admin',        label: 'Admin' },
    { id: 'affiliates',   label: 'Affiliate Center' },
    { id: 'invoicing',    label: 'Invoicing' },
    { id: 'billing',      label: 'Billing' },
    { id: 'settings',     label: 'Settings' },
  ]},
];

interface SidebarProps {
  route: string;
  setRoute: (route: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ route, setRoute, collapsed, setCollapsed }: SidebarProps) {
  const [wsOpen, setWsOpen] = React.useState(false);
  const teams = workspaces || [];
  const [activeTeamId, setActiveTeamId] = React.useState('all');
  const activeTeam = teams.find(t => t.id === activeTeamId);

  React.useEffect(() => {
    (window as any).activeTeamId = activeTeamId;
    window.dispatchEvent(new CustomEvent('adga-team-changed', { detail: { teamId: activeTeamId } }));
  }, [activeTeamId]);

  return (
    <aside className={'sidebar ' + (collapsed ? 'collapsed' : 'open')}>
      <div className="sb-brand">
        <div className="sb-logo">A</div>
        <span className="sb-wordmark">ADGA</span>
      </div>

      <div className="sb-workspace" style={{position:'relative'}}>
        <button className="sb-ws-btn" type="button" onClick={() => setWsOpen(o => !o)}>
          <span className="sb-ws-avatar" style={activeTeam ? {background: (activeTeam as any).color, color: 'var(--accent-fg)'} : undefined}>CG</span>
          <span className="sb-ws-name">
            <span style={{display:'block',fontSize:13,color:'var(--text)'}}>Concorde Group</span>
            <span style={{display:'block',fontSize:11,color:'var(--text-3)',marginTop:1}}>
              {activeTeam ? activeTeam.name : 'All teams'}
            </span>
          </span>
          <svg className="sb-ws-chev" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 9 5-5 5 5M7 15l5 5 5-5"/></svg>
        </button>

        {wsOpen && (
          <>
            <div onClick={() => setWsOpen(false)} style={{position:'fixed',inset:0,zIndex:65}} aria-hidden="true"/>
            <div className="ws-menu">
              <div className="ws-menu-label">Workspace</div>
              <div className="ws-menu-item active">
                <span className="sb-ws-avatar" style={{background:'var(--accent)',color:'var(--accent-fg)'}}>CG</span>
                <span style={{flex:1}}>Concorde Group</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color:'var(--accent)'}}><path d="m20 6-11 11-5-5"/></svg>
              </div>

              <div className="ws-menu-label" style={{marginTop:14}}>Focus on team</div>
              <button
                type="button"
                className={'ws-menu-item ' + (activeTeamId === 'all' ? 'sel' : '')}
                onClick={() => { setActiveTeamId('all'); setWsOpen(false); }}
              >
                <span className="ws-dot" style={{background:'var(--text-3)'}}/>
                <span style={{flex:1}}>All teams</span>
                <span className="text-xs muted mono">{teams.length}</span>
              </button>
              {teams.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className={'ws-menu-item ' + (activeTeamId === t.id ? 'sel' : '')}
                  onClick={() => { setActiveTeamId(t.id); setWsOpen(false); setRoute('teams'); }}
                >
                  <span className="ws-dot" style={{background: (t as any).color}}/>
                  <span style={{flex:1,textAlign:'left'}}>{t.name}</span>
                  <span className="text-xs muted mono">{t.members.length}</span>
                </button>
              ))}

              <div className="ws-menu-foot">
                <button type="button" className="btn ghost sm" onClick={() => { setRoute('teams'); setWsOpen(false); }}>Manage teams →</button>
              </div>
            </div>
          </>
        )}
      </div>

      <nav className="sb-nav">
        {NAV.map(sec => (
          <React.Fragment key={sec.section}>
            <div className="sb-section">{sec.section}</div>
            {sec.items.map(it => (
              <button
                key={it.id}
                type="button"
                className={'sb-item ' + (route === it.id ? 'active' : '')}
                onClick={() => setRoute(it.id)}
              >
                <span className="sb-label">{it.label}</span>
                {it.indicator && <span style={{width:6,height:6,borderRadius:'50%',background:'var(--accent)',marginRight:6}}/>}
                {it.badge != null && <span className="sb-badge">{it.badge}</span>}
              </button>
            ))}
          </React.Fragment>
        ))}
      </nav>

      <div className="sb-bottom">
        <span className="avatar av-0">MV</span>
        <div style={{flex:1,minWidth:0}}>
          <div className="user-name">Maren Voss</div>
          <div className="user-sub">Principal</div>
        </div>
      </div>
    </aside>
  );
}
