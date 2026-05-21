"use client";

import React from "react";
import { Icon, Pill } from "@/components/adga/shared/Primitives";

export function KnowledgeView({ knowledge }: any) {
  return (
    <div className="workspace">
      <div className="page-h">
        <div>
          <h1>Knowledge Hub</h1>
          <div className="sub">Team playbooks, templates, and reference guides for deal execution.</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="filter" size={14}/> Filter</button>
          <button className="btn primary"><Icon name="plus" size={14}/> New guide</button>
        </div>
      </div>

      <div className="kb-grid">
        {knowledge.map((k: any, i: number) => (
          <div key={i} className="kb-card">
            <div className="kb-tag">{k.tag}</div>
            <div className="kb-title">{k.title}</div>
            <div className="kb-desc">{k.desc}</div>
            <div className="kb-foot">
              <Icon name="users" size={11}/>
              <span>{k.readers} readers</span>
              <span className="muted">·</span>
              <span>Updated {k.updated}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
