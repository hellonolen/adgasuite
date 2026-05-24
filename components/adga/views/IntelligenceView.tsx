"use client";

import React from "react";
import { Icon, KPI } from "@/components/adga/shared/Primitives";

export function IntelligenceView({ intelligence }: any) {
  return (
    <div className="workspace">
      <div className="page-h">
        <div>
          <h1>Intelligence</h1>
          <div className="sub">Market insights, competitor battlecards, and sector-wide reporting.</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="filter" size={14}/> Filter</button>
          <button className="btn primary"><Icon name="docs" size={14}/> Generate report</button>
        </div>
      </div>

      <div className="kpis">
        <KPI label="Active signals" value="24" delta="+3" deltaTone="up"/>
        <KPI label="Battlecards" value="118"/>
        <KPI label="Sector depth" value="84%" delta="+2%" deltaTone="up"/>
        <KPI label="Win rate" value="62%" delta="+5%" deltaTone="up"/>
      </div>

      <div style={{padding: '0 32px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24}}>
        <div className="card">
          <div className="card-h"><span className="ttl">Sector Distribution</span></div>
          <div className="card-b">
            <div className="chart-bars">
              {[60, 45, 80, 30, 95, 20].map((h, i) => (
                <div key={i} className="chart-bar">
                  <div className="stack">
                    <i style={{height: h + '%', background: 'var(--accent)'}}/>
                  </div>
                  <div className="lbl">S{i+1}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><span className="ttl">Top Battlecards</span></div>
          <div className="card-b" style={{padding: 0}}>
            {[
              { t: 'Heliograph Industries', d: 'Industrial · Competitor' },
              { t: 'Northbound Therapeutics', d: 'Biotech · Market map' },
              { t: 'Larkfield Capital', d: 'Fintech · LP Profile' },
              { t: 'Meridian Cold Chain', d: 'Logistics · Acquisition summary' },
            ].map((b, i) => (
              <div key={i} className="list-row">
                <div className="grow">
                  <div className="ttl text-sm">{b.t}</div>
                  <div className="sub">{b.d}</div>
                </div>
                <button className="btn icon ghost sm"><Icon name="chevR" size={14}/></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
