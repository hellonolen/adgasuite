"use client";

import React from "react";
import { Icon, Pill, fmtCurrency } from "@/components/adga/shared/Primitives";

export function LeadsView({ leads }: any) {
  return (
    <div className="workspace">
      <div className="page-h">
        <div>
          <h1>Leads</h1>
          <div className="sub">New prospects and inbound interest. Agent-scored and ready for follow-up.</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="filter" size={14}/> Filter</button>
          <button className="btn primary"><Icon name="plus" size={14}/> Add lead</button>
        </div>
      </div>

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Company</th>
              <th>Sector</th>
              <th className="num">Score</th>
              <th>Estimated Value</th>
              <th>Received</th>
              <th>Status</th>
              <th/>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead: any) => (
              <tr key={lead.id}>
                <td><div style={{fontWeight:500}}>{lead.name}</div><div className="muted text-xs">{lead.title}</div></td>
                <td>{lead.company}</td>
                <td>{lead.sector}</td>
                <td className="num">
                  <div className="score-ring">
                    <svg viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--border)" strokeWidth="3"/>
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--accent)" strokeWidth="3" strokeDasharray={`${lead.score}, 100`}/>
                    </svg>
                    <span className="v mono">{lead.score}</span>
                  </div>
                </td>
                <td className="mono">{fmtCurrency(lead.value)}</td>
                <td className="muted text-xs">{lead.last}</td>
                <td><Pill tone={lead.status === 'hot' ? 'red' : lead.status === 'warm' ? 'amber' : 'gray'}>{lead.status}</Pill></td>
                <td className="num">
                  <button className="btn icon ghost sm"><Icon name="more" size={14}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
