"use client";

/**
 * Thin client wrapper that the /suite/dealflow/[id] server page hands its fetched data to.
 * Rendered as children of the suite layout — fills the workspace area edge-to-edge.
 * The shell (sidebar, topbar, voice panel) comes from the layout; this file owns ONLY
 * the deal canvas.
 */

import {
  DealMindmap,
  type DealMindmapDeal,
  type DealMindmapEntity,
  type DealMindmapInitialEdge,
  type DealMindmapInitialNode,
} from "@/components/suite/DealMindmap";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export interface DealMapClientProps {
  deal: DealMindmapDeal;
  entities: DealMindmapEntity[];
  mapId?: string;
  initialNodes?: DealMindmapInitialNode[];
  initialEdges?: DealMindmapInitialEdge[];
  persistApiBase?: string;
}

export default function DealMapClient({
  deal,
  entities,
  mapId,
  initialNodes,
  initialEdges,
  persistApiBase,
}: DealMapClientProps) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", minHeight: 0 }}>
      <Link className="deal-canvas-back" href="/suite/deals" aria-label="Back to deals">
        <ArrowLeft aria-hidden="true" size={15} />
        Deals
      </Link>
      <DealMindmap
        deal={deal}
        entities={entities || []}
        mapId={mapId}
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        persistApiBase={persistApiBase}
      />
    </div>
  );
}
