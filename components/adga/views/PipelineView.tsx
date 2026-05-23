"use client";

import React from "react";
import { Icon, AvatarStack, stageOf, fmtCurrency } from "@/components/adga/shared/Primitives";
import { PIPELINE_STAGES } from "@/lib/data/seed";

export function PipelineView({ deals, onOpenDeal }: any) {
  return (
    <div className="workspace">
      <div className="page-h">
        <div>
          <h1>Pipeline</h1>
          <div className="sub">Manage active deals across stages. Drag to advance or open for details.</div>
        </div>
        <div className="page-actions">
          <div className="seg">
            <button className="active"><Icon name="kanban" size={13}/> Board</button>
            <button><Icon name="table" size={13}/> Table</button>
            <button><Icon name="timeline" size={13}/> Gantt</button>
          </div>
          <button className="btn"><Icon name="filter" size={14}/> Filter</button>
          <button className="btn primary"><Icon name="plus" size={14}/> Add deal</button>
        </div>
      </div>

      <div className="kanban">
        {PIPELINE_STAGES.filter(s => s.id !== 'deliver' && s.id !== 'expand').map(stage => {
          const stageDeals = deals.filter((d: any) => d.stage === stage.id);
          const stageValue = stageDeals.reduce((sum: number, d: any) => sum + d.value, 0);

          return (
            <div key={stage.id} className="col">
              <div className="col-h">
                <div className="col-dot" style={{background: stage.dot}}/>
                <span className="col-name">{stage.name}</span>
                <span className="col-count">{stageDeals.length}</span>
                <span className="col-value">{fmtCurrency(stageValue)}</span>
              </div>
              <div className="col-body">
                {stageDeals.map((deal: any) => (
                  <div key={deal.id} className="deal-card" onClick={() => onOpenDeal(deal)}>
                    <div className="deal-name">{deal.name.split(' — ')[0]}</div>
                    <div className="deal-meta">
                      <span className="mono">{fmtCurrency(deal.value, deal.currency)}</span>
                      <span className="muted">·</span>
                      <span className="muted">{deal.updated}</span>
                    </div>
                    <div className="deal-row between">
                      <AvatarStack ids={deal.team}/>
                      <div className="deal-row" style={{gap: 4}}>
                        <span className="text-xs muted mono">{deal.prob}%</span>
                        <div className="progress" style={{width: 32}}><i style={{width: deal.prob + '%'}}/></div>
                      </div>
                    </div>
                    {deal.priority === 'high' && <div style={{position:'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: '50%', background: 'var(--status-red)'}}/>}
                  </div>
                ))}
                {stageDeals.length === 0 && (
                  <div style={{flex:1, display:'grid', placeItems:'center', border:'1px dashed var(--border)', borderRadius:'var(--radius)', margin:4}}>
                    <span className="muted text-xs">Empty</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
