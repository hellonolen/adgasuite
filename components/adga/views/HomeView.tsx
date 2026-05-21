"use client";

import React from "react";
import { Icon, KPI, AvatarStack, Pill } from "@/components/adga/shared/Primitives";

export function HomeView({ deals, leads, tasks }: any) {
  const activeDeals = deals.filter((d: any) => d.stage !== 'won');
  const totalValue = activeDeals.reduce((sum: number, d: any) => sum + d.value, 0);

  return (
    <div className="workspace">
      <div className="page-h">
        <div>
          <h1>Good morning, Maren.</h1>
          <div className="sub">You have 3 deals advancing today and 8 pending agent actions.</div>
        </div>
        <div className="page-actions">
          <button className="btn primary"><Icon name="plus" size={14}/> New deal</button>
        </div>
      </div>

      <div className="kpis">
        <KPI label="Active pipeline" value={`$${(totalValue / 1000000).toFixed(1)}M`} delta="+12%" deltaTone="up"/>
        <KPI label="Live leads" value={leads.length.toString()} delta="+4" deltaTone="up"/>
        <KPI label="Tasks due" value={tasks.filter((t: any) => t.due === 'today').length.toString()}/>
        <KPI label="Avg. Velocity" value="14.2d" delta="-2d" deltaTone="up"/>
      </div>

      <div style={{padding: '0 32px 32px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24}}>
        <div style={{display: 'grid', gap: 24}}>
          <div className="card">
            <div className="card-h">
              <span className="ttl">Priority Deals <span className="sub">{activeDeals.filter((d: any) => d.priority === 'high').length}</span></span>
              <button className="btn sm ghost">View pipeline →</button>
            </div>
            <div className="card-b" style={{padding: 0}}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Deal</th>
                    <th>Stage</th>
                    <th>Value</th>
                    <th>Team</th>
                    <th className="num">Prob.</th>
                  </tr>
                </thead>
                <tbody>
                  {activeDeals.filter((d: any) => d.priority === 'high').slice(0, 5).map((d: any) => (
                    <tr key={d.id} style={{cursor: 'pointer'}}>
                      <td><div className="deal-name">{d.name.split(' — ')[0]}</div><div className="muted text-xs">{d.type}</div></td>
                      <td><Pill tone="blue">{d.stage}</Pill></td>
                      <td className="mono">${(d.value / 1000000).toFixed(1)}M</td>
                      <td><AvatarStack ids={d.team}/></td>
                      <td className="num mono">{d.prob}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div style={{display: 'grid', gap: 24, alignContent: 'start'}}>
          <div className="card">
            <div className="card-h">
              <span className="ttl">Tasks <span className="sub">{tasks.length}</span></span>
            </div>
            <div className="card-b" style={{padding: 0}}>
              {tasks.slice(0, 6).map((t: any) => (
                <div key={t.id} className="list-row">
                  <div style={{width: 16, height: 16, border: '1.5px solid var(--border-strong)', borderRadius: 4}}/>
                  <div className="grow">
                    <div className="ttl text-sm">{t.title}</div>
                    <div className="sub">{t.deal} · {t.due}</div>
                  </div>
                  {t.priority === 'high' && <Pill tone="red" noDot className="text-xs">High</Pill>}
                </div>
              ))}
              <div style={{padding: 12, textAlign: 'center'}}>
                <button className="btn sm ghost w-full">View all tasks</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
