"use client";

import React from "react";
import { Icon, Avatar, Pill } from "@/components/adga/shared/Primitives";

export function CRMView({ people }: any) {
  return (
    <div className="workspace">
      <div className="page-h">
        <div>
          <h1>Contacts</h1>
          <div className="sub">Directory of counterparties, bankers, and external advisors.</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="filter" size={14}/> Filter</button>
          <button className="btn primary"><Icon name="plus" size={14}/> Add contact</button>
        </div>
      </div>

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Organization</th>
              <th>Tags</th>
              <th/>
            </tr>
          </thead>
          <tbody>
            {people.map((p: any) => (
              <tr key={p.id}>
                <td>
                  <div style={{display:'flex', alignItems:'center', gap:10}}>
                    <Avatar person={p}/>
                    <div style={{fontWeight:500}}>{p.name}</div>
                  </div>
                </td>
                <td>{p.role}</td>
                <td>Concorde Group</td>
                <td>
                  <div style={{display:'flex', gap:4}}>
                    <Pill tone="gray" noDot className="text-xs">Internal</Pill>
                    {p.id === 'p1' && <Pill tone="blue" noDot className="text-xs">Owner</Pill>}
                  </div>
                </td>
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
