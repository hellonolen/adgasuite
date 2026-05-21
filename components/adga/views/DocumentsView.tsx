"use client";

import React from "react";
import { Icon, Pill } from "@/components/adga/shared/Primitives";

export function DocumentsView({ documents }: any) {
  return (
    <div className="workspace">
      <div className="page-h">
        <div>
          <h1>Documents</h1>
          <div className="sub">Virtual Data Room and internal business documents. Shared across active deals.</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="filter" size={14}/> Filter</button>
          <button className="btn primary"><Icon name="upload" size={14}/> Upload</button>
        </div>
      </div>

      <div className="docs-grid">
        {documents.map((doc: any) => (
          <div key={doc.id} className="doc-card">
            <div className="doc-thumb">
              <div className="lines">
                <i/><i/><i/><i/><i/><i/><i/>
              </div>
              <span className="ext uppercase">{doc.ext}</span>
              {doc.signed && (
                <div style={{position:'absolute', bottom: 8, right: 8}}>
                  <Pill tone="green" noDot className="text-xs"><Icon name="check" size={10}/> Signed</Pill>
                </div>
              )}
            </div>
            <div className="doc-info">
              <div className="doc-name truncate" title={doc.name}>{doc.name}</div>
              <div className="doc-meta">
                <span>{doc.size}</span>
                <span className="muted">·</span>
                <span>{doc.updated}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
