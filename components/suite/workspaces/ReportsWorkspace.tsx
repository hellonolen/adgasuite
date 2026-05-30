"use client";

/**
 * ReportsWorkspace — extracted from AdgaSuite.tsx route === "reports".
 * Saved-dashboard grid + CSV export. Placeholder report set is local to the
 * workspace; the Intelligence agent will replace it with real cohorts as the
 * `report.composed` event lands.
 */

import React from "react";

type Person = { id: string; name: string; initials: string; av: number };

const PEOPLE: Person[] = [
  { id: "p1", name: "Maren Voss", initials: "MV", av: 0 },
  { id: "p2", name: "Dario Kett", initials: "DK", av: 1 },
  { id: "p3", name: "Aisha Bremer", initials: "AB", av: 2 },
  { id: "p4", name: "Theo Lange", initials: "TL", av: 3 },
  { id: "p5", name: "Saoirse Quinn", initials: "SQ", av: 4 },
  { id: "p6", name: "Jules Mendez", initials: "JM", av: 5 },
  { id: "p7", name: "Hana Okafor", initials: "HO", av: 6 },
  { id: "p8", name: "Rune Sato", initials: "RS", av: 7 },
];

const personOf = (id: string): Person => PEOPLE.find((p) => p.id === id) || PEOPLE[0];

const REPORTS = [
  { name: "Weekly pipeline review",     desc: "Stage flow + risks + commitments",                       updated: "Today",   owner: "p1", tag: "Recurring" },
  { name: "Win/Loss analysis (TTM)",    desc: "Outcomes broken down by reason & stage",                 updated: "2d ago",  owner: "p3", tag: "Snapshot" },
  { name: "Banker source attribution",  desc: "Which intermediaries drove the most pipeline value",     updated: "4d ago",  owner: "p5", tag: "Snapshot" },
  { name: "Diligence cycle time",       desc: "How long DD takes by workstream and deal size",          updated: "1w ago",  owner: "p7", tag: "Snapshot" },
  { name: "Forecast accuracy (90d)",    desc: "Committed vs. actual closes over rolling 90 days",       updated: "1w ago",  owner: "p1", tag: "Snapshot" },
  { name: "Team velocity",              desc: "Activities + advances per principal per week",           updated: "2w ago",  owner: "p3", tag: "Recurring" },
];

function IconDownload() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V2" />
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

function Avatar({ person }: { person: Person }) {
  return <span className={"avatar av-" + person.av}>{person.initials}</span>;
}

export default function ReportsWorkspace() {
  const exportReports = () => {
    const csv = ["name,description,updated,owner,type"]
      .concat(
        REPORTS.map((r) =>
          [r.name, r.desc, r.updated, personOf(r.owner).name, r.tag]
            .map((v) => `"${String(v).replaceAll('"', '""')}"`)
            .join(","),
        ),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `adga-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    fetch("/api/agent/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "reports.exported",
        resource_type: "report",
        payload: { count: REPORTS.length },
      }),
    }).catch(() => {});
  };

  return (
    <>
      <div className="page-h">
        <div>
          <h1>Reports</h1>
          <div className="sub">Saved dashboards · {REPORTS.length} reports · Auto-refreshed nightly</div>
        </div>
        <div className="page-actions">
          <button className="btn" type="button" onClick={exportReports}><IconDownload /> Export all</button>
          <button className="btn primary" type="button"><IconPlus /> New report</button>
        </div>
      </div>

      <div className="docs-grid">
        {REPORTS.map((r) => {
          const p = personOf(r.owner);
          return (
            <div key={r.name} className="kb-card" style={{ minHeight: 170 }}>
              <div className="kb-tag">{r.tag}</div>
              <div className="kb-title">{r.name}</div>
              <div className="kb-desc">{r.desc}</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Avatar person={p} />
                <span className="text-xs muted">{p.name.split(" ")[0]} · updated {r.updated}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
