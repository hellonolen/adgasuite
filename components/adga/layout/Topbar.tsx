"use client";

import React from "react";
import { Icon } from "@/components/adga/shared/Primitives";

interface TopbarProps {
  route: string;
  onSearch?: (q: string) => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
}

export function Topbar({ route, onSearch, collapsed, setCollapsed }: TopbarProps) {
  const labelMap: Record<string, string> = {
    home: 'Home',
    pending: 'Pending',
    inbox: 'Inbox',
    tasks: 'Tasks',
    calendar: 'Calendar',
    teams: 'Teams',
    leads: 'Leads',
    pipeline: 'Pipeline',
    story: 'Story',
    crm: 'Contacts',
    documents: 'Documents',
    knowledge: 'Knowledge Hub',
    intelligence: 'Intelligence',
    'voice-notes': 'Voice Notes',
    messaging: 'Messaging',
    reports: 'Reports',
    admin: 'Admin',
    affiliates: 'Affiliate Center',
    invoicing: 'Invoicing',
    billing: 'Billing',
    settings: 'Settings',
  };

  return (
    <header className="topbar">
      <div className="crumb">
        <button className="btn icon ghost sm" onClick={() => setCollapsed(!collapsed)} title="Toggle sidebar">
          <Icon name="panel" size={14}/>
        </button>
        <span className="sep">/</span>
        <span>Concorde Group</span>
        <span className="sep">/</span>
        <span className="here">{labelMap[route] || route}</span>
      </div>

      <div className="topbar-actions">
        <div className="search">
          <Icon name="search" size={13}/>
          <input type="text" placeholder="Search leads, deals, or documents..." onChange={e => onSearch?.(e.target.value)}/>
          <span className="kbd">⌘K</span>
        </div>
        <button className="btn icon ghost">
          <Icon name="bell" size={16}/>
        </button>
        <button className="btn icon ghost">
          <Icon name="sliders" size={16}/>
        </button>
      </div>
    </header>
  );
}
