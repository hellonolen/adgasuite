"use client";

import React from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

export interface WorkspaceDeal {
  id: string;
  name: string;
  stage: string;
  value?: number;
  company?: string | null;
}

export interface WorkspaceContact {
  id: string;
  name: string;
  company?: string | null;
  /** Deal ids that this contact appears on. Drives cross-deal connections. */
  dealIds: string[];
}

interface WorkspaceMindmapProps {
  deals: WorkspaceDeal[];
  contacts: WorkspaceContact[];
}

const STAGE_COLOR: Record<string, string> = {
  lead: "#94a3b8",
  qualifying: "#67e8f9",
  discovery: "#60a5fa",
  proposal: "#a78bfa",
  negotiation: "#fbbf24",
  closing: "#f59e0b",
  won: "#4ade80",
};

function stageColor(stage: string) {
  return STAGE_COLOR[stage.toLowerCase()] || "#a78bfa";
}

function formatValue(v?: number) {
  if (!v || v <= 0) return undefined;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v.toFixed(0)}`;
}

function DealClusterNode({ data, selected }: NodeProps) {
  const deal = data as unknown as WorkspaceDeal & { _shared?: boolean };
  const color = stageColor(deal.stage);
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 14,
        padding: "12px 14px",
        minWidth: 200,
        maxWidth: 240,
        border: `1px solid ${selected ? "#5d2cd6" : "rgba(86,36,199,0.18)"}`,
        boxShadow: selected
          ? "0 16px 36px rgba(86,36,199,0.18), 0 0 0 3px rgba(86,36,199,0.10)"
          : "0 10px 24px rgba(15,23,42,0.06), 0 2px 4px rgba(15,23,42,0.03)",
        position: "relative",
      }}
    >
      <div
        style={{
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color,
          marginBottom: 6,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
        {deal.stage}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#0d0c0a", lineHeight: 1.25, letterSpacing: "-0.01em" }}>
        {deal.name}
      </div>
      {(deal.value || deal.company) && (
        <div style={{ fontSize: 11.5, color: "#6b6760", marginTop: 4, lineHeight: 1.35 }}>
          {[formatValue(deal.value), deal.company || null].filter(Boolean).join(" · ")}
        </div>
      )}
      <Handle type="source" position={Position.Top} id="t" style={{ background: color, width: 6, height: 6, opacity: 0 }} />
      <Handle type="target" position={Position.Top} id="tt" style={{ background: color, width: 6, height: 6, opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="r" style={{ background: color, width: 6, height: 6, opacity: 0 }} />
      <Handle type="target" position={Position.Right} id="rt" style={{ background: color, width: 6, height: 6, opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="b" style={{ background: color, width: 6, height: 6, opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} id="bt" style={{ background: color, width: 6, height: 6, opacity: 0 }} />
      <Handle type="source" position={Position.Left} id="l" style={{ background: color, width: 6, height: 6, opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="lt" style={{ background: color, width: 6, height: 6, opacity: 0 }} />
    </div>
  );
}

function ContactNode({ data, selected }: NodeProps) {
  const contact = data as unknown as WorkspaceContact & { _shared?: boolean };
  const shared = contact._shared;
  const color = shared ? "#5d2cd6" : "#16a34a";
  return (
    <div
      style={{
        background: shared ? "rgba(86,36,199,0.06)" : "#ffffff",
        borderRadius: 999,
        padding: "6px 12px",
        border: `1px solid ${selected ? color : shared ? "rgba(86,36,199,0.28)" : "rgba(22,163,74,0.22)"}`,
        boxShadow: shared
          ? "0 6px 14px rgba(86,36,199,0.10)"
          : "0 4px 10px rgba(15,23,42,0.04)",
        fontSize: 11.5,
        color: "#0d0c0a",
        fontWeight: 500,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        maxWidth: 200,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: color,
          flexShrink: 0,
        }}
      />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {contact.name}
      </span>
      {shared && (
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "#5d2cd6",
            marginLeft: 2,
          }}
        >
          shared
        </span>
      )}
      <Handle type="target" position={Position.Top} id="t" style={{ background: color, width: 6, height: 6, opacity: 0 }} />
      <Handle type="source" position={Position.Top} id="ts" style={{ background: color, width: 6, height: 6, opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} id="b" style={{ background: color, width: 6, height: 6, opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="bs" style={{ background: color, width: 6, height: 6, opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="l" style={{ background: color, width: 6, height: 6, opacity: 0 }} />
      <Handle type="source" position={Position.Left} id="ls" style={{ background: color, width: 6, height: 6, opacity: 0 }} />
      <Handle type="target" position={Position.Right} id="r" style={{ background: color, width: 6, height: 6, opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="rs" style={{ background: color, width: 6, height: 6, opacity: 0 }} />
    </div>
  );
}

const nodeTypes = { dealCluster: DealClusterNode, workspaceContact: ContactNode };

function layoutClusters(deals: WorkspaceDeal[], contacts: WorkspaceContact[]) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const sharedContactIds = new Set(
    contacts.filter((c) => c.dealIds.length > 1).map((c) => c.id),
  );

  // Lay deals out on a grid, then place each cluster's owned contacts on a small ring
  // around the deal node. Shared contacts get placed once between their deals.
  const cols = Math.max(1, Math.ceil(Math.sqrt(deals.length)));
  const colWidth = 520;
  const rowHeight = 420;

  const dealCenters = new Map<string, { x: number; y: number }>();
  deals.forEach((deal, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cx = col * colWidth + 240;
    const cy = row * rowHeight + 200;
    dealCenters.set(deal.id, { x: cx, y: cy });
    nodes.push({
      id: `deal:${deal.id}`,
      type: "dealCluster",
      position: { x: cx - 110, y: cy - 30 },
      data: deal as unknown as Record<string, unknown>,
      draggable: true,
    });
  });

  // Place owned (non-shared) contacts on a tiny ring per deal
  const ownedByDeal = new Map<string, WorkspaceContact[]>();
  for (const contact of contacts) {
    if (sharedContactIds.has(contact.id)) continue;
    if (contact.dealIds.length !== 1) continue;
    const dealId = contact.dealIds[0];
    if (!dealCenters.has(dealId)) continue;
    const list = ownedByDeal.get(dealId) || [];
    list.push(contact);
    ownedByDeal.set(dealId, list);
  }

  for (const [dealId, list] of ownedByDeal) {
    const center = dealCenters.get(dealId)!;
    const ring = 140;
    list.slice(0, 4).forEach((contact, i) => {
      const angle = (i / Math.max(list.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const x = center.x + Math.cos(angle) * ring;
      const y = center.y + Math.sin(angle) * ring;
      nodes.push({
        id: `contact:${contact.id}:${dealId}`,
        type: "workspaceContact",
        position: { x: x - 70, y: y - 14 },
        data: contact as unknown as Record<string, unknown>,
        draggable: true,
      });
      edges.push({
        id: `edge:${dealId}:${contact.id}`,
        source: `deal:${dealId}`,
        target: `contact:${contact.id}:${dealId}`,
        style: { stroke: "rgba(22,163,74,0.32)", strokeWidth: 1 },
      });
    });
  }

  // Shared contacts: render once between deals, edge to every linked deal
  for (const contact of contacts) {
    if (!sharedContactIds.has(contact.id)) continue;
    const points = contact.dealIds
      .map((id) => dealCenters.get(id))
      .filter((p): p is { x: number; y: number } => !!p);
    if (points.length < 2) continue;
    const avgX = points.reduce((s, p) => s + p.x, 0) / points.length;
    const avgY = points.reduce((s, p) => s + p.y, 0) / points.length;
    nodes.push({
      id: `contact:${contact.id}:shared`,
      type: "workspaceContact",
      position: { x: avgX - 70, y: avgY - 14 },
      data: { ...contact, _shared: true } as unknown as Record<string, unknown>,
      draggable: true,
    });
    for (const dealId of contact.dealIds) {
      if (!dealCenters.has(dealId)) continue;
      edges.push({
        id: `edge:shared:${dealId}:${contact.id}`,
        source: `deal:${dealId}`,
        target: `contact:${contact.id}:shared`,
        animated: true,
        style: { stroke: "rgba(86,36,199,0.55)", strokeWidth: 1.6 },
      });
    }
  }

  return { nodes, edges };
}

export function WorkspaceMindmap({ deals, contacts }: WorkspaceMindmapProps) {
  const { nodes, edges } = React.useMemo(() => layoutClusters(deals, contacts), [deals, contacts]);

  if (deals.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          minHeight: 320,
          color: "#6b6760",
          fontSize: 13,
        }}
      >
        No active deals yet. Add a deal to see the workspace map.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", minHeight: 480, position: "relative" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
        maxZoom={1.4}
        panOnDrag
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1.1} color="rgba(86,36,199,0.14)" />
        <Controls position="bottom-right" showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
