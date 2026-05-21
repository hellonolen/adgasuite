"use client";

import React from "react";
import { PEOPLE, PIPELINE_STAGES, COMPANIES } from "@/lib/data/seed";

export const stageOf = (id: string) => PIPELINE_STAGES.find((s: any) => s.id === id);
export const personOf = (id: string) => PEOPLE.find((p: any) => p.id === id);
export const companyOf = (id: string) => COMPANIES.find((c: any) => c.id === id);

export const Icon = ({ name, size = 16, stroke = 1.5, className = '' }: { name: string, size?: number, stroke?: number, className?: string }) => {
  const props: React.SVGProps<SVGSVGElement> = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: stroke,
    strokeLinecap: 'round', strokeLinejoin: 'round',
    className: 'sb-icon ' + className
  };
  switch (name) {
    case 'home':       return <svg {...props}><path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/></svg>;
    case 'flame':      return <svg {...props}><path d="M12 3s4 4 4 8a4 4 0 0 1-8 0c0-1.5 1-2.5 1-2.5S8 11 12 3z"/><path d="M12 21a6 6 0 0 0 6-6c0-2-1-3.5-1-3.5S15 14 14 14a4 4 0 0 0-4 0c-1 0-2.5-2.5-2.5-2.5S6 13 6 15a6 6 0 0 0 6 6z"/></svg>;
    case 'pipeline':   return <svg {...props}><rect x="3" y="4" width="4" height="16" rx="1"/><rect x="10" y="4" width="4" height="11" rx="1"/><rect x="17" y="4" width="4" height="7" rx="1"/></svg>;
    case 'users':      return <svg {...props}><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.6"/><path d="M15 20c0-2.4 2-4 4-4"/></svg>;
    case 'file':       return <svg {...props}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>;
    case 'book':       return <svg {...props}><path d="M4 5a2 2 0 0 1 2-2h12v17H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 0 2 2h12"/></svg>;
    case 'spark':      return <svg {...props}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>;
    case 'shield':     return <svg {...props}><path d="M12 3l8 3v6c0 5-3.4 8.3-8 9-4.6-.7-8-4-8-9V6z"/></svg>;
    case 'card':       return <svg {...props}><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/></svg>;
    case 'cog':        return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9A1.7 1.7 0 0 0 10 3.1V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>;
    case 'search':     return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case 'plus':       return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case 'filter':     return <svg {...props}><path d="M3 5h18l-7 9v5l-4 2v-7z"/></svg>;
    case 'sort':       return <svg {...props}><path d="M3 6h13M3 12h9M3 18h5"/><path d="M17 8l4-4 4 4" transform="translate(-4,8)"/></svg>;
    case 'more':       return <svg {...props}><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>;
    case 'chevR':      return <svg {...props}><path d="m9 6 6 6-6 6"/></svg>;
    case 'chevD':      return <svg {...props}><path d="m6 9 6 6 6-6"/></svg>;
    case 'chevUD':     return <svg {...props}><path d="m7 9 5-5 5 5M7 15l5 5 5-5"/></svg>;
    case 'x':          return <svg {...props}><path d="M18 6 6 18M6 6l12 12"/></svg>;
    case 'check':      return <svg {...props}><path d="m20 6-11 11-5-5"/></svg>;
    case 'bell':       return <svg {...props}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>;
    case 'mic':        return <svg {...props}><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>;
    case 'phone':      return <svg {...props}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2z"/></svg>;
    case 'mute':       return <svg {...props}><path d="m1 1 22 22"/><path d="M9 9v6a3 3 0 0 0 5.1 2.1"/><path d="M12 1a3 3 0 0 1 3 3v6"/><path d="M19 10v1a7 7 0 0 1-.7 3"/><path d="M5 10v1a7 7 0 0 0 12 5"/><path d="M12 18v3"/></svg>;
    case 'cal':        return <svg {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>;
    case 'panel':      return <svg {...props}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>;
    case 'panelR':     return <svg {...props}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/></svg>;
    case 'dollar':     return <svg {...props}><path d="M12 2v20M16 6h-5a3 3 0 0 0 0 6h2a3 3 0 0 1 0 6H7"/></svg>;
    case 'building':   return <svg {...props}><rect x="3" y="3" width="14" height="18" rx="1"/><path d="M17 8h4v13h-4M7 7h2M7 11h2M7 15h2M13 7h2M13 11h2M13 15h2"/></svg>;
    case 'arrow-up':   return <svg {...props}><path d="M12 19V5M5 12l7-7 7 7"/></svg>;
    case 'arrow-dn':   return <svg {...props}><path d="M12 5v14M19 12l-7 7-7-7"/></svg>;
    case 'lock':       return <svg {...props}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>;
    case 'kanban':     return <svg {...props}><rect x="3" y="3" width="6" height="14" rx="1"/><rect x="11" y="3" width="6" height="9" rx="1"/><rect x="19" y="3" width="2" height="6" rx="1" transform="translate(-2 0)"/></svg>;
    case 'table':      return <svg {...props}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 16h18M9 4v16M15 4v16"/></svg>;
    case 'timeline':   return <svg {...props}><path d="M3 7h7M14 7h7M3 12h11M18 12h3M3 17h5M12 17h9"/></svg>;
    case 'docs':       return <svg {...props}><path d="M9 3h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9"/><path d="M5 7h8a2 2 0 0 1 2 2v12H7a2 2 0 0 1-2-2z"/></svg>;
    case 'inbox':      return <svg {...props}><path d="M3 14h4l2 3h6l2-3h4"/><path d="m3 14 3-9h12l3 9v6H3z"/></svg>;
    case 'send':       return <svg {...props}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>;
    case 'paperclip':  return <svg {...props}><path d="M21 12 12 21a6 6 0 1 1-8.5-8.5L13 3a4 4 0 0 1 5.7 5.7L9.4 18a2 2 0 1 1-2.8-2.8L15 7"/></svg>;
    case 'sun':        return <svg {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>;
    case 'moon':       return <svg {...props}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>;
    case 'eye':        return <svg {...props}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'upload':     return <svg {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v13"/></svg>;
    case 'download':   return <svg {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V2"/></svg>;
    case 'flag':       return <svg {...props}><path d="M4 22V4M4 4h12l-2 4 2 4H4"/></svg>;
    case 'sliders':    return <svg {...props}><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1 14h6M9 8h6M17 16h6"/></svg>;
    case 'sparkles':   return <svg {...props}><path d="m12 3 2 5 5 2-5 2-2 5-2-5-5-2 5-2zM19 14l1 2.5 2.5 1-2.5 1L19 21l-1-2.5-2.5-1 2.5-1zM5 14l.7 1.7L7.4 16l-1.7.7L5 18l-.7-1.7L2.6 16l1.7-.7z"/></svg>;
    default: return <span/>;
  }
};

export const Avatar = ({ person, size = 'sm' }: { person: any, size?: string }) => {
  const cls = size === 'lg' ? 'avatar lg' : size === 'xl' ? 'avatar xl' : 'avatar';
  return <span className={cls + ' av-' + person.av}>{person.initials}</span>;
};

export const AvatarStack = ({ ids, max = 3 }: { ids: string[], max?: number }) => {
  const people = ids.map(id => PEOPLE.find(p => p.id === id)).filter(Boolean);
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className="avatar-stack">
      {shown.map(p => <Avatar key={(p as any).id} person={p} />)}
      {rest > 0 && <span className="avatar av-7">+{rest}</span>}
    </span>
  );
};

export const Pill = ({ tone = 'gray', children, noDot, className = '' }: { tone?: string, children: React.ReactNode, noDot?: boolean, className?: string }) => (
  <span className={'pill ' + tone + ' ' + (noDot ? 'no-dot ' : '') + className}>{children}</span>
);

export const KPI = ({ label, value, delta, deltaTone }: { label: string, value: string, delta?: string, deltaTone?: string }) => (
  <div className="kpi">
    <div className="lbl">{label}</div>
    <div className="val">{value}</div>
    {delta && <div className={'delta ' + (deltaTone || '')}>{delta}</div>}
  </div>
);

export const fmtCurrency = (n: number, cur = 'USD') => {
  const sym: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', SGD: 'S$' };
  const s = sym[cur] || '';
  if (n >= 1_000_000) return s + (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + 'M';
  if (n >= 1_000) return s + Math.round(n / 1_000) + 'K';
  return s + n;
};

export const compactNum = (n: number) => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'K';
  return String(n);
};
