"use client";

/**
 * Thin client wrapper that the /suite/dealflow/[id] server page hands its fetched data to.
 * Rendered as children of the suite layout — fills the workspace area edge-to-edge.
 * The shell (sidebar, topbar, voice panel) comes from the layout; this file owns ONLY
 * the deal canvas.
 */

import {
  DealFlow,
  type DealFlowDeal,
  type DealFlowEntity,
  type DealFlowInitialEdge,
  type DealFlowInitialNode,
} from "@/components/suite/DealFlow";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export interface DealFlowClientProps {
  deal: DealFlowDeal;
  entities: DealFlowEntity[];
  mapId?: string;
  initialNodes?: DealFlowInitialNode[];
  initialEdges?: DealFlowInitialEdge[];
  persistApiBase?: string;
}

export default function DealFlowClient({
  deal,
  entities,
  mapId,
  initialNodes,
  initialEdges,
  persistApiBase,
}: DealFlowClientProps) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", minHeight: 0 }}>
      <Link className="deal-canvas-back" href="/suite/deals" aria-label="Back to deals">
        <ArrowLeft aria-hidden="true" size={15} />
        Deals
      </Link>
      <DealFlow
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
