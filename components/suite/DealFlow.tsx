"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Handle,
  Position,
  SelectionMode,
  MarkerType,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type NodeProps,
  type Connection,
  type NodeMouseHandler,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import { Check, Edit3, Hand, Link2, MousePointer2, Palette, Plus, Search, Share2, SlidersHorizontal, Trash2, X } from "lucide-react";
import "@xyflow/react/dist/style.css";

export type DealFlowEntityKind =
  | "group"
  | "contact"
  | "company"
  | "bank"
  | "document"
  | "email"
  | "website"
  | "audio"
  | "video"
  | "task"
  | "call"
  | "call_step"
  | "meeting"
  | "journey_step"
  | "invoice"
  | "financial"
  | "action";
export type DealFlowStatus = "neutral" | "active" | "warning" | "overdue" | "done";

export interface DealFlowDeal {
  id: string;
  name: string;
  stage: string;
  value?: string;
  nextAction?: string;
}

export interface DealFlowEntity {
  id: string;
  kind: DealFlowEntityKind;
  label: string;
  sublabel?: string;
  status?: DealFlowStatus;
  role?: string;
  childKind?: DealFlowEntityKind;
  childrenCount?: number;
}

export interface DealFlowInitialNode {
  id: string;
  kind: DealFlowEntityKind;
  label: string;
  sublabel?: string;
  status?: DealFlowStatus;
  position: { x: number; y: number };
}

export interface DealFlowInitialEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

export interface DealFlowPersistenceCallbacks {
  /** Debounced position updates (one or more nodes moved). */
  onPositionChange?: (updates: Array<{ id: string; position: { x: number; y: number } }>) => void;
  /** A new node was added in the UI. */
  onAddNode?: (node: {
    id: string;
    kind: DealFlowEntityKind;
    label: string;
    sublabel?: string;
    status?: DealFlowStatus;
    position: { x: number; y: number };
  }) => void;
  /** A node was removed in the UI. */
  onDeleteNode?: (nodeId: string) => void;
  /** A new edge was added in the UI. */
  onAddEdge?: (edge: { id: string; source: string; target: string }) => void;
  /** An edge was removed in the UI. */
  onDeleteEdge?: (edgeId: string) => void;
}

interface DealFlowProps extends DealFlowPersistenceCallbacks {
  deal: DealFlowDeal;
  entities: DealFlowEntity[];
  /**
   * When set, the toolbar exposes a Share popover backed by /api/dealflows/[dealFlowId]/share.
   * Omit on read-only or sample views to keep the share surface internal-only.
   */
  dealFlowId?: string;
  /**
   * Public/shared views render the canvas in non-interactive mode.
   * Nodes can be selected/inspected but not dragged, connected, or removed.
   */
  readOnly?: boolean;
  /** Initial nodes loaded from D1 (Phase 9d). When present, replaces `entities` layout. */
  initialNodes?: DealFlowInitialNode[];
  /** Initial edges loaded from D1 (Phase 9d). */
  initialEdges?: DealFlowInitialEdge[];
  /** Base URL for built-in persistence (e.g. `/api/dealflows/<id>`). When set, the component auto-persists changes. */
  persistApiBase?: string;
  /** Initial canvas interaction mode. Marketing previews can open in pan mode while the suite keeps select mode. */
  initialCanvasMode?: CanvasInteractionMode;
  /** Homepage previews can choose a fixed initial viewport; suite views keep fitView. */
  initialViewport?: { x: number; y: number; zoom: number };
  fitViewOnInit?: boolean;
  dealNodePosition?: { x: number; y: number };
}

interface ShareInfo {
  token: string;
  url: string;
  permission: string;
  created_at: string;
  expires_at: string | null;
}

const KIND_META: Record<DealFlowEntityKind, { label: string; color: string; ring: string; ringSoft: string }> = {
  group:        { label: "Collection", color: "#5d2cd6", ring: "rgba(93, 44, 214, 0.18)", ringSoft: "rgba(93, 44, 214, 0.08)" },
  contact:      { label: "Person",     color: "#16a34a", ring: "rgba(22, 163, 74, 0.18)", ringSoft: "rgba(22, 163, 74, 0.08)" },
  company:      { label: "Company",    color: "#0ea5e9", ring: "rgba(14, 165, 233, 0.18)", ringSoft: "rgba(14, 165, 233, 0.08)" },
  bank:         { label: "Bank",       color: "#2563eb", ring: "rgba(37, 99, 235, 0.18)", ringSoft: "rgba(37, 99, 235, 0.08)" },
  document:     { label: "File",       color: "#f59e0b", ring: "rgba(245, 158, 11, 0.18)", ringSoft: "rgba(245, 158, 11, 0.08)" },
  email:        { label: "Email",      color: "#0891b2", ring: "rgba(8, 145, 178, 0.18)", ringSoft: "rgba(8, 145, 178, 0.08)" },
  website:      { label: "Website",    color: "#059669", ring: "rgba(5, 150, 105, 0.18)", ringSoft: "rgba(5, 150, 105, 0.08)" },
  audio:        { label: "Audio",      color: "#7c3aed", ring: "rgba(124, 58, 237, 0.18)", ringSoft: "rgba(124, 58, 237, 0.08)" },
  video:        { label: "Video",      color: "#db2777", ring: "rgba(219, 39, 119, 0.18)", ringSoft: "rgba(219, 39, 119, 0.08)" },
  task:         { label: "Task",       color: "#a855f7", ring: "rgba(168, 85, 247, 0.18)", ringSoft: "rgba(168, 85, 247, 0.08)" },
  call:         { label: "Call",       color: "#ef4444", ring: "rgba(239, 68, 68, 0.18)", ringSoft: "rgba(239, 68, 68, 0.08)" },
  call_step:    { label: "Call step",  color: "#f97316", ring: "rgba(249, 115, 22, 0.18)", ringSoft: "rgba(249, 115, 22, 0.08)" },
  meeting:      { label: "Meeting",    color: "#3b82f6", ring: "rgba(59, 130, 246, 0.18)", ringSoft: "rgba(59, 130, 246, 0.08)" },
  journey_step: { label: "Journey",    color: "#6366f1", ring: "rgba(99, 102, 241, 0.18)", ringSoft: "rgba(99, 102, 241, 0.08)" },
  invoice:      { label: "Invoice",    color: "#0f766e", ring: "rgba(15, 118, 110, 0.18)", ringSoft: "rgba(15, 118, 110, 0.08)" },
  financial:    { label: "Financial",  color: "#64748b", ring: "rgba(100, 116, 139, 0.18)", ringSoft: "rgba(100, 116, 139, 0.08)" },
  action:       { label: "Next",       color: "#5d2cd6", ring: "rgba(86, 36, 199, 0.20)", ringSoft: "rgba(86, 36, 199, 0.08)" },
};

const STATUS_META: Record<DealFlowStatus, { dot: string; pulse: boolean; label: string }> = {
  neutral: { dot: "#d8d6d0",     pulse: false, label: "Open" },
  active:  { dot: "#5d2cd6",     pulse: true,  label: "Active" },
  warning: { dot: "#f59e0b",     pulse: true,  label: "Due soon" },
  overdue: { dot: "#ef4444",     pulse: true,  label: "Overdue" },
  done:    { dot: "#16a34a",     pulse: false, label: "Done" },
};

const VIEW_MODES = [
  { id: "relationship", label: "Relationships", kinds: ["group", "contact", "company", "bank"] },
  { id: "communication", label: "Communications", kinds: ["group", "email", "call", "meeting", "audio", "video"] },
  { id: "document", label: "Files & web", kinds: ["group", "document", "website", "audio", "video"] },
  { id: "journey", label: "Journey", kinds: ["group", "journey_step", "call_step", "call"] },
  { id: "task", label: "Tasks", kinds: ["group", "task", "action", "meeting"] },
  { id: "financial", label: "Financial", kinds: ["group", "invoice", "financial", "bank"] },
  { id: "risk", label: "Risk", kinds: ["task", "action", "call", "meeting", "invoice", "financial"] },
] as const;

type ViewMode = (typeof VIEW_MODES)[number]["id"];
type DealFlowToolPanel = "search" | "nodes" | "style" | "links" | "view" | "share";
type CanvasInteractionMode = "select" | "pan";

type AgentActionResult = {
  status?: string;
  action_type?: string;
  resource_type?: string;
  resource_id?: string;
  message?: string;
  data?: {
    results?: Array<{ type?: string; id?: string; title?: string; url?: string }>;
  };
};

type AgentChatResponse = {
  ok?: boolean;
  error?: string;
  message?: { content?: string } | string;
  action_results?: AgentActionResult[];
};

function agentMessageText(message: AgentChatResponse["message"]): string {
  if (typeof message === "string") return message;
  return typeof message?.content === "string" ? message.content : "";
}

function DealNodeView({ data, selected }: NodeProps) {
  const deal = data as unknown as DealFlowDeal;
  return (
    <div
      style={{
        background: "linear-gradient(180deg, #5d2cd6 0%, #4b22bb 100%)",
        color: "#fff",
        borderRadius: 16,
        padding: "18px 20px",
        minWidth: 250,
        maxWidth: 300,
        boxShadow: selected
          ? "0 24px 58px rgba(86, 36, 199, 0.36), 0 0 0 3px rgba(86, 36, 199, 0.24)"
          : "0 20px 48px rgba(86, 36, 199, 0.24), 0 3px 10px rgba(86, 36, 199, 0.14)",
        border: "1px solid rgba(255, 255, 255, 0.20)",
        cursor: "inherit",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 9.5, fontWeight: 850, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.76 }}>
          Deal
        </div>
        <div style={{ fontSize: 9.5, fontWeight: 850, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.72 }}>
          {deal.stage}
        </div>
      </div>
      <div style={{ fontSize: 16, fontWeight: 760, lineHeight: 1.18, marginBottom: 10 }}>
        {deal.name}
      </div>
      {deal.value && <div style={{ fontSize: 12, fontWeight: 760, opacity: 0.86, marginBottom: 4 }}>{deal.value}</div>}
      {deal.nextAction && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255, 255, 255, 0.18)", fontSize: 11.5, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ opacity: 0.68 }}>Next</span>
          <span style={{ fontWeight: 650, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deal.nextAction}</span>
        </div>
      )}

      <Handle type="source" position={Position.Top}    id="top"    style={{ background: "rgba(255,255,255,0.5)", width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right}  id="right"  style={{ background: "rgba(255,255,255,0.5)", width: 10, height: 10 }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: "rgba(255,255,255,0.5)", width: 10, height: 10 }} />
      <Handle type="source" position={Position.Left}   id="left"   style={{ background: "rgba(255,255,255,0.5)", width: 10, height: 10 }} />
    </div>
  );
}

function EntityNodeView({ data, selected }: NodeProps) {
  const entity = data as unknown as DealFlowEntity;
  const meta = KIND_META[entity.kind];
  const status = STATUS_META[entity.status || "neutral"];
  const rawData = data as unknown as { data?: Record<string, unknown> };
  const childKind = String(rawData.data?.child_kind || entity.childKind || "");
  const childrenCount = Number(rawData.data?.children_count ?? entity.childrenCount ?? 0);
  const childMeta = childKind && KIND_META[childKind as DealFlowEntityKind] ? KIND_META[childKind as DealFlowEntityKind] : null;
  const isGroup = entity.kind === "group";
  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.96)",
        borderRadius: 12,
        padding: "11px 12px 10px",
        minWidth: 180,
        maxWidth: 230,
        border: `1px solid ${selected ? meta.color : "rgba(15, 23, 42, 0.08)"}`,
        boxShadow: selected
          ? `0 14px 30px rgba(15, 23, 42, 0.12), 0 0 0 3px ${meta.ringSoft}`
          : "0 12px 26px rgba(15, 23, 42, 0.065), 0 2px 5px rgba(15, 23, 42, 0.035)",
        position: "relative",
        cursor: "inherit",
      }}
    >
      {status.pulse && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            width: 12,
            height: 12,
            borderRadius: 999,
            background: status.dot,
            boxShadow: `0 0 0 4px ${meta.ringSoft}`,
            animation: "deal-node-pulse 2.2s ease-in-out infinite",
          }}
        />
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: meta.color, flexShrink: 0 }} />
          <span style={{ fontSize: 9, fontWeight: 850, letterSpacing: "0.13em", textTransform: "uppercase", color: meta.color }}>
            {meta.label}
          </span>
        </div>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: status.dot, flexShrink: 0 }} />
      </div>
      <div style={{ fontSize: 13.2, fontWeight: 760, color: "#0d0c0a", lineHeight: 1.22 }}>
        {entity.label}
      </div>
      {entity.sublabel && (
        <div style={{ fontSize: 11.2, color: "#6b6760", marginTop: 4, lineHeight: 1.32 }}>{entity.sublabel}</div>
      )}
      {isGroup && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 9, padding: "8px 9px", borderRadius: 10, background: "rgba(93, 44, 214, 0.055)", border: "1px solid rgba(93, 44, 214, 0.10)" }}>
          <span style={{ color: "#4b22bb", fontSize: 10.5, fontWeight: 820 }}>
            {childrenCount.toLocaleString()} associated
          </span>
          <span style={{ color: "#6b6760", fontSize: 10.2, fontWeight: 720 }}>
            {childMeta?.label || "Records"}
          </span>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 9, paddingTop: 8, borderTop: "1px solid rgba(15, 23, 42, 0.06)" }}>
        <span style={{ minWidth: 0, color: "#6b6760", fontSize: 10.2, fontWeight: 720 }}>
          {status.label}
        </span>
        {entity.role && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#817a70", fontSize: 10.2 }}>{entity.role}</span>}
      </div>

      <Handle type="target" position={Position.Top}    id="top"    style={{ background: meta.color, width: 8, height: 8 }} />
      <Handle type="target" position={Position.Right}  id="right"  style={{ background: meta.color, width: 8, height: 8 }} />
      <Handle type="target" position={Position.Bottom} id="bottom" style={{ background: meta.color, width: 8, height: 8 }} />
      <Handle type="target" position={Position.Left}   id="left"   style={{ background: meta.color, width: 8, height: 8 }} />
      <Handle type="source" position={Position.Top}    id="top-out"    style={{ background: meta.color, width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right}  id="right-out"  style={{ background: meta.color, width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} id="bottom-out" style={{ background: meta.color, width: 8, height: 8 }} />
      <Handle type="source" position={Position.Left}   id="left-out"   style={{ background: meta.color, width: 8, height: 8 }} />
    </div>
  );
}

const nodeTypes = { deal: DealNodeView, entity: EntityNodeView };

const CENTER_X = 480;
const CENTER_Y = 320;
const RING_INNER = 280;
const RING_OUTER = 460;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function buildInitial(deal: DealFlowDeal, entities: DealFlowEntity[]) {
  const nodes: Node[] = [
    {
      id: deal.id,
      type: "deal",
      position: { x: CENTER_X - 130, y: CENTER_Y - 60 },
      data: deal as unknown as Record<string, unknown>,
    },
  ];
  const edges: Edge[] = [];
  const inner: DealFlowEntityKind[] = ["group", "contact", "company", "bank", "action"];
  const innerEntities = entities.filter((e) => inner.includes(e.kind));
  const outerEntities = entities.filter((e) => !inner.includes(e.kind));

  const placeRing = (list: DealFlowEntity[], radius: number, offsetDeg: number) => {
    if (list.length === 0) return;
    const step = 360 / list.length;
    list.forEach((entity, idx) => {
      const angle = offsetDeg + idx * step;
      const pos = polar(CENTER_X, CENTER_Y, radius, angle);
      const meta = KIND_META[entity.kind];
      nodes.push({
        id: entity.id,
        type: "entity",
        position: { x: pos.x - 100, y: pos.y - 30 },
        data: entity as unknown as Record<string, unknown>,
      });
      edges.push({
        id: `${deal.id}-${entity.id}`,
        source: deal.id,
        target: entity.id,
        animated: entity.status === "active" || entity.status === "overdue",
        style: {
          stroke: entity.status === "overdue" ? "#ef4444" : entity.status === "active" ? "#5d2cd6" : meta.ring,
          strokeWidth: entity.status === "active" || entity.status === "overdue" ? 2 : 1.5,
        },
      });
    });
  };

  placeRing(innerEntities, RING_INNER, 30);
  placeRing(outerEntities, RING_OUTER, 0);
  return { nodes, edges };
}

function nodeKindFromNode(node: Node | null | undefined): DealFlowEntityKind | "deal" | null {
  if (!node) return null;
  if (node.type === "deal") return "deal";
  const data = node.data as unknown as DealFlowEntity;
  return data?.kind || null;
}

const KINDS_TO_ADD: DealFlowEntityKind[] = [
  "group",
  "contact",
  "company",
  "bank",
  "email",
  "call",
  "meeting",
  "document",
  "website",
  "audio",
  "video",
  "journey_step",
  "call_step",
  "task",
  "invoice",
  "financial",
  "action",
];

const COLLECTION_PRESETS: Array<{ childKind: DealFlowEntityKind; label: string; helper: string; defaultCount?: number }> = [
  { childKind: "contact", label: "People", helper: "Decision-makers, advisors, operators, internal team" },
  { childKind: "bank", label: "Banks & lenders", helper: "Banks, lenders, underwriters, capital sources" },
  { childKind: "company", label: "Organizations", helper: "Buyer, seller, vendors, partners, counterparties" },
  { childKind: "email", label: "Communications", helper: "Email threads, SMS, notes, call follow-ups" },
  { childKind: "document", label: "Files & diligence", helper: "Contracts, LOIs, CIMs, diligence rooms, exhibits" },
  { childKind: "website", label: "Web assets", helper: "Websites, portals, data rooms, external links" },
  { childKind: "audio", label: "Recordings", helper: "Audio, video, transcripts, summaries" },
  { childKind: "journey_step", label: "9-step journey", helper: "Customer journey milestones tied to this deal", defaultCount: 9 },
  { childKind: "call_step", label: "9-step call", helper: "Call framework, objections, commitments, next steps", defaultCount: 9 },
  { childKind: "invoice", label: "Invoices & billing", helper: "Invoices, payment status, billing history" },
  { childKind: "task", label: "Workstreams", helper: "Actions, approvals, risks, owner-specific work" },
];

export function DealFlow({
  deal,
  entities,
  dealFlowId,
  readOnly = false,
  initialNodes,
  initialEdges,
  persistApiBase,
  initialCanvasMode = "select",
  initialViewport,
  fitViewOnInit = true,
  dealNodePosition,
  onPositionChange,
  onAddNode,
  onDeleteNode,
  onAddEdge,
  onDeleteEdge,
}: DealFlowProps) {
  const router = useRouter();
  const [currentDeal, setCurrentDeal] = React.useState(deal);
  const [dealTitleDraft, setDealTitleDraft] = React.useState(deal.name);
  const [dealTitleEditing, setDealTitleEditing] = React.useState(false);
  const [dealTitleError, setDealTitleError] = React.useState<string | null>(null);

  const initial = React.useMemo(() => {
    if (initialNodes && initialNodes.length >= 0 && (initialNodes.length > 0 || initialEdges)) {
      // Build from persisted nodes/edges (Phase 9d). Keep the deal node at the canvas center.
      const nodes: Node[] = [
        {
          id: deal.id,
          type: "deal",
          position: dealNodePosition || { x: CENTER_X - 130, y: CENTER_Y - 60 },
          data: deal as unknown as Record<string, unknown>,
        },
        ...initialNodes.map<Node>((n) => ({
          id: n.id,
          type: "entity",
          position: { x: n.position.x, y: n.position.y },
          data: {
            id: n.id,
            kind: n.kind,
            label: n.label,
            sublabel: n.sublabel,
            status: n.status || "neutral",
          } as unknown as Record<string, unknown>,
        })),
      ];
      const edges: Edge[] = (initialEdges || []).map<Edge>((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        animated: e.animated || false,
        style: { stroke: "rgba(86, 36, 199, 0.35)", strokeWidth: 1.5 },
      }));
      return { nodes, edges };
    }
    return buildInitial(deal, entities);
  }, [deal, entities, initialNodes, initialEdges, dealNodePosition]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [editingLabel, setEditingLabel] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<ViewMode>("relationship");
  const [activeToolPanel, setActiveToolPanel] = React.useState<DealFlowToolPanel | null>(null);
  const [canvasMode, setCanvasMode] = React.useState<CanvasInteractionMode>(initialCanvasMode);
  const [linkMode, setLinkMode] = React.useState(false);
  const [linkSourceId, setLinkSourceId] = React.useState<string | null>(null);
  const [activityOpen, setActivityOpen] = React.useState(false);
  const [share, setShare] = React.useState<ShareInfo | null>(null);
  const [shareLoading, setShareLoading] = React.useState(false);
  const [shareError, setShareError] = React.useState<string | null>(null);
  const [sharePermission, setSharePermission] = React.useState<string>("view");
  const [copyState, setCopyState] = React.useState<"idle" | "copied">("idle");
  // Edge style — user can flip between curved (bezier) and straight lines. Persisted to
  // localStorage so the choice survives reloads. Curved is the default per user preference.
  const [edgeStyle, setEdgeStyle] = React.useState<"curved" | "straight">(() => {
    if (typeof window === "undefined") return "curved";
    try {
      const stored = window.localStorage.getItem("adga-dealflow-edge-style");
      return stored === "straight" ? "straight" : "curved";
    } catch {
      return "curved";
    }
  });
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem("adga-dealflow-edge-style", edgeStyle); } catch {}
  }, [edgeStyle]);

  // Command bar state — the LLM prompt at the top of the canvas.
  const [commandValue, setCommandValue] = React.useState("");
  const [commandReply, setCommandReply] = React.useState<string | null>(null);
  const [commandSubmitting, setCommandSubmitting] = React.useState(false);
  const commandInputRef = React.useRef<HTMLInputElement | null>(null);
  const toolRailRef = React.useRef<HTMLDivElement | null>(null);
  const toolFlyoutRef = React.useRef<HTMLDivElement | null>(null);

  // Drop-to-ingest overlay state.
  const [ingestActive, setIngestActive] = React.useState(false);
  const [ingesting, setIngesting] = React.useState(false);

  // Live activity rail text. Subscribes to the client event bus mirror — events emitted by
  // the suite (suite.route_viewed, agent_job.*, deal.* etc) reach here in real time.
  const [activityText, setActivityText] = React.useState<string>("Dealflow loaded · live");
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    let unmounted = false;
    let dispose: (() => void) | undefined;
    import("@/lib/events/hooks").then((mod) => {
      if (unmounted) return;
      // useSuiteEvent is a hook, but the underlying emitter is module-level. Use the lower
      // level emit/subscribe via a tiny shim — open a synthetic channel by listening to a
      // wildcard via BroadcastChannel directly.
      if (!("BroadcastChannel" in window)) return;
      const ch = new BroadcastChannel("adga:events");
      const handler = (e: MessageEvent) => {
        const ev = e.data as { event_type?: string; payload?: Record<string, unknown> };
        if (!ev?.event_type) return;
        const tag = ev.event_type.replace(/_/g, " ");
        const detail = (ev.payload?.summary as string) || (ev.payload?.title as string) || (ev.payload?.label as string) || "";
        setActivityText(detail ? `${tag} · ${detail}` : tag);
      };
      ch.onmessage = handler;
      dispose = () => { ch.close(); };
      // Touch mod so the dynamic import isn't tree-shaken out
      void mod;
    }).catch(() => {});
    return () => { unmounted = true; if (dispose) dispose(); };
  }, []);

  // ⌘K focuses the command bar from anywhere in dealflow.
  React.useEffect(() => {
    if (readOnly) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setActiveToolPanel("search");
        commandInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readOnly]);

  React.useEffect(() => {
    if (!activeToolPanel || readOnly || typeof window === "undefined") return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof window.Node)) return;
      if (toolRailRef.current?.contains(target)) return;
      if (toolFlyoutRef.current?.contains(target)) return;
      setActiveToolPanel(null);
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, [activeToolPanel, readOnly]);

  const canShare = Boolean(dealFlowId) && !readOnly;

  const loadShare = React.useCallback(async () => {
    if (!dealFlowId) return;
    setShareLoading(true);
    setShareError(null);
    try {
      const res = await fetch(`/api/dealflows/${encodeURIComponent(dealFlowId)}/share`, { credentials: "include" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setShareError(body?.error || "Could not load share link.");
        setShare(null);
        return;
      }
      const next = (body?.share || null) as ShareInfo | null;
      setShare(next);
      if (next) setSharePermission(next.permission || "view");
    } catch {
      setShareError("Could not reach the share service.");
    } finally {
      setShareLoading(false);
    }
  }, [dealFlowId]);

  React.useEffect(() => {
    if (activeToolPanel === "share" && dealFlowId && !share && !shareLoading) {
      void loadShare();
    }
  }, [activeToolPanel, dealFlowId, share, shareLoading, loadShare]);

  const createOrRotateShare = React.useCallback(async () => {
    if (!dealFlowId) return;
    setShareLoading(true);
    setShareError(null);
    try {
      const res = await fetch(`/api/dealflows/${encodeURIComponent(dealFlowId)}/share`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission: sharePermission }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setShareError(body?.error || "Could not create share link.");
        return;
      }
      setShare((body?.share || null) as ShareInfo | null);
    } catch {
      setShareError("Could not reach the share service.");
    } finally {
      setShareLoading(false);
    }
  }, [dealFlowId, sharePermission]);

  const revokeShare = React.useCallback(async () => {
    if (!dealFlowId) return;
    setShareLoading(true);
    setShareError(null);
    try {
      const res = await fetch(`/api/dealflows/${encodeURIComponent(dealFlowId)}/share`, {
        method: "DELETE",
        credentials: "include",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setShareError(body?.error || "Could not revoke share link.");
        return;
      }
      setShare(null);
    } catch {
      setShareError("Could not reach the share service.");
    } finally {
      setShareLoading(false);
    }
  }, [dealFlowId]);

  const copyShareUrl = React.useCallback(async () => {
    if (!share?.url) return;
    try {
      await navigator.clipboard.writeText(share.url);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      setShareError("Copy failed. Select the link and copy manually.");
    }
  }, [share?.url]);

  // ─── Phase 9d persistence wiring ──────────────────────────────────────────
  // When `persistApiBase` is provided we auto-sync changes to D1 via the dealflows API.
  // Callers can also pass explicit callbacks to integrate with their own store.
  const persistEnabled = Boolean(persistApiBase) && !readOnly;
  const persistBaseRef = React.useRef(persistApiBase);
  persistBaseRef.current = persistApiBase;
  const pendingPositionsRef = React.useRef<Map<string, { x: number; y: number }>>(new Map());
  const positionFlushTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const knownNodeIdsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    setCurrentDeal(deal);
    setDealTitleDraft(deal.name);
    setNodes((nds) =>
      nds.map((node) =>
        node.id === deal.id
          ? { ...node, data: deal as unknown as Record<string, unknown> }
          : node,
      ),
    );
  }, [deal, setNodes]);

  // Seed the known-node set with everything that came from the server. Locally-added
  // nodes (with `new:` prefix) are tracked client-side until POST returns a real id.
  React.useEffect(() => {
    if (!persistEnabled) return;
    const set = new Set<string>([deal.id]);
    for (const node of initial.nodes) set.add(node.id);
    knownNodeIdsRef.current = set;
  }, [persistEnabled, deal.id, initial.nodes]);

  const hydratePersistedDealFlow = React.useCallback(async () => {
    const base = persistBaseRef.current;
    if (!base) return false;
    const res = await fetch(base, { credentials: "include" });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.ok) return false;
    const hydratedNodes = Array.isArray(body.nodes) ? body.nodes : [];
    const hydratedEdges = Array.isArray(body.edges) ? body.edges : [];
    setNodes([
      {
        id: deal.id,
        type: "deal",
        position: { x: CENTER_X - 130, y: CENTER_Y - 60 },
        data: currentDeal as unknown as Record<string, unknown>,
      },
      ...hydratedNodes.map((node: Record<string, unknown>) => ({
        id: String(node.id),
        type: "entity",
        position: {
          x: Number(node.position_x || 0),
          y: Number(node.position_y || 0),
        },
        data: {
          id: String(node.id),
          kind: node.kind === "deal" ? "action" : node.kind,
          label: String(node.label || "Untitled"),
          sublabel: typeof node.sublabel === "string" ? node.sublabel : undefined,
          status: typeof node.status === "string" ? node.status : "neutral",
          data: typeof node.data === "object" && node.data ? node.data : {},
        } as unknown as Record<string, unknown>,
      })) as Node[],
    ]);
    setEdges(
      hydratedEdges.map((edge: Record<string, unknown>) => ({
        id: String(edge.id),
        source: String(edge.source_node_id),
        target: String(edge.target_node_id),
        label: typeof edge.label === "string" ? edge.label : undefined,
        style: { stroke: "rgba(86, 36, 199, 0.35)", strokeWidth: 1.5 },
      })) as Edge[],
    );
    knownNodeIdsRef.current = new Set<string>([deal.id, ...hydratedNodes.map((node: Record<string, unknown>) => String(node.id))]);
    return true;
  }, [currentDeal, deal.id, setEdges, setNodes]);

  const flushPendingPositions = React.useCallback(() => {
    const base = persistBaseRef.current;
    const updates = Array.from(pendingPositionsRef.current.entries())
      .filter(([id]) => id !== deal.id && knownNodeIdsRef.current.has(id))
      .map(([id, position]) => ({ id, position }));
    pendingPositionsRef.current.clear();
    if (updates.length === 0) return;
    if (onPositionChange) onPositionChange(updates);
    if (!base) return;
    void fetch(`${base}/nodes`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        positions: updates.map((u) => ({
          id: u.id,
          position_x: u.position.x,
          position_y: u.position.y,
        })),
      }),
    }).catch(() => {});
  }, [deal.id, onPositionChange]);

  const schedulePositionFlush = React.useCallback(() => {
    if (positionFlushTimerRef.current) clearTimeout(positionFlushTimerRef.current);
    positionFlushTimerRef.current = setTimeout(flushPendingPositions, 300);
  }, [flushPendingPositions]);

  React.useEffect(() => {
    return () => {
      if (positionFlushTimerRef.current) clearTimeout(positionFlushTimerRef.current);
      flushPendingPositions();
    };
  }, [flushPendingPositions]);

  const handleNodesChange = React.useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(changes);
      if (!persistEnabled && !onPositionChange) return;
      let touched = false;
      for (const change of changes) {
        if (change.type === "position" && change.position && change.id !== deal.id) {
          pendingPositionsRef.current.set(change.id, change.position);
          touched = true;
        }
      }
      if (touched) schedulePositionFlush();
    },
    [onNodesChange, persistEnabled, onPositionChange, deal.id, schedulePositionFlush],
  );

  const handleEdgesChange = React.useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => {
      onEdgesChange(changes);
      for (const change of changes) {
        if (change.type === "remove") {
          if (onDeleteEdge) onDeleteEdge(change.id);
          const base = persistBaseRef.current;
          if (persistEnabled && base) {
            void fetch(`${base}/edges?edgeId=${encodeURIComponent(change.id)}`, {
              method: "DELETE",
              credentials: "include",
            }).catch(() => {});
          }
        }
      }
    },
    [onEdgesChange, persistEnabled, onDeleteEdge],
  );

  const selectedNode = React.useMemo(() => nodes.find((n) => n.id === selectedId) || null, [nodes, selectedId]);
  const connectedEdges = React.useMemo(
    () => (selectedId ? edges.filter((e) => e.source === selectedId || e.target === selectedId) : []),
    [edges, selectedId],
  );
  const connectedNodes = React.useMemo(() => {
    if (!selectedId) return [];
    const otherIds = connectedEdges.map((e) => (e.source === selectedId ? e.target : e.source));
    return otherIds.map((id) => nodes.find((n) => n.id === id)).filter((n): n is Node => !!n);
  }, [connectedEdges, nodes, selectedId]);

  const onConnect = React.useCallback(
    (connection: Connection) => {
      const newEdgeId = `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: newEdgeId,
            animated: false,
            style: { stroke: "var(--accent, #5d2cd6)", strokeWidth: 1.5 },
          },
          eds,
        ),
      );
      if (!connection.source || !connection.target) return;
      if (onAddEdge) onAddEdge({ id: newEdgeId, source: connection.source, target: connection.target });
      const base = persistBaseRef.current;
      if (persistEnabled && base) {
        void fetch(`${base}/edges`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: newEdgeId,
            source_node_id: connection.source,
            target_node_id: connection.target,
          }),
        }).catch(() => {});
      }
    },
    [setEdges, persistEnabled, onAddEdge],
  );

  const createEdgeBetween = React.useCallback((source: string, target: string) => {
    if (!source || !target || source === target) return;
    const newEdgeId = `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setEdges((eds) => {
      if (eds.some((edge) => edge.source === source && edge.target === target)) return eds;
      return eds.concat({
        id: newEdgeId,
        source,
        target,
        animated: false,
        style: { stroke: "var(--accent, #5d2cd6)", strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(93, 44, 214, 0.62)", width: 14, height: 14 },
      });
    });
    if (onAddEdge) onAddEdge({ id: newEdgeId, source, target });
    const base = persistBaseRef.current;
    if (persistEnabled && base) {
      void fetch(`${base}/edges`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: newEdgeId, source_node_id: source, target_node_id: target }),
      }).catch(() => {});
    }
  }, [onAddEdge, persistEnabled, setEdges]);

  const onNodeClick: NodeMouseHandler = React.useCallback((_event, node) => {
    if (canvasMode === "pan") {
      setSelectedId(node.id);
      setEditingLabel(false);
      return;
    }
    if (linkMode) {
      if (!linkSourceId) {
        setLinkSourceId(node.id);
      } else {
        createEdgeBetween(linkSourceId, node.id);
        setLinkSourceId(null);
        setLinkMode(false);
      }
    }
    setSelectedId(node.id);
    setEditingLabel(false);
  }, [canvasMode, createEdgeBetween, linkMode, linkSourceId]);

  const onPaneClick = React.useCallback(() => {
    if (canvasMode === "pan") return;
    setSelectedId(null);
    setLinkSourceId(null);
  }, [canvasMode]);

  const onSelectionChange = React.useCallback((params: OnSelectionChangeParams) => {
    if (params.nodes.length === 1) setSelectedId(params.nodes[0].id);
  }, []);

  // Keyboard navigation — J/K walk between nodes, E expands the detail panel,
  // Enter drills into a selected node, Escape clears selection. Skip when the
  // user is typing in any input/textarea/contenteditable.
  React.useEffect(() => {
    if (readOnly) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (target?.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (nodes.length === 0) return;

      if (e.key === "j" || e.key === "k") {
        e.preventDefault();
        const sorted = [...nodes].sort((a, b) => (a.position.y - b.position.y) || (a.position.x - b.position.x));
        const currentIdx = selectedId ? sorted.findIndex((n) => n.id === selectedId) : -1;
        const dir = e.key === "j" ? 1 : -1;
        const nextIdx = currentIdx === -1
          ? (dir === 1 ? 0 : sorted.length - 1)
          : (currentIdx + dir + sorted.length) % sorted.length;
        setSelectedId(sorted[nextIdx].id);
        return;
      }
      if ((e.key === "e" || e.key === "Enter") && selectedId) {
        e.preventDefault();
        setEditingLabel(true);
        return;
      }
      if (e.key === "Escape") {
        setSelectedId(null);
        setEditingLabel(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nodes, selectedId, readOnly]);

  const addNode = (kind: DealFlowEntityKind, status: DealFlowStatus = "neutral") => {
    const id = `mnode_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const label = `New ${KIND_META[kind].label}`;
    const sourceNode = selectedNode || nodes.find((node) => node.id === deal.id);
    const position = sourceNode
      ? { x: sourceNode.position.x + 240, y: sourceNode.position.y + (Math.random() - 0.5) * 180 }
      : { x: CENTER_X + 200, y: CENTER_Y + (Math.random() - 0.5) * 200 };
    const newNode: Node = {
      id,
      type: "entity",
      position,
      data: {
        id,
        kind,
        label,
        status,
      } as unknown as Record<string, unknown>,
    };
    const edgeId = `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setNodes((nds) => nds.concat(newNode));
    setEdges((eds) =>
      eds.concat({
        id: edgeId,
        source: selectedNode?.id || deal.id,
        target: id,
        style: { stroke: KIND_META[kind].ring, strokeWidth: 1.5 },
      }),
    );
    setSelectedId(id);

    if (onAddNode) onAddNode({ id, kind, label, status, position });
    const base = persistBaseRef.current;
    if (persistEnabled && base) {
      knownNodeIdsRef.current.add(id);
      void fetch(`${base}/nodes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          kind,
          label,
          status,
          position_x: position.x,
          position_y: position.y,
        }),
      }).catch(() => {});
      // Persist the implicit deal→node edge as well.
      void fetch(`${base}/edges`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: edgeId,
          source_node_id: selectedNode?.id || deal.id,
          target_node_id: id,
        }),
      }).catch(() => {});
    }
  };

  const addGroupNode = (childKind: DealFlowEntityKind, childrenCount = 0, labelOverride?: string, helperOverride?: string) => {
    const id = `mnode_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const childLabel = KIND_META[childKind]?.label || "Record";
    const label = labelOverride || `${childLabel}s`;
    const sourceNode = selectedNode || nodes.find((node) => node.id === deal.id);
    const position = sourceNode
      ? { x: sourceNode.position.x + 260, y: sourceNode.position.y + (Math.random() - 0.5) * 160 }
      : { x: CENTER_X + 220, y: CENTER_Y + (Math.random() - 0.5) * 180 };
    const data = {
      child_kind: childKind,
      children_count: childrenCount,
      hierarchy: "rollup",
    };
    const newNode: Node = {
      id,
      type: "entity",
      position,
      data: {
        id,
        kind: "group",
        label,
        sublabel: helperOverride || (childrenCount > 0 ? `${childrenCount.toLocaleString()} ${childLabel.toLowerCase()} records associated with this deal` : `Add ${childLabel.toLowerCase()} records without crowding the canvas`),
        status: "neutral",
        data,
      } as unknown as Record<string, unknown>,
    };
    const edgeId = `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setNodes((nds) => nds.concat(newNode));
    setEdges((eds) =>
      eds.concat({
        id: edgeId,
        source: selectedNode?.id || deal.id,
        target: id,
        style: { stroke: KIND_META.group.ring, strokeWidth: 1.5 },
      }),
    );
    setSelectedId(id);

    if (onAddNode) onAddNode({ id, kind: "group", label, sublabel: String(newNode.data.sublabel || ""), status: "neutral", position });
    const base = persistBaseRef.current;
    if (persistEnabled && base) {
      knownNodeIdsRef.current.add(id);
      void fetch(`${base}/nodes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          kind: "group",
          label,
          sublabel: newNode.data.sublabel,
          status: "neutral",
          position_x: position.x,
          position_y: position.y,
          data,
        }),
      }).catch(() => {});
      void fetch(`${base}/edges`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: edgeId,
          source_node_id: selectedNode?.id || deal.id,
          target_node_id: id,
        }),
      }).catch(() => {});
    }
  };

  const removeSelectedLinks = () => {
    if (!selectedId) return;
    const removing = edges.filter((edge) => edge.source === selectedId || edge.target === selectedId);
    setEdges((eds) => eds.filter((edge) => edge.source !== selectedId && edge.target !== selectedId));
    const base = persistBaseRef.current;
    if (persistEnabled && base) {
      for (const edge of removing) {
        void fetch(`${base}/edges?edgeId=${encodeURIComponent(edge.id)}`, {
          method: "DELETE",
          credentials: "include",
        }).catch(() => {});
      }
    }
  };

  const persistDroppedDocumentNode = React.useCallback(
    async (file: File, upload: Record<string, unknown>, index: number) => {
      const id = `mnode_doc_${Date.now().toString(36)}_${index}_${Math.random().toString(36).slice(2, 8)}`;
      const storageObject = (upload.storage_object || {}) as Record<string, unknown>;
      const document = (upload.document || {}) as Record<string, unknown>;
      const position = { x: CENTER_X + 240 + index * 34, y: CENTER_Y - 140 + index * 74 };
      const label = String(document.title || file.name);
      const sublabel = `${Math.round(file.size / 1024)} KB · R2 stored`;
      const newNode: Node = {
        id,
        type: "entity",
        position,
        data: {
          id,
          kind: "document",
          label,
          sublabel,
          status: "done",
        } as unknown as Record<string, unknown>,
      };
      const edgeId = `e_doc_${Date.now().toString(36)}_${index}_${Math.random().toString(36).slice(2, 8)}`;

      setNodes((nds) => nds.concat(newNode));
      setEdges((eds) =>
        eds.concat({
          id: edgeId,
          source: deal.id,
          target: id,
          style: { stroke: KIND_META.document.ring, strokeWidth: 1.5 },
        }),
      );
      setSelectedId(id);

      const base = persistBaseRef.current;
      if (!persistEnabled || !base) return;

      knownNodeIdsRef.current.add(id);
      await fetch(`${base}/nodes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          kind: "document",
          label,
          sublabel,
          status: "done",
          position_x: position.x,
          position_y: position.y,
          data: {
            document_id: document.id || null,
            storage_object_id: storageObject.id || null,
            r2_key: upload.key || storageObject.r2_key || null,
            file_name: file.name,
            mime_type: file.type || "application/octet-stream",
            size_bytes: file.size,
          },
        }),
      }).catch(() => {});

      await fetch(`${base}/edges`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: edgeId,
          source_node_id: deal.id,
          target_node_id: id,
          label: "Document",
        }),
      }).catch(() => {});
    },
    [deal.id, persistEnabled, setEdges, setNodes],
  );

  const removeSelected = () => {
    if (!selectedId || selectedId === deal.id) return;
    const removingId = selectedId;
    setNodes((nds) => nds.filter((n) => n.id !== removingId));
    setEdges((eds) => eds.filter((e) => e.source !== removingId && e.target !== removingId));
    setSelectedId(null);

    if (onDeleteNode) onDeleteNode(removingId);
    const base = persistBaseRef.current;
    if (persistEnabled && base) {
      knownNodeIdsRef.current.delete(removingId);
      void fetch(`${base}/nodes/${encodeURIComponent(removingId)}`, {
        method: "DELETE",
        credentials: "include",
      }).catch(() => {});
    }
  };

  const saveDealTitle = React.useCallback((title: string) => {
    const name = title.trim();
    if (!name) {
      setDealTitleError("Deal title is required.");
      return;
    }
    setDealTitleError(null);
    setDealTitleDraft(name);
    setDealTitleEditing(false);
    setCurrentDeal((current) => ({ ...current, name }));
    setNodes((nds) =>
      nds.map((node) =>
        node.id === deal.id
          ? { ...node, data: { ...(node.data as Record<string, unknown>), name } }
          : node,
      ),
    );

    const base = persistBaseRef.current;
    if (persistEnabled && base) {
      void fetch(base, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body?.error || "Could not save deal title.");
          }
        })
        .catch((err) => {
          setDealTitleError(err instanceof Error ? err.message : "Could not save deal title.");
        });
    }
  }, [deal.id, persistEnabled, setNodes]);

  const updateSelectedLabel = (label: string) => {
    if (!selectedId) return;
    if (selectedId === deal.id) {
      saveDealTitle(label);
      return;
    }
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedId
          ? {
              ...n,
              data: { ...(n.data as Record<string, unknown>), label },
            }
          : n,
      ),
    );

    const base = persistBaseRef.current;
    if (persistEnabled && base && selectedId !== deal.id && knownNodeIdsRef.current.has(selectedId)) {
      void fetch(`${base}/nodes/${encodeURIComponent(selectedId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      }).catch(() => {});
    }
  };

  const selectedKind = nodeKindFromNode(selectedNode);
  const isDealSelected = selectedKind === "deal";
  const selectedData = selectedNode?.data as unknown as (DealFlowEntity & DealFlowDeal) | undefined;
  const commandPlaceholder = selectedNode && !isDealSelected
    ? `Ask ADGA about ${selectedData?.label || "this node"}...`
    : `Ask ADGA about ${currentDeal.name}, or tell dealflow what to do...`;
  const visibleNodes = React.useMemo(() => {
    const active = VIEW_MODES.find((mode) => mode.id === viewMode);
    const activeKinds = new Set<string>(active?.kinds || []);
    return nodes.map((node) => {
      const kind = node.type === "deal" ? "deal" : ((node.data as { kind?: string }).kind || "");
      const emphasized = kind === "deal" || activeKinds.has(kind as DealFlowEntityKind);
      return {
        ...node,
        style: {
          ...(node.style || {}),
          opacity: emphasized ? 1 : 0.58,
          filter: emphasized ? "none" : "grayscale(0.24)",
        },
      };
    });
  }, [nodes, viewMode]);

  const persistNodeDetails = React.useCallback((nodeId: string, patch: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...(node.data as Record<string, unknown>), ...patch } }
          : node,
      ),
    );
    const base = persistBaseRef.current;
    if (persistEnabled && base && nodeId !== deal.id && knownNodeIdsRef.current.has(nodeId)) {
      void fetch(`${base}/nodes/${encodeURIComponent(nodeId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).catch(() => {});
    }
  }, [deal.id, persistEnabled, setNodes]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 600, display: "flex" }}>
      <style>{`
        @keyframes deal-node-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.25); opacity: 0.75; }
        }
        @keyframes premium-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes premium-slide-right {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .react-flow__attribution { display: none; }
        .react-flow__pane { cursor: ${canvasMode === "pan" ? "grab" : "default"}; }
        .react-flow__pane.dragging { cursor: ${canvasMode === "pan" ? "grabbing" : "default"}; }
        .react-flow__node { cursor: ${canvasMode === "pan" ? "pointer" : "grab"}; }
        .react-flow__node:hover { cursor: ${canvasMode === "pan" ? "pointer" : "grab"}; }
        .react-flow__node.dragging { cursor: ${canvasMode === "pan" ? "pointer" : "grabbing"}; }
        .react-flow__handle { transition: opacity 180ms ease; }
        .react-flow__node:hover .react-flow__handle { opacity: 1; }
        .react-flow__controls { box-shadow: 0 4px 14px -6px rgba(15, 23, 42, 0.12) !important; background: rgba(255, 255, 255, 0.96) !important; border: 1px solid rgba(15, 23, 42, 0.08) !important; backdrop-filter: blur(10px); border-radius: 10px; }
        .react-flow__controls button { background: transparent !important; border: 0 !important; color: rgba(15, 23, 42, 0.7) !important; }
        .react-flow__controls button:hover { background: rgba(86, 36, 199, 0.08) !important; color: #5d2cd6 !important; }
        .react-flow__minimap { border-radius: 12px !important; }
      `}</style>

      {/* Canvas */}
      <div
        style={{ flex: 1, position: "relative", minWidth: 0 }}
        onDragOver={(e) => { e.preventDefault(); setIngestActive(true); }}
        onDragLeave={(e) => { if (e.currentTarget === e.target) setIngestActive(false); }}
        onDrop={async (e) => {
          e.preventDefault();
          setIngestActive(false);
          const files = Array.from(e.dataTransfer?.files || []);
          const text = e.dataTransfer?.getData("text/plain") || "";
          if (files.length === 0 && !text) return;
          setIngesting(true);
          try {
            const uploadedFiles: Array<Record<string, unknown>> = [];
            for (const [index, file] of files.entries()) {
              const form = new FormData();
              form.set("file", file);
              form.set("deal_id", deal.id);
              form.set("folder", "dealflow");
              if (dealFlowId) form.set("map_id", dealFlowId);
              const uploadResponse = await fetch("/api/documents/upload", {
                method: "POST",
                credentials: "include",
                body: form,
              });
              const uploadBody = (await uploadResponse.json().catch(() => null)) as Record<string, unknown> | null;
              if (uploadResponse.ok && uploadBody?.ok) {
                uploadedFiles.push(uploadBody);
                await persistDroppedDocumentNode(file, uploadBody, index);
              }
            }

            await fetch("/api/agent/jobs", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                agent: "documents",
                job_type: "dealflow.ingest",
                prompt: text || `Ingest ${uploadedFiles.length || files.length} dropped file(s): ${files.map(f => f.name).join(", ")}`,
                context: {
                  dealFlowId,
                  dealId: deal.id,
                  fileNames: files.map(f => f.name),
                  uploadedFiles: uploadedFiles.map((item) => ({
                    document_id: (item.document as Record<string, unknown> | undefined)?.id || null,
                    storage_object_id: (item.storage_object as Record<string, unknown> | undefined)?.id || null,
                    r2_key: item.key || null,
                  })),
                  text,
                },
                run_now: true,
              }),
            }).catch(() => {});
          } finally {
            setIngesting(false);
          }
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 92,
            right: 16,
            zIndex: 18,
            display: "flex",
            alignItems: "center",
            gap: 8,
            maxWidth: "min(680px, calc(100% - 110px))",
            border: "1px solid rgba(15, 23, 42, 0.08)",
            borderRadius: 999,
            background: "rgba(255, 255, 255, 0.72)",
            boxShadow: "0 12px 34px -24px rgba(15, 23, 42, 0.26)",
            backdropFilter: "blur(18px)",
            padding: "6px 10px",
            color: "#0d0c0a",
          }}
          aria-label="Deal summary"
        >
          <span style={{ fontSize: 9.5, fontWeight: 850, letterSpacing: "0.12em", color: "#5d2cd6", whiteSpace: "nowrap" }}>{deal.id}</span>
          <span style={{ width: 1, height: 14, background: "rgba(15, 23, 42, 0.09)" }} />
          {dealTitleEditing && !readOnly ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, minWidth: 220, maxWidth: 360 }}>
              <input
                autoFocus
                value={dealTitleDraft}
                onChange={(event) => setDealTitleDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveDealTitle(dealTitleDraft);
                  if (event.key === "Escape") {
                    setDealTitleDraft(currentDeal.name);
                    setDealTitleEditing(false);
                    setDealTitleError(null);
                  }
                }}
                aria-label="Deal title"
                style={{
                  width: "100%",
                  minWidth: 0,
                  border: "1px solid rgba(93, 44, 214, 0.34)",
                  borderRadius: 999,
                  background: "#fff",
                  color: "#0d0c0a",
                  fontSize: 12,
                  fontWeight: 820,
                  outline: "none",
                  padding: "5px 9px",
                }}
              />
              <button
                type="button"
                onClick={() => saveDealTitle(dealTitleDraft)}
                aria-label="Save deal title"
                title="Save title"
                style={{ width: 24, height: 24, border: 0, borderRadius: 999, background: "#5d2cd6", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer", flex: "0 0 auto" }}
              >
                <Check size={13} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setDealTitleDraft(currentDeal.name);
                  setDealTitleEditing(false);
                  setDealTitleError(null);
                }}
                aria-label="Cancel deal title edit"
                title="Cancel"
                style={{ width: 24, height: 24, border: "1px solid rgba(15, 23, 42, 0.09)", borderRadius: 999, background: "#fff", color: "#6b6760", display: "grid", placeItems: "center", cursor: "pointer", flex: "0 0 auto" }}
              >
                <X size={13} />
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (readOnly) return;
                setDealTitleDraft(currentDeal.name);
                setDealTitleEditing(true);
              }}
              aria-label="Edit deal title"
              title="Edit deal title"
              style={{
                all: "unset",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                minWidth: 0,
                maxWidth: 360,
                cursor: readOnly ? "default" : "text",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, fontWeight: 820 }}>{currentDeal.name}</span>
              {!readOnly && <Edit3 aria-hidden="true" size={12} style={{ color: "#5d2cd6", flex: "0 0 auto" }} />}
            </button>
          )}
          <span style={{ fontSize: 11, fontWeight: 720, color: "#6b6760", whiteSpace: "nowrap" }}>{deal.stage}</span>
          {deal.value && <span style={{ fontSize: 11, fontWeight: 820, color: "#0d0c0a", whiteSpace: "nowrap" }}>{deal.value}</span>}
          {deal.nextAction && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11, color: "#6b6760" }}>Next: {deal.nextAction}</span>}
        </div>
        {dealTitleError && (
          <div
            role="alert"
            style={{
              position: "absolute",
              top: 58,
              left: 112,
              zIndex: 19,
              maxWidth: 360,
              border: "1px solid rgba(180, 35, 24, 0.18)",
              borderRadius: 10,
              background: "#fff",
              color: "#b42318",
              boxShadow: "0 16px 38px rgba(15, 23, 42, 0.12)",
              padding: "8px 10px",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {dealTitleError}
          </div>
        )}

        {/* Drop-to-ingest overlay — covers the canvas during dragover */}
        {ingestActive && (
          <div
            style={{
              position: "absolute", inset: 16, zIndex: 30,
              border: "2px dashed rgba(86, 36, 199, 0.55)",
              borderRadius: 18,
              background: "rgba(86, 36, 199, 0.10)",
              display: "grid", placeItems: "center",
              pointerEvents: "none",
              backdropFilter: "blur(2px)",
              animation: "premium-fade-in 140ms ease",
            }}
          >
            <div style={{ textAlign: "center", color: "rgba(255, 255, 255, 0.95)" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.7, marginBottom: 8 }}>Drop to ingest</div>
              <div style={{ fontSize: 22, fontWeight: 500 }}>Dealflow will absorb whatever you drop</div>
              <div style={{ marginTop: 8, fontSize: 13, opacity: 0.7 }}>Files · Emails · Voice notes · Contacts · URLs · Text</div>
            </div>
          </div>
        )}

        {!readOnly && (
          <div
            ref={toolRailRef}
            style={{
              position: "absolute",
              top: 64,
              left: 16,
              zIndex: 24,
              display: "grid",
              gap: 6,
              border: "1px solid rgba(15, 23, 42, 0.10)",
              borderRadius: 14,
              background: "rgba(255, 255, 255, 0.94)",
              boxShadow: "0 18px 48px -22px rgba(15, 23, 42, 0.24)",
              backdropFilter: "blur(16px)",
              padding: 6,
            }}
            aria-label="DealFlow tools"
          >
            {([
              ["select", MousePointer2, "Select and edit"],
              ["pan", Hand, "Hand tool: move canvas"],
            ] as const).map(([mode, Icon, label]) => {
              const active = canvasMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  title={label}
                  aria-label={label}
                  onClick={() => {
                    setCanvasMode(mode);
                    setLinkMode(false);
                    setLinkSourceId(null);
                    if (mode === "pan") {
                      setActiveToolPanel(null);
                      setEditingLabel(false);
                    }
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    border: 0,
                    borderRadius: 10,
                    background: active ? "rgba(93, 44, 214, 0.12)" : "transparent",
                    color: active ? "#5d2cd6" : "#0d0c0a",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Icon size={16} strokeWidth={2.2} />
                </button>
              );
            })}
            <span aria-hidden style={{ width: 24, height: 1, justifySelf: "center", background: "rgba(15, 23, 42, 0.10)" }} />
            {([
              ["search", Search, "Search with ADGA"],
              ["nodes", Plus, "Add nodes"],
              ["links", Link2, "Connect nodes"],
              ["style", Palette, "Color code"],
              ["view", SlidersHorizontal, "Views"],
              ...(canShare ? ([["share", Share2, "Share"]] as const) : []),
            ] as const).map(([panel, Icon, label]) => {
              const active = activeToolPanel === panel;
              return (
                <button
                  key={panel}
                  type="button"
                  title={label}
                  aria-label={label}
                  onClick={() => {
                    setCanvasMode("select");
                    setActiveToolPanel((current) => (current === panel ? null : panel));
                    if (panel === "search") setTimeout(() => commandInputRef.current?.focus(), 0);
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    border: 0,
                    borderRadius: 10,
                    background: active ? "rgba(93, 44, 214, 0.12)" : "transparent",
                    color: active ? "#5d2cd6" : "#0d0c0a",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Icon size={16} strokeWidth={2.2} />
                </button>
              );
            })}
            {activeToolPanel && (
              <button
                type="button"
                title="Close tool"
                aria-label="Close tool"
                onClick={() => setActiveToolPanel(null)}
                style={{
                  width: 36,
                  height: 30,
                  border: 0,
                  borderTop: "1px solid rgba(15, 23, 42, 0.08)",
                  borderRadius: 9,
                  background: "transparent",
                  color: "#6b6760",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* LLM command panel — compact flyout from the left rail. */}
        {activeToolPanel === "search" && !readOnly && (
          <div
            ref={toolFlyoutRef}
            style={{
              position: "absolute", top: 64, left: 66, transform: "none",
              zIndex: 20, width: 330,
              animation: "premium-fade-in 200ms ease",
            }}
          >
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const value = commandValue.trim();
                if (!value) return;
                setCommandSubmitting(true);
                try {
                  const res = await fetch("/api/agent/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      messages: [{ role: "user", content: value }],
                      context: {
                        kind: "dealflow",
                        dealFlowId,
                        deal: { id: deal.id, name: currentDeal.name, stage: deal.stage, value: deal.value, nextAction: deal.nextAction },
                        selectedNode: selectedNode ? {
                          id: selectedNode.id,
                          kind: selectedKind,
                          label: selectedData?.label || selectedData?.name || selectedNode.id,
                          sublabel: selectedData?.sublabel || null,
                          status: selectedData?.status || null,
                        } : null,
                        viewMode,
                        nodeCount: nodes.length,
                        edgeCount: edges.length,
                      },
                    }),
                  });
                  const json = (await res.json().catch(() => null)) as AgentChatResponse | null;
                  if (!res.ok || !json?.ok) {
                    setCommandReply(json?.error || "ADGA could not complete that request.");
                    return;
                  }
                  const actionResults = Array.isArray(json.action_results) ? json.action_results : [];
                  const searchResults = actionResults
                    .flatMap((result) => result.data?.results || [])
                    .filter((result) => result.title || result.url)
                    .slice(0, 5);
                  const resultSummary = actionResults
                    .filter((result) => result.message)
                    .map((result) => result.message)
                    .slice(0, 4)
                    .join("\n");
                  const searchSummary = searchResults.length
                    ? `\n\nResults:\n${searchResults.map((result) => `- ${result.title || result.id}${result.url ? ` (${result.url})` : ""}`).join("\n")}`
                    : "";
                  setCommandReply([agentMessageText(json.message), resultSummary].filter(Boolean).join("\n\n") + searchSummary);
                  setCommandValue("");
                  const executedCanvasMutation = actionResults.some((result) =>
                    result.status === "executed" &&
                    ["create_dealflow", "update_dealflow", "add_node", "create_node", "update_node", "archive_node", "add_edge", "create_edge"].includes(result.action_type || ""),
                  );
                  if (executedCanvasMutation) {
                    const createdDealFlow = actionResults.find((result) =>
                      result.status === "executed" &&
                      result.action_type === "create_dealflow" &&
                      result.resource_type === "dealflow" &&
                      result.resource_id &&
                      result.resource_id !== dealFlowId,
                    );
                    if (createdDealFlow?.resource_id) {
                      router.push(`/suite/dealflow/${encodeURIComponent(createdDealFlow.resource_id)}`);
                      return;
                    }
                    const hydrated = await hydratePersistedDealFlow();
                    if (!hydrated) router.refresh();
                  }
                } finally {
                  setCommandSubmitting(false);
                }
              }}
            >
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "rgba(255, 255, 255, 0.96)",
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  borderRadius: 14,
                  padding: "10px 12px",
                  backdropFilter: "blur(16px)",
                  boxShadow: "0 20px 60px -20px rgba(15, 23, 42, 0.22), 0 2px 8px -2px rgba(15, 23, 42, 0.08)",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 999, background: commandSubmitting ? "#f59e0b" : "#5d2cd6", boxShadow: `0 0 12px ${commandSubmitting ? "#f59e0b" : "#5d2cd6"}` }} aria-hidden />
                <input
                  ref={commandInputRef}
                  value={commandValue}
                  onChange={(e) => setCommandValue(e.target.value)}
                  placeholder={commandPlaceholder}
                  disabled={commandSubmitting}
                  style={{
                    flex: 1, background: "transparent", border: 0, outline: "none",
                    color: "#0d0c0a", fontSize: 13, letterSpacing: "0.005em",
                    fontFamily: "inherit",
                  }}
                />
                <kbd style={{ fontSize: 10, letterSpacing: "0.08em", color: "#6b6760", border: "1px solid rgba(15, 23, 42, 0.12)", borderRadius: 4, padding: "1px 5px" }}>⌘K</kbd>
              </div>
              {commandReply && (
                <div style={{
                  marginTop: 8,
                  padding: "10px 14px",
                  background: "rgba(255, 255, 255, 0.96)",
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  borderRadius: 12,
                  color: "#0d0c0a",
                  fontSize: 13, lineHeight: 1.5,
                  backdropFilter: "blur(16px)",
                  animation: "premium-fade-in 160ms ease",
                  boxShadow: "0 10px 30px -16px rgba(15, 23, 42, 0.18)",
                }}>
                  {commandReply}
                </div>
              )}
            </form>
          </div>
        )}

        {/* Live activity rail — bottom strip. Subscribes to bus events via useSuiteEvent
            so the operator can see system pulse without leaving dealflow. */}
        <div
          style={{
            position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
            zIndex: 15, maxWidth: "min(720px, calc(100% - 280px))",
            display: "flex", gap: 8, alignItems: "center",
            background: "rgba(255, 255, 255, 0.92)",
            border: "1px solid rgba(15, 23, 42, 0.08)",
            borderRadius: 999, padding: "8px 14px",
            backdropFilter: "blur(14px)",
            fontSize: 11.5, letterSpacing: "0.02em",
            color: "#0d0c0a",
            boxShadow: "0 12px 40px -20px rgba(15, 23, 42, 0.18)",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
          aria-label="Live activity"
          role="button"
          tabIndex={0}
          onClick={() => setActivityOpen((open) => !open)}
          onKeyDown={(event) => {
            if (event.key === "Enter") setActivityOpen((open) => !open);
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 999, background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
          <span style={{ letterSpacing: "0.16em", fontSize: 10, textTransform: "uppercase", color: "#6b6760" }}>Live</span>
          <span style={{ width: 1, height: 12, background: "rgba(15, 23, 42, 0.10)" }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{activityText}</span>
        </div>

        {activityOpen && (
          <div
            style={{
              position: "absolute",
              bottom: 58,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 16,
              width: "min(520px, calc(100% - 320px))",
              border: "1px solid rgba(15, 23, 42, 0.08)",
              borderRadius: 14,
              background: "rgba(255, 255, 255, 0.96)",
              boxShadow: "0 24px 70px -28px rgba(15, 23, 42, 0.28)",
              backdropFilter: "blur(16px)",
              padding: 12,
            }}
          >
            {[
              ["Now", activityText],
              ["Files", `${nodes.filter((node) => (node.data as { kind?: string }).kind === "document").length} document nodes attached`],
              ["Tasks", `${nodes.filter((node) => ["task", "action"].includes((node.data as { kind?: string }).kind || "")).length} next-step nodes in DealFlow`],
              ["Risk", `${nodes.filter((node) => (node.data as { status?: string }).status === "overdue" || (node.data as { status?: string }).status === "warning").length} nodes need attention`],
            ].map(([label, body]) => (
              <div key={label} style={{ display: "grid", gridTemplateColumns: "64px minmax(0,1fr)", gap: 10, padding: "8px 4px", borderBottom: "1px solid #f1ede8" }}>
                <div style={{ fontSize: 10, fontWeight: 850, letterSpacing: "0.12em", color: "#6b6760", textTransform: "uppercase" }}>{label}</div>
                <div style={{ fontSize: 12.5, color: "#0d0c0a" }}>{body}</div>
              </div>
            ))}
          </div>
        )}

        {/* Compact tool flyouts. The canvas stays open; only the requested tool expands. */}
        {activeToolPanel && activeToolPanel !== "search" && !readOnly && (
          <div
            ref={toolFlyoutRef}
            style={{
              position: "absolute",
              top: 64,
              left: 66,
              zIndex: 20,
              width: activeToolPanel === "share" ? 340 : 298,
              maxHeight: "calc(100% - 126px)",
              overflow: "auto",
              border: "1px solid rgba(15, 23, 42, 0.08)",
              borderRadius: 16,
              background: "rgba(255, 255, 255, 0.94)",
              boxShadow: "0 18px 54px -28px rgba(15, 23, 42, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.72)",
              backdropFilter: "blur(22px)",
              padding: 10,
              animation: "premium-fade-in 160ms ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 9, padding: "2px 2px 0" }}>
              <div style={{ fontSize: 10, fontWeight: 850, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6b6760" }}>
                {activeToolPanel === "nodes" && "Node library"}
                {activeToolPanel === "style" && "Color code"}
                {activeToolPanel === "links" && "Links"}
                {activeToolPanel === "view" && "Canvas view"}
                {activeToolPanel === "share" && "Share dealflow"}
              </div>
              <button
                type="button"
                aria-label="Close panel"
                onClick={() => setActiveToolPanel(null)}
                style={{ width: 24, height: 24, border: 0, borderRadius: 8, background: "transparent", color: "#6b6760", cursor: "pointer", display: "grid", placeItems: "center", padding: 0 }}
              >
                <X size={14} />
              </button>
            </div>

            {activeToolPanel === "nodes" && (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gap: 7 }}>
                  {COLLECTION_PRESETS.map(({ childKind, label, helper, defaultCount }) => (
                    <button
                      key={`${childKind}-${label}`}
                      type="button"
                      onClick={() => addGroupNode(childKind, defaultCount || 0, label, helper)}
                      title={`Create ${label}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "12px minmax(0, 1fr)",
                        alignItems: "center",
                        gap: 9,
                        minWidth: 0,
                        padding: "9px 10px",
                        background: "rgba(93, 44, 214, 0.055)",
                        border: "1px solid rgba(93, 44, 214, 0.12)",
                        borderRadius: 11,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span style={{ width: 10, height: 10, borderRadius: 4, background: KIND_META[childKind].color }} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12.2, fontWeight: 820, color: "#0d0c0a" }}>{label}</span>
                        <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10.8, fontWeight: 650, color: "#6b6760", marginTop: 2 }}>{helper}</span>
                      </span>
                    </button>
                  ))}
                </div>
                <div style={{ height: 1, background: "rgba(15, 23, 42, 0.07)" }} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 7 }}>
                  {KINDS_TO_ADD.map((kind) => {
                    const meta = KIND_META[kind];
                    return (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => addNode(kind)}
                        title={`Create ${meta.label} node`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "12px minmax(0, 1fr)",
                          alignItems: "center",
                          gap: 8,
                          minWidth: 0,
                          height: 42,
                          padding: "0 10px",
                          background: "rgba(255, 255, 255, 0.78)",
                          border: `1px solid rgba(15, 23, 42, 0.08)`,
                          borderRadius: 11,
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 760,
                          color: "#0d0c0a",
                          textAlign: "left",
                        }}
                      >
                        <span style={{ width: 10, height: 10, borderRadius: 999, background: meta.color }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={removeSelected}
                  disabled={!selectedId || isDealSelected}
                  style={{
                    display: "inline-flex",
                    width: "fit-content",
                    alignItems: "center",
                    gap: 7,
                    padding: "8px 10px",
                    borderRadius: 9,
                    border: "1px solid rgba(239, 68, 68, 0.16)",
                    background: "rgba(255, 255, 255, 0.72)",
                    color: !selectedId || isDealSelected ? "#b8baca" : "#ef4444",
                    fontSize: 12,
                    fontWeight: 720,
                    cursor: !selectedId || isDealSelected ? "not-allowed" : "pointer",
                  }}
                >
                  <Trash2 size={14} />
                  Remove selected
                </button>
              </div>
            )}

            {activeToolPanel === "style" && (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ padding: "8px 10px", border: "1px solid rgba(15, 23, 42, 0.07)", borderRadius: 11, background: "rgba(249, 247, 244, 0.58)", fontSize: 12, color: "#45413b", lineHeight: 1.45 }}>
                  {selectedId && !isDealSelected
                    ? `Selected: ${selectedData?.label || selectedId}`
                    : "Select a node to apply a status color."}
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {(Object.entries(STATUS_META) as Array<[DealFlowStatus, (typeof STATUS_META)[DealFlowStatus]]>).map(([key, item]) => (
                    <button
                      key={key}
                      type="button"
                      disabled={!selectedId || isDealSelected}
                      onClick={() => selectedId && persistNodeDetails(selectedId, { status: key })}
                      title={selectedId && !isDealSelected ? `Set selected node to ${item.label}` : "Select a node first"}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        height: 36,
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        borderRadius: 11,
                        background: "rgba(255, 255, 255, 0.78)",
                        color: !selectedId || isDealSelected ? "#b8baca" : "#0d0c0a",
                        cursor: !selectedId || isDealSelected ? "not-allowed" : "pointer",
                        fontSize: 12,
                        fontWeight: 760,
                        padding: "0 10px",
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 999, background: item.dot || "#d8d6d0", border: key === "neutral" ? "1px solid rgba(15, 23, 42, 0.18)" : 0 }} />
                        {item.label}
                      </span>
                      {selectedData?.status === key && <span style={{ color: "#5d2cd6", fontSize: 11, fontWeight: 850 }}>Current</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeToolPanel === "links" && (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ padding: "8px 10px", border: "1px solid rgba(15, 23, 42, 0.07)", borderRadius: 11, background: "rgba(249, 247, 244, 0.58)", fontSize: 12, color: "#45413b", lineHeight: 1.45 }}>
                  {linkMode
                    ? linkSourceId ? "Click the target node to complete the connection." : "Click the source node first."
                    : "Start link mode, then click two nodes to draw a connection."}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLinkMode((mode) => !mode);
                    setLinkSourceId(selectedId || null);
                  }}
                  style={{
                    display: "inline-flex",
                    width: "fit-content",
                    alignItems: "center",
                    gap: 8,
                    padding: "9px 12px",
                    borderRadius: 9,
                    border: "1px solid rgba(93, 44, 214, 0.18)",
                    background: linkMode ? "rgba(93, 44, 214, 0.12)" : "rgba(255, 255, 255, 0.78)",
                    color: "#5d2cd6",
                    fontSize: 12,
                    fontWeight: 780,
                    cursor: "pointer",
                  }}
                  title={linkMode ? "Click another node to finish linking" : "Start link mode"}
                >
                  <Link2 size={14} />
                  {linkMode ? (linkSourceId ? "Pick target" : "Pick source") : "Start link mode"}
                </button>
                <button
                  type="button"
                  onClick={removeSelectedLinks}
                  disabled={!selectedId || connectedEdges.length === 0}
                  style={{
                    display: "inline-flex",
                    width: "fit-content",
                    alignItems: "center",
                    gap: 7,
                    padding: "8px 10px",
                    borderRadius: 9,
                    border: "1px solid rgba(239, 68, 68, 0.16)",
                    background: "rgba(255, 255, 255, 0.72)",
                    color: !selectedId || connectedEdges.length === 0 ? "#b8baca" : "#ef4444",
                    fontSize: 12,
                    fontWeight: 720,
                    cursor: !selectedId || connectedEdges.length === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  <Trash2 size={14} />
                  Delete selected links
                </button>
                <div style={{ fontSize: 11.5, color: "#6b6760" }}>
                  {selectedId ? `${connectedEdges.length} connected link${connectedEdges.length === 1 ? "" : "s"}` : "No node selected"}
                </div>
              </div>
            )}

            {activeToolPanel === "view" && (
              <div style={{ display: "grid", gap: 10 }}>
                <div role="group" aria-label="Dealflow view mode" style={{ display: "grid", gap: 6 }}>
                  {VIEW_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setViewMode(mode.id)}
                      title={`${mode.label} view`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 10px",
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        borderRadius: 11,
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 720,
                        background: viewMode === mode.id ? "rgba(93, 44, 214, 0.10)" : "rgba(255, 255, 255, 0.78)",
                        color: viewMode === mode.id ? "#5d2cd6" : "#0d0c0a",
                      }}
                    >
                      {mode.label}
                      {viewMode === mode.id && <span style={{ fontSize: 10, fontWeight: 850 }}>Active</span>}
                    </button>
                  ))}
                </div>
                <div role="group" aria-label="Edge style" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {(["curved", "straight"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setEdgeStyle(opt)}
                      title={opt === "curved" ? "Curved edges" : "Straight edges"}
                      style={{
                        padding: "8px 10px",
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        borderRadius: 11,
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 720,
                        background: edgeStyle === opt ? "rgba(93, 44, 214, 0.10)" : "rgba(255, 255, 255, 0.78)",
                        color: edgeStyle === opt ? "#5d2cd6" : "#0d0c0a",
                        textTransform: "capitalize",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 11.5, color: "#6b6760" }}>
                  {nodes.length} nodes / {edges.length} edges
                </div>
              </div>
            )}

            {activeToolPanel === "share" && canShare && (
              <div style={{ display: "grid", gap: 10 }}>
                <label style={{ display: "grid", gap: 5, fontSize: 11, color: "#6b6760" }}>
                  Permission
                  <select
                    value={sharePermission}
                    onChange={(e) => setSharePermission(e.target.value)}
                    disabled={shareLoading}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 9,
                      border: "1px solid #e8e4de",
                      background: "#ffffff",
                      fontSize: 12.5,
                      color: "#0d0c0a",
                    }}
                  >
                    <option value="view">View only</option>
                    <option value="comment">Comment</option>
                    <option value="edit">Edit</option>
                  </select>
                </label>

                {shareError && (
                  <div style={{ padding: "6px 8px", background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 8, fontSize: 11.5 }}>
                    {shareError}
                  </div>
                )}

                {share ? (
                  <>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        readOnly
                        value={share.url}
                        onFocus={(e) => e.currentTarget.select()}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          padding: "8px 10px",
                          borderRadius: 9,
                          border: "1px solid #e8e4de",
                          fontSize: 11.5,
                          color: "#0d0c0a",
                          background: "#f9f7f4",
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                        }}
                      />
                      <button
                        type="button"
                        onClick={copyShareUrl}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 9,
                          border: 0,
                          background: "#5d2cd6",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 760,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {copyState === "copied" ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        onClick={createOrRotateShare}
                        disabled={shareLoading}
                        style={{
                          flex: 1,
                          padding: "8px 10px",
                          borderRadius: 9,
                          border: "1px solid #e8e4de",
                          background: "#ffffff",
                          color: "#0d0c0a",
                          fontSize: 12,
                          cursor: shareLoading ? "wait" : "pointer",
                        }}
                      >
                        Rotate link
                      </button>
                      <button
                        type="button"
                        onClick={revokeShare}
                        disabled={shareLoading}
                        style={{
                          flex: 1,
                          padding: "8px 10px",
                          borderRadius: 9,
                          border: "1px solid #fecaca",
                          background: "#fef2f2",
                          color: "#b91c1c",
                          fontSize: 12,
                          cursor: shareLoading ? "wait" : "pointer",
                        }}
                      >
                        Revoke
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={createOrRotateShare}
                    disabled={shareLoading}
                    style={{
                      width: "fit-content",
                      padding: "9px 12px",
                      borderRadius: 9,
                      border: 0,
                      background: "#5d2cd6",
                      color: "#fff",
                      fontSize: 12.5,
                      fontWeight: 760,
                      cursor: shareLoading ? "wait" : "pointer",
                    }}
                  >
                    {shareLoading ? "Working..." : "Create share link"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <ReactFlow
          nodes={visibleNodes}
          edges={React.useMemo(() => edges.map(e => ({ ...e, type: edgeStyle === "straight" ? "straight" : "default" })), [edges, edgeStyle])}
          nodeTypes={nodeTypes}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onSelectionChange={onSelectionChange}
          nodesDraggable={!readOnly && canvasMode === "select"}
          nodesConnectable={!readOnly && canvasMode === "select"}
          elementsSelectable
          fitView={fitViewOnInit}
          defaultViewport={initialViewport}
          fitViewOptions={{ padding: 0.22 }}
          proOptions={{ hideAttribution: true }}
          minZoom={0.3}
          maxZoom={1.6}
          panOnDrag={canvasMode === "pan" ? true : [2]}
          panOnScroll
          selectionOnDrag={!readOnly && canvasMode === "select"}
          selectionMode={SelectionMode.Partial}
          snapToGrid
          snapGrid={[16, 16]}
          deleteKeyCode={readOnly ? [] : ["Backspace", "Delete"]}
          defaultEdgeOptions={{
            type: edgeStyle === "straight" ? "straight" : "default",
            animated: false,
            style: { stroke: "rgba(15, 23, 42, 0.32)", strokeWidth: 1.25 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(15, 23, 42, 0.4)", width: 14, height: 14 },
          }}
        >
          <Background variant={BackgroundVariant.Dots} gap={26} size={1} color="rgba(15, 23, 42, 0.10)" />
          <Controls position="bottom-right" showInteractive={false} />
          <MiniMap
            position="bottom-left"
            pannable
            zoomable
            ariaLabel="Dealflow overview"
            maskColor="rgba(249, 247, 244, 0.74)"
            style={{
              border: "1px solid rgba(15, 23, 42, 0.08)",
              borderRadius: 12,
              background: "rgba(255, 255, 255, 0.94)",
              boxShadow: "0 4px 16px -8px rgba(15, 23, 42, 0.18)",
              backdropFilter: "blur(10px)",
            }}
            nodeColor={(n) => {
              const kind = (n.data as { kind?: string } | undefined)?.kind || n.type;
              const colors: Record<string, string> = {
                deal: "#5d2cd6",
                contact: "#16a34a",
                company: "#0ea5e9",
                document: "#f59e0b",
                task: "#a855f7",
                call: "#ef4444",
                meeting: "#3b82f6",
                action: "#5d2cd6",
              };
              return colors[kind || ""] || "#94a3b8";
            }}
            nodeStrokeWidth={0}
          />
        </ReactFlow>
      </div>

      {/* Right-side detail panel */}
      {selectedNode && (
        <aside
          style={{
            width: 344,
            flexShrink: 0,
            background: "rgba(255, 255, 255, 0.96)",
            borderLeft: "1px solid rgba(15, 23, 42, 0.08)",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            boxShadow: "-18px 0 44px -34px rgba(15, 23, 42, 0.22)",
          }}
        >
          <NodeDetailPanel
            node={selectedNode}
            connected={connectedNodes}
            connectedEdges={connectedEdges}
            isDeal={isDealSelected}
            editing={editingLabel && !readOnly}
            readOnly={readOnly}
            onEditStart={() => {
              if (!readOnly) setEditingLabel(true);
            }}
            onEditCommit={(value) => {
              if (readOnly) return;
              updateSelectedLabel(value);
              setEditingLabel(false);
            }}
            onPatch={(patch) => {
              if (readOnly) return;
              persistNodeDetails(selectedNode.id, patch);
            }}
            onEditCancel={() => setEditingLabel(false)}
            onClose={() => setSelectedId(null)}
            onRemove={removeSelected}
            onJump={(id) => setSelectedId(id)}
          />
        </aside>
      )}
    </div>
  );
}

interface NodeDetailPanelProps {
  node: Node;
  connected: Node[];
  connectedEdges: Edge[];
  isDeal: boolean;
  editing: boolean;
  readOnly?: boolean;
  onEditStart: () => void;
  onEditCommit: (value: string) => void;
  onPatch: (patch: Record<string, unknown>) => void;
  onEditCancel: () => void;
  onClose: () => void;
  onRemove: () => void;
  onJump: (id: string) => void;
}

function NodeDetailPanel({
  node,
  connected,
  connectedEdges,
  isDeal,
  editing,
  readOnly = false,
  onEditStart,
  onEditCommit,
  onPatch,
  onEditCancel,
  onClose,
  onRemove,
  onJump,
}: NodeDetailPanelProps) {
  const data = node.data as unknown as DealFlowEntity & DealFlowDeal;
  const kind = isDeal ? "deal" : data.kind;
  const meta = isDeal ? null : KIND_META[data.kind];
  const status = data.status ? STATUS_META[data.status] : null;
  const [labelDraft, setLabelDraft] = React.useState(data.label || (isDeal ? data.name : ""));
  const details = (data as unknown as { data?: Record<string, unknown>; notes?: string; next_step?: string; related_record?: string }).data || {};
  const [notesDraft, setNotesDraft] = React.useState(String(details.notes || (data as unknown as { notes?: string }).notes || ""));
  const [nextStepDraft, setNextStepDraft] = React.useState(String(details.next_step || (data as unknown as { next_step?: string }).next_step || ""));

  React.useEffect(() => {
    setLabelDraft(data.label || (isDeal ? data.name : ""));
    setNotesDraft(String(details.notes || (data as unknown as { notes?: string }).notes || ""));
    setNextStepDraft(String(details.next_step || (data as unknown as { next_step?: string }).next_step || ""));
  }, [data.label, data.name, isDeal, node.id]);

  const headerBadgeColor = isDeal ? "#5d2cd6" : meta!.color;
  const headerBadgeLabel = isDeal ? `Deal · ${data.stage}` : meta!.label;

  return (
    <>
      <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid rgba(15, 23, 42, 0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 850,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: headerBadgeColor,
            }}
          >
            {headerBadgeLabel}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 28,
              height: 28,
              borderRadius: 9,
              border: 0,
              background: "transparent",
              color: "#6b6760",
              fontSize: 18,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {editing ? (
          <div>
            <input
              autoFocus
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onEditCommit(labelDraft.trim() || "Untitled");
                if (e.key === "Escape") onEditCancel();
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #c4c5bc",
                fontSize: 16,
                fontWeight: 760,
                color: "#0d0c0a",
                outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => onEditCommit(labelDraft.trim() || "Untitled")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: 0,
                  background: "#5d2cd6",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={onEditCancel}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid #e8e4de",
                  background: "#ffffff",
                  color: "#6b6760",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : readOnly ? (
          <div
            style={{
              fontSize: 17,
              fontWeight: 780,
              color: "#0d0c0a",
              lineHeight: 1.25,
            }}
          >
            {isDeal ? data.name : data.label}
          </div>
        ) : (
          <button
            type="button"
            onClick={onEditStart}
            style={{
              all: "unset",
              cursor: "text",
              display: "block",
              fontSize: 17,
              fontWeight: 780,
              color: "#0d0c0a",
              lineHeight: 1.25,
            }}
          >
            {isDeal ? data.name : data.label}
          </button>
        )}

        {!isDeal && data.sublabel && (
          <div style={{ fontSize: 12, color: "#6b6760", marginTop: 6 }}>{data.sublabel}</div>
        )}

        {status && (
          <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: status.dot || "#cbd5e1" }} />
              <span style={{ color: "#6b6760", fontWeight: 720 }}>{status.label}</span>
          </div>
        )}

        {!isDeal && data.kind === "group" && !readOnly && (
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <label style={{ display: "grid", gap: 4, fontSize: 10, fontWeight: 800, color: "#6b6760", textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Child type
              <select
                value={String(details.child_kind || "contact")}
                onChange={(event) => onPatch({ data: { ...details, child_kind: event.target.value } })}
                style={{ height: 34, border: "1px solid rgba(15, 23, 42, 0.10)", borderRadius: 9, background: "#fff", color: "#0d0c0a", padding: "0 8px", fontSize: 12 }}
              >
                {KINDS_TO_ADD.filter((kind) => kind !== "group").map((kind) => <option key={kind} value={kind}>{KIND_META[kind].label}</option>)}
              </select>
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 10, fontWeight: 800, color: "#6b6760", textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Records
              <input
                type="number"
                min={0}
                value={Number(details.children_count || 0)}
                onChange={(event) => onPatch({ data: { ...details, children_count: Number(event.target.value || 0) } })}
                style={{ height: 34, border: "1px solid rgba(15, 23, 42, 0.10)", borderRadius: 9, background: "#fff", color: "#0d0c0a", padding: "0 8px", fontSize: 12 }}
              />
            </label>
          </div>
        )}

        {!isDeal && !readOnly && (
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <label style={{ display: "grid", gap: 4, fontSize: 10, fontWeight: 800, color: "#6b6760", textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Type
              <select
                value={data.kind}
                onChange={(event) => onPatch({ kind: event.target.value })}
                style={{ height: 34, border: "1px solid rgba(15, 23, 42, 0.10)", borderRadius: 9, background: "#fff", color: "#0d0c0a", padding: "0 8px", fontSize: 12 }}
              >
                {KINDS_TO_ADD.map((kind) => <option key={kind} value={kind}>{KIND_META[kind].label}</option>)}
              </select>
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 10, fontWeight: 800, color: "#6b6760", textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Status
              <select
                value={data.status || "neutral"}
                onChange={(event) => onPatch({ status: event.target.value })}
                style={{ height: 34, border: "1px solid rgba(15, 23, 42, 0.10)", borderRadius: 9, background: "#fff", color: "#0d0c0a", padding: "0 8px", fontSize: 12 }}
              >
                {Object.entries(STATUS_META).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
              </select>
            </label>
          </div>
        )}
      </div>

      <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(15, 23, 42, 0.07)", flex: 1 }}>
        {!isDeal && !readOnly && (
          <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 10, fontWeight: 800, color: "#6b6760", textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Next step
              <input
                value={nextStepDraft}
                onChange={(event) => setNextStepDraft(event.target.value)}
                onBlur={() => onPatch({ data: { ...details, next_step: nextStepDraft } })}
                placeholder="What should happen next?"
                style={{ height: 36, border: "1px solid rgba(15, 23, 42, 0.10)", borderRadius: 9, background: "#fff", color: "#0d0c0a", padding: "0 10px", fontSize: 12.5 }}
              />
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 10, fontWeight: 800, color: "#6b6760", textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Notes
              <textarea
                value={notesDraft}
                onChange={(event) => setNotesDraft(event.target.value)}
                onBlur={() => onPatch({ data: { ...details, notes: notesDraft, next_step: nextStepDraft } })}
                rows={4}
                placeholder="Context, risk, promise, or detail tied to this node."
                style={{ resize: "vertical", border: "1px solid rgba(15, 23, 42, 0.10)", borderRadius: 9, background: "#fff", color: "#0d0c0a", padding: "9px 10px", fontSize: 12.5, lineHeight: 1.45 }}
              />
            </label>
          </div>
        )}

        {!isDeal && data.kind === "group" && (
          <div style={{ marginTop: 14, display: "grid", gap: 7 }}>
            <div style={{ fontSize: 10, fontWeight: 850, letterSpacing: "0.14em", color: "#6b6760", textTransform: "uppercase" }}>
              Collection coverage
            </div>
            {[
              ["Searchable records", "Children should live behind this node in a drawer/table, not as hundreds of canvas cards."],
              ["ADGA context", "The AI should search this collection when answering deal questions."],
              ["Canvas rule", "Promote only the most important child records onto the canvas."],
            ].map(([title, copy]) => (
              <div key={title} style={{ padding: "8px 9px", border: "1px solid rgba(15, 23, 42, 0.07)", borderRadius: 10, background: "rgba(255, 255, 255, 0.72)" }}>
                <div style={{ fontSize: 11.5, fontWeight: 780, color: "#0d0c0a" }}>{title}</div>
                <div style={{ fontSize: 11, lineHeight: 1.35, color: "#6b6760", marginTop: 2 }}>{copy}</div>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            fontSize: 10,
            fontWeight: 850,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#6b6760",
            marginBottom: 10,
          }}
        >
          Connected · {connected.length}
        </div>
        {connected.length === 0 && (
          <div style={{ fontSize: 12.5, color: "#9b9eb0" }}>
            {readOnly
              ? "Not connected to anything yet."
              : "Not connected to anything yet. Drag from this node’s edge handles to link it."}
          </div>
        )}
        <div style={{ display: "grid", gap: 6 }}>
          {connected.map((other) => {
            const otherData = other.data as unknown as DealFlowEntity & DealFlowDeal;
            const isOtherDeal = other.type === "deal";
            const otherKind = isOtherDeal ? null : otherData.kind;
            const otherMeta = otherKind ? KIND_META[otherKind] : null;
            const otherLabel = isOtherDeal ? otherData.name : otherData.label;
            return (
              <button
                key={other.id}
                type="button"
                onClick={() => onJump(other.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 9px",
                  background: "rgba(255, 255, 255, 0.72)",
                  border: "1px solid rgba(15, 23, 42, 0.07)",
                  borderRadius: 10,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 160ms ease, border-color 160ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(86, 36, 199, 0.04)";
                  e.currentTarget.style.borderColor = "rgba(93, 44, 214, 0.16)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.72)";
                  e.currentTarget.style.borderColor = "rgba(15, 23, 42, 0.07)";
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: isOtherDeal ? "#5d2cd6" : otherMeta!.color,
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12.2, fontWeight: 740, color: "#0d0c0a" }}>{otherLabel}</div>
                  {!isOtherDeal && otherData.sublabel && (
                    <div style={{ fontSize: 11, color: "#9b9eb0" }}>{otherData.sublabel}</div>
                  )}
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#9b9eb0", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {isOtherDeal ? "Deal" : otherMeta!.label}
                </span>
              </button>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 18,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#6b6760",
            marginBottom: 8,
          }}
        >
          Edges · {connectedEdges.length}
        </div>
        <div style={{ fontSize: 11.5, color: "#9b9eb0" }}>
          {readOnly
            ? "Read-only view. Pan and zoom the canvas, and click a node to inspect its connections."
            : "Drag from any edge handle on this node to another node to add a new connection. Press Delete with an edge selected to remove it."}
        </div>
      </div>

      {!isDeal && !readOnly && (
        <div style={{ padding: "14px 22px", borderTop: "1px solid #f1ede8" }}>
          <button
            type="button"
            onClick={onRemove}
            style={{
              width: "fit-content",
              padding: "10px 12px",
              borderRadius: 9,
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#b91c1c",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Remove {KIND_META[(data as DealFlowEntity).kind].label} from dealflow
          </button>
        </div>
      )}
    </>
  );
}
