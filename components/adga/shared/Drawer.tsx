"use client";

import React from "react";
import { Icon, Avatar, AvatarStack, Pill, KPI, fmtCurrency, stageOf, personOf, companyOf } from "@/components/adga/shared/Primitives";

export function Drawer({ deal, onClose }: { deal: any, onClose: () => void }) {
  const [tab, setTab] = React.useState('overview');
  if (!deal) return null;

  const co = companyOf(deal.company);
  const owner = personOf(deal.owner);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-h">
          <button className="btn icon ghost sm" onClick={onClose}><Icon name="x" size={16}/></button>
          <h2>{deal.name}</h2>
          <div style={{marginLeft:'auto', display:'flex', gap:8}}>
            <button className="btn sm">Edit</button>
            <button className="btn primary sm">Advance</button>
          </div>
        </div>

        <div className="drawer-tabs">
          {['overview', 'timeline', 'documents', 'tasks', 'team'].map(t => (
            <button
              key={t}
              className={'drawer-tab ' + (tab === t ? 'active' : '')}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="drawer-body">
          <div className="drawer-main">
            {tab === 'overview' && (
              <div style={{display:'grid', gap:24}}>
                <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16}}>
                  <KPI label="Value" value={fmtCurrency(deal.value, deal.currency)}/>
                  <KPI label="Probability" value={deal.prob + '%'}/>
                  <KPI label="Close date" value={deal.close}/>
                </div>

                <div className="card">
                  <div className="card-h"><span className="ttl">Deal Metadata</span></div>
                  <div className="card-b">
                    <dl className="kv">
                      <dt>Company</dt><dd>{co?.name}</dd>
                      <dt>Sector</dt><dd>{co?.sector}</dd>
                      <dt>Type</dt><dd>{deal.type}</dd>
                      <dt>Stage</dt><dd><Pill tone={stageOf(deal.stage)?.id === 'won' ? 'green' : 'blue'}>{stageOf(deal.stage)?.name}</Pill></dd>
                      <dt>Source</dt><dd>{deal.source}</dd>
                      <dt>Priority</dt><dd><Pill tone={deal.priority === 'high' ? 'red' : 'amber'}>{deal.priority}</Pill></dd>
                    </dl>
                  </div>
                </div>
              </div>
            )}
            {tab === 'timeline' && (
              <div className="timeline">
                <div className="tl-item">
                  <div className="tl-dot accent"/>
                  <div className="tl-body">
                    <div className="tl-meta">Today · 12m ago</div>
                    <div className="tl-title"><b>Dario Kett</b> moved deal to <b>Closing</b></div>
                  </div>
                </div>
                <div className="tl-item">
                  <div className="tl-dot"/>
                  <div className="tl-body">
                    <div className="tl-meta">Yesterday · 14:22</div>
                    <div className="tl-title"><b>Maren Voss</b> uploaded <b>Definitive Agreement v3.docx</b></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="drawer-side">
            <div className="card">
              <div className="card-h"><span className="ttl">Owner</span></div>
              <div className="card-b">
                <div style={{display:'flex', alignItems:'center', gap:10}}>
                  {owner && <Avatar person={owner} size="lg"/>}
                  <div>
                    <div style={{fontWeight:500}}>{owner?.name}</div>
                    <div className="muted text-xs">{owner?.role}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-h"><span className="ttl">Team</span></div>
              <div className="card-b">
                <div style={{display:'grid', gap:8}}>
                  {deal.team.map((tid: string) => {
                    const p = personOf(tid);
                    return (
                      <div key={tid} style={{display:'flex', alignItems:'center', gap:8, fontSize:12}}>
                        {p && <Avatar person={p}/>}
                        <span>{p?.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
