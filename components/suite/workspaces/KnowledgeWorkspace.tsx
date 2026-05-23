"use client";

/**
 * KnowledgeWorkspace — the first workspace extracted out of the 8000-line AdgaSuite.tsx
 * monolith. Lives behind the WorkspaceContract declared in app/suite/workspaces.ts and is
 * loaded lazily by the shell when route === "knowledge".
 *
 * Goal of this file: prove the pattern. The renderer is fully self-contained — its data comes
 * from lib/seed/knowledge.ts (and from D1 once user data is wired), its icons are local SVGs,
 * its state is local. No imports from AdgaSuite.tsx.
 */

import React from "react";
import { KNOWLEDGE } from "@/lib/seed/knowledge";
import { useSuiteEvent } from "@/lib/events/hooks";

const FILTERS = ["all", "playbook", "template", "sop", "reference", "compliance"] as const;
type Filter = typeof FILTERS[number];

function IconSearch() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function IconEye() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconChevR() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export default function KnowledgeWorkspace() {
  const [filter, setFilter] = React.useState<Filter>("all");
  const filtered = filter === "all" ? KNOWLEDGE : KNOWLEDGE.filter((k) => k.tag.toLowerCase() === filter);

  // Event-driven proof point — the Research/Intelligence agents can publish a
  // "gap.identified" event, and this workspace will surface a banner reacting to it.
  const [latestGap, setLatestGap] = React.useState<string | null>(null);
  useSuiteEvent("gap.identified", (event) => {
    setLatestGap(event.payload?.gap ?? null);
  });

  return (
    <>
      <div className="page-h">
        <div>
          <h1>Knowledge Hub</h1>
          <div className="sub">Playbooks, templates, and SOPs your team uses to close deals consistently</div>
        </div>
        <div className="page-actions">
          <button className="btn" type="button"><IconSearch /> Search articles</button>
          <button className="btn primary" type="button"><IconPlus /> New article</button>
        </div>
      </div>

      {latestGap && (
        <div style={{ margin: "0 32px 14px", padding: "12px 14px", borderRadius: 10, background: "rgba(86, 36, 199, 0.08)", border: "1px solid rgba(86, 36, 199, 0.18)", fontSize: 13 }}>
          <strong>New gap surfaced by Intelligence:</strong> {latestGap}
        </div>
      )}

      <div className="filterbar">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={"chip " + (filter === f ? "applied" : "")}
            type="button"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-3)" }} className="mono">
          {filtered.length} articles
        </span>
      </div>

      <div className="kb-grid">
        {filtered.map((k) => (
          <div key={k.title} className="kb-card">
            <div className="kb-tag">{k.tag}</div>
            <div className="kb-title">{k.title}</div>
            <div className="kb-desc">{k.desc}</div>
            <div className="kb-foot">
              <IconEye /> {k.readers} readers
              <span style={{ opacity: 0.5 }}>·</span>
              <span>Updated {k.updated}</span>
              <span style={{ marginLeft: "auto" }}><IconChevR /></span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
