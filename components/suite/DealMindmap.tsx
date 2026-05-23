"use client";

import React from "react";
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
import "@xyflow/react/dist/style.css";

export type DealMindmapEntityKind = "contact" | "company" | "document" | "task" | "call" | "meeting" | "action";
export type DealMindmapStatus = "neutral" | "active" | "warning" | "overdue" | "done";

export interface DealMindmapDeal {
  id: string;
  name: string;
  stage: string;
  value?: string;
  nextAction?: string;
}

export interface DealMindmapEntity {
  id: string;
  kind: DealMindmapEntityKind;
  label: string;
  sublabel?: string;
  status?: DealMindmapStatus;
  role?: string;
}

export interface DealMindmapInitialNode {
  id: string;
  kind: DealMindmapEntityKind;
  label: string;
  sublabel?: string;
  status?: DealMindmapStatus;
  position: { x: number; y: number };
}

export interface DealMindmapInitialEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface DealMindmapPersistenceCallbacks {
  /** Debounced position updates (one or more nodes moved). */
  onPositionChange?: (updates: Array<{ id: string; position: { x: number; y: number } }>) => void;
  /** A new node was added in the UI. */
  onAddNode?: (node: {
    id: string;
    kind: DealMindmapEntityKind;
    label: string;
    sublabel?: string;
    status?: DealMindmapStatus;
    position: { x: number; y: number };
  }) => void;
  /** A node was removed in the UI. */
  onDeleteNode?: (nodeId: string) => void;
  /** A new edge was added in the UI. */
  onAddEdge?: (edge: { id: string; source: string; target: string }) => void;
  /** An edge was removed in the UI. */
  onDeleteEdge?: (edgeId: string) => void;
}

interface DealMindmapProps extends DealMindmapPersistenceCallbacks {
  deal: DealMindmapDeal;
  entities: DealMindmapEntity[];
  /**
   * When set, the toolbar exposes a Share popover backed by /api/maps/[mapId]/share.
   * Omit on read-only or sample views to keep the share surface internal-only.
   */
  mapId?: string;
  /**
   * Public/shared views render the canvas in non-interactive mode.
   * Nodes can be selected/inspected but not dragged, connected, or removed.
   */
  readOnly?: boolean;
  /** Initial nodes loaded from D1 (Phase 9d). When present, replaces `entities` layout. */
  initialNodes?: DealMindmapInitialNode[];
  /** Initial edges loaded from D1 (Phase 9d). */
  initialEdges?: DealMindmapInitialEdge[];
  /** Base URL for built-in persistence (e.g. `/api/maps/<id>`). When set, the component auto-persists changes. */
  persistApiBase?: string;
}

interface ShareInfo {
  token: string;
  url: string;
  permission: string;
  created_at: string;
  expires_at: string | null;
}

const KIND_META: Record<DealMindmapEntityKind, { label: string; color: string; ring: string; ringSoft: string }> = {
  contact:  { label: "Contact",  color: "#16a34a", ring: "rgba(22, 163, 74, 0.18)", ringSoft: "rgba(22, 163, 74, 0.08)" },
  company:  { label: "Company",  color: "#0ea5e9", ring: "rgba(14, 165, 233, 0.18)", ringSoft: "rgba(14, 165, 233, 0.08)" },
  document: { label: "File",     color: "#f59e0b", ring: "rgba(245, 158, 11, 0.18)", ringSoft: "rgba(245, 158, 11, 0.08)" },
  task:     { label: "Task",     color: "#a855f7", ring: "rgba(168, 85, 247, 0.18)", ringSoft: "rgba(168, 85, 247, 0.08)" },
  call:     { label: "Call",     color: "#ef4444", ring: "rgba(239, 68, 68, 0.18)", ringSoft: "rgba(239, 68, 68, 0.08)" },
  meeting:  { label: "Meeting",  color: "#3b82f6", ring: "rgba(59, 130, 246, 0.18)", ringSoft: "rgba(59, 130, 246, 0.08)" },
  action:   { label: "Next",     color: "#5d2cd6", ring: "rgba(86, 36, 199, 0.20)", ringSoft: "rgba(86, 36, 199, 0.08)" },
};

const STATUS_META: Record<DealMindmapStatus, { dot: string; pulse: boolean; label: string }> = {
  neutral: { dot: "transparent", pulse: false, label: "Open" },
  active:  { dot: "#5d2cd6",     pulse: true,  label: "Active" },
  warning: { dot: "#f59e0b",     pulse: true,  label: "Due soon" },
  overdue: { dot: "#ef4444",     pulse: true,  label: "Overdue" },
  done:    { dot: "#16a34a",     pulse: false, label: "Done" },
};

function DealNodeView({ data, selected }: NodeProps) {
  const deal = data as unknown as DealMindmapDeal;
  return (
    <div
      style={{
        background: "linear-gradient(180deg, #5d2cd6 0%, #4920b3 100%)",
        color: "#fff",
        borderRadius: 18,
        padding: "20px 24px",
        minWidth: 260,
        maxWidth: 320,
        boxShadow: selected
          ? "0 24px 60px rgba(86, 36, 199, 0.40), 0 0 0 3px rgba(86, 36, 199, 0.35)"
          : "0 24px 60px rgba(86, 36, 199, 0.25), 0 4px 12px rgba(86, 36, 199, 0.15)",
        border: "1px solid rgba(255, 255, 255, 0.18)",
        cursor: "grab",
      }}
    >
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.7, marginBottom: 8 }}>
        Deal · {deal.stage}
      </div>
      <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.2, marginBottom: 10, letterSpacing: "-0.012em" }}>
        {deal.name}
      </div>
      {deal.value && <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>{deal.value}</div>}
      {deal.nextAction && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255, 255, 255, 0.18)", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ opacity: 0.7 }}>Next →</span>
          <span style={{ fontWeight: 500 }}>{deal.nextAction}</span>
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
  const entity = data as unknown as DealMindmapEntity;
  const meta = KIND_META[entity.kind];
  const status = STATUS_META[entity.status || "neutral"];
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 14,
        padding: "12px 14px",
        minWidth: 180,
        maxWidth: 240,
        border: `1px solid ${selected ? meta.color : meta.ring}`,
        boxShadow: selected
          ? `0 10px 24px rgba(15, 23, 42, 0.10), 0 0 0 3px ${meta.ringSoft}`
          : "0 10px 24px rgba(15, 23, 42, 0.06), 0 2px 4px rgba(15, 23, 42, 0.03)",
        position: "relative",
        cursor: "grab",
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
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: meta.color, marginBottom: 6 }}>
        {meta.label}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0d0c0a", lineHeight: 1.25, letterSpacing: "-0.01em" }}>
        {entity.label}
      </div>
      {entity.sublabel && (
        <div style={{ fontSize: 11.5, color: "#6b6760", marginTop: 4, lineHeight: 1.35 }}>{entity.sublabel}</div>
      )}

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

function buildInitial(deal: DealMindmapDeal, entities: DealMindmapEntity[]) {
  const nodes: Node[] = [
    {
      id: deal.id,
      type: "deal",
      position: { x: CENTER_X - 130, y: CENTER_Y - 60 },
      data: deal as unknown as Record<string, unknown>,
    },
  ];
  const edges: Edge[] = [];
  const inner: DealMindmapEntityKind[] = ["contact", "company", "action"];
  const innerEntities = entities.filter((e) => inner.includes(e.kind));
  const outerEntities = entities.filter((e) => !inner.includes(e.kind));

  const placeRing = (list: DealMindmapEntity[], radius: number, offsetDeg: number) => {
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

function nodeKindFromNode(node: Node | null | undefined): DealMindmapEntityKind | "deal" | null {
  if (!node) return null;
  if (node.type === "deal") return "deal";
  const data = node.data as unknown as DealMindmapEntity;
  return data?.kind || null;
}

const KINDS_TO_ADD: DealMindmapEntityKind[] = ["contact", "company", "document", "task", "call", "meeting", "action"];

export function DealMindmap({
  deal,
  entities,
  mapId,
  readOnly = false,
  initialNodes,
  initialEdges,
  persistApiBase,
  onPositionChange,
  onAddNode,
  onDeleteNode,
  onAddEdge,
  onDeleteEdge,
}: DealMindmapProps) {
  const initial = React.useMemo(() => {
    if (initialNodes && initialNodes.length >= 0 && (initialNodes.length > 0 || initialEdges)) {
      // Build from persisted nodes/edges (Phase 9d). Keep the deal node at the canvas center.
      const nodes: Node[] = [
        {
          id: deal.id,
          type: "deal",
          position: { x: CENTER_X - 130, y: CENTER_Y - 60 },
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
        style: { stroke: "rgba(86, 36, 199, 0.35)", strokeWidth: 1.5 },
      }));
      return { nodes, edges };
    }
    return buildInitial(deal, entities);
  }, [deal, entities, initialNodes, initialEdges]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = React.useState(false);
  const [editingLabel, setEditingLabel] = React.useState(false);
  const [showShareMenu, setShowShareMenu] = React.useState(false);
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
      const stored = window.localStorage.getItem("adga-map-edge-style");
      return stored === "straight" ? "straight" : "curved";
    } catch {
      return "curved";
    }
  });
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem("adga-map-edge-style", edgeStyle); } catch {}
  }, [edgeStyle]);

  const canShare = Boolean(mapId) && !readOnly;

  const loadShare = React.useCallback(async () => {
    if (!mapId) return;
    setShareLoading(true);
    setShareError(null);
    try {
      const res = await fetch(`/api/maps/${encodeURIComponent(mapId)}/share`, { credentials: "include" });
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
  }, [mapId]);

  React.useEffect(() => {
    if (showShareMenu && mapId && !share && !shareLoading) {
      void loadShare();
    }
  }, [showShareMenu, mapId, share, shareLoading, loadShare]);

  const createOrRotateShare = React.useCallback(async () => {
    if (!mapId) return;
    setShareLoading(true);
    setShareError(null);
    try {
      const res = await fetch(`/api/maps/${encodeURIComponent(mapId)}/share`, {
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
  }, [mapId, sharePermission]);

  const revokeShare = React.useCallback(async () => {
    if (!mapId) return;
    setShareLoading(true);
    setShareError(null);
    try {
      const res = await fetch(`/api/maps/${encodeURIComponent(mapId)}/share`, {
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
  }, [mapId]);

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
  // When `persistApiBase` is provided we auto-sync changes to D1 via the maps API.
  // Callers can also pass explicit callbacks to integrate with their own store.
  const persistEnabled = Boolean(persistApiBase) && !readOnly;
  const persistBaseRef = React.useRef(persistApiBase);
  persistBaseRef.current = persistApiBase;
  const pendingPositionsRef = React.useRef<Map<string, { x: number; y: number }>>(new Map());
  const positionFlushTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const knownNodeIdsRef = React.useRef<Set<string>>(new Set());

  // Seed the known-node set with everything that came from the server. Locally-added
  // nodes (with `new:` prefix) are tracked client-side until POST returns a real id.
  React.useEffect(() => {
    if (!persistEnabled) return;
    const set = new Set<string>([deal.id]);
    for (const node of initial.nodes) set.add(node.id);
    knownNodeIdsRef.current = set;
  }, [persistEnabled, deal.id, initial.nodes]);

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

  const onNodeClick: NodeMouseHandler = React.useCallback((_event, node) => {
    setSelectedId(node.id);
    setEditingLabel(false);
  }, []);

  const onPaneClick = React.useCallback(() => {
    setSelectedId(null);
    setShowAddMenu(false);
  }, []);

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

  const addNode = (kind: DealMindmapEntityKind) => {
    const id = `mnode_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const label = `New ${KIND_META[kind].label}`;
    const position = { x: CENTER_X + 200, y: CENTER_Y + (Math.random() - 0.5) * 200 };
    const newNode: Node = {
      id,
      type: "entity",
      position,
      data: {
        id,
        kind,
        label,
        status: "neutral",
      } as unknown as Record<string, unknown>,
    };
    const edgeId = `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setNodes((nds) => nds.concat(newNode));
    setEdges((eds) =>
      eds.concat({
        id: edgeId,
        source: deal.id,
        target: id,
        style: { stroke: KIND_META[kind].ring, strokeWidth: 1.5 },
      }),
    );
    setShowAddMenu(false);
    setSelectedId(id);

    if (onAddNode) onAddNode({ id, kind, label, status: "neutral", position });
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
          status: "neutral",
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
          source_node_id: deal.id,
          target_node_id: id,
        }),
      }).catch(() => {});
    }
  };

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

  const updateSelectedLabel = (label: string) => {
    if (!selectedId) return;
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
  };

  const selectedKind = nodeKindFromNode(selectedNode);
  const isDealSelected = selectedKind === "deal";

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 600, display: "flex" }}>
      <style>{`
        @keyframes deal-node-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.25); opacity: 0.75; }
        }
        .react-flow__attribution { display: none; }
        .react-flow__node { cursor: grab; }
        .react-flow__node.dragging { cursor: grabbing; }
        .react-flow__handle { transition: opacity 180ms ease; }
        .react-flow__node:hover .react-flow__handle { opacity: 1; }
      `}</style>

      {/* Canvas */}
      <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
        {/* Floating toolbar — top-left */}
        {!readOnly && (
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 14,
            zIndex: 10,
            display: "flex",
            gap: 6,
            background: "#ffffff",
            border: "1px solid #e8e4de",
            borderRadius: 12,
            padding: 4,
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04)",
          }}
        >
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowAddMenu((v) => !v)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: 0,
                background: showAddMenu ? "rgba(86, 36, 199, 0.10)" : "transparent",
                color: "#0d0c0a",
                fontSize: 12.5,
                fontWeight: 500,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 14, color: "#5d2cd6", fontWeight: 700 }}>+</span> Add node
            </button>
            {showAddMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: 6,
                  background: "#ffffff",
                  border: "1px solid #e8e4de",
                  borderRadius: 10,
                  padding: 4,
                  minWidth: 180,
                  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.10)",
                }}
              >
                {KINDS_TO_ADD.map((kind) => {
                  const meta = KIND_META[kind];
                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => addNode(kind)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        width: "100%",
                        padding: "8px 10px",
                        background: "transparent",
                        border: 0,
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 12.5,
                        color: "#0d0c0a",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(86, 36, 199, 0.06)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: meta.color }} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={removeSelected}
            disabled={!selectedId || isDealSelected}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: 0,
              background: "transparent",
              color: !selectedId || isDealSelected ? "#b8baca" : "#ef4444",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: !selectedId || isDealSelected ? "not-allowed" : "pointer",
            }}
          >
            Remove
          </button>
          <div style={{ width: 1, background: "#e8e4de", margin: "4px 0" }} />
          {/* Edge style toggle — flip every connection between curved (default) and straight. */}
          <div
            role="group"
            aria-label="Edge style"
            style={{ display: "inline-flex", padding: 2, borderRadius: 8, background: "rgba(15, 23, 42, 0.04)" }}
          >
            {(["curved", "straight"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setEdgeStyle(opt)}
                title={opt === "curved" ? "Curved edges" : "Straight edges"}
                style={{
                  padding: "5px 10px",
                  border: 0,
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 11.5,
                  fontWeight: 500,
                  background: edgeStyle === opt ? "#ffffff" : "transparent",
                  color: edgeStyle === opt ? "#0d0c0a" : "#6b6760",
                  boxShadow: edgeStyle === opt ? "0 1px 3px rgba(15, 23, 42, 0.10)" : "none",
                  textTransform: "capitalize",
                }}
              >
                {opt}
              </button>
            ))}
          </div>
          <div style={{ width: 1, background: "#e8e4de", margin: "4px 0" }} />
          {canShare && (
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setShowShareMenu((v) => !v)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: 0,
                  background: showShareMenu ? "rgba(86, 36, 199, 0.10)" : "transparent",
                  color: "#0d0c0a",
                  fontSize: 12.5,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ color: "#5d2cd6", fontWeight: 700 }}>↗</span> Share
              </button>
              {showShareMenu && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    marginTop: 6,
                    background: "#ffffff",
                    border: "1px solid #e8e4de",
                    borderRadius: 12,
                    padding: 14,
                    minWidth: 320,
                    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
                    zIndex: 20,
                  }}
                >
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6b6760", marginBottom: 8 }}>
                    Share map
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: "block", fontSize: 11, color: "#6b6760", marginBottom: 4 }}>Permission</label>
                    <select
                      value={sharePermission}
                      onChange={(e) => setSharePermission(e.target.value)}
                      disabled={shareLoading}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: 8,
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
                  </div>

                  {shareError && (
                    <div style={{ marginBottom: 10, padding: "6px 8px", background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 6, fontSize: 11.5 }}>
                      {shareError}
                    </div>
                  )}

                  {share ? (
                    <>
                      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                        <input
                          readOnly
                          value={share.url}
                          onFocus={(e) => e.currentTarget.select()}
                          style={{
                            flex: 1,
                            minWidth: 0,
                            padding: "8px 10px",
                            borderRadius: 8,
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
                            borderRadius: 8,
                            border: 0,
                            background: "#5d2cd6",
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: 500,
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
                            borderRadius: 8,
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
                            borderRadius: 8,
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
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 8,
                        border: 0,
                        background: "#5d2cd6",
                        color: "#fff",
                        fontSize: 12.5,
                        fontWeight: 500,
                        cursor: shareLoading ? "wait" : "pointer",
                      }}
                    >
                      {shareLoading ? "Working…" : "Create share link"}
                    </button>
                  )}

                  <div style={{ marginTop: 10, fontSize: 11, color: "#9b9eb0", lineHeight: 1.45 }}>
                    Anyone with the link can open this map. Rotate to invalidate previous links. Revoke removes all links.
                  </div>
                </div>
              )}
            </div>
          )}
          <span style={{ padding: "8px 8px", fontSize: 11, color: "#6b6760", lineHeight: 1.2 }}>
            {nodes.length} nodes · {edges.length} edges
          </span>
        </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={React.useMemo(() => edges.map(e => ({ ...e, type: edgeStyle === "straight" ? "straight" : "default" })), [edges, edgeStyle])}
          nodeTypes={nodeTypes}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onSelectionChange={onSelectionChange}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable
          fitView
          fitViewOptions={{ padding: 0.22 }}
          proOptions={{ hideAttribution: true }}
          minZoom={0.3}
          maxZoom={1.6}
          panOnDrag={[1, 2]}
          panOnScroll
          selectionOnDrag={!readOnly}
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
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(15, 23, 42, 0.08)" />
          <Controls position="bottom-right" showInteractive={false} />
          <MiniMap
            position="bottom-left"
            pannable
            zoomable
            ariaLabel="Map overview"
            maskColor="rgba(249, 247, 244, 0.72)"
            style={{
              border: "1px solid rgba(15, 23, 42, 0.08)",
              borderRadius: 10,
              background: "#ffffff",
              boxShadow: "0 4px 16px -8px rgba(15, 23, 42, 0.18)",
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
            width: 380,
            flexShrink: 0,
            background: "#ffffff",
            borderLeft: "1px solid #e8e4de",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
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
  onEditCancel,
  onClose,
  onRemove,
  onJump,
}: NodeDetailPanelProps) {
  const data = node.data as unknown as DealMindmapEntity & DealMindmapDeal;
  const kind = isDeal ? "deal" : data.kind;
  const meta = isDeal ? null : KIND_META[data.kind];
  const status = data.status ? STATUS_META[data.status] : null;
  const [labelDraft, setLabelDraft] = React.useState(data.label || (isDeal ? data.name : ""));

  React.useEffect(() => {
    setLabelDraft(data.label || (isDeal ? data.name : ""));
  }, [data.label, data.name, isDeal, node.id]);

  const headerBadgeColor = isDeal ? "#5d2cd6" : meta!.color;
  const headerBadgeLabel = isDeal ? `Deal · ${data.stage}` : meta!.label;

  return (
    <>
      <div style={{ padding: "20px 22px 14px", borderBottom: "1px solid #f1ede8" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
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
              borderRadius: 8,
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
                fontSize: 17,
                fontWeight: 600,
                color: "#0d0c0a",
                letterSpacing: "-0.012em",
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
              fontSize: 18,
              fontWeight: 600,
              color: "#0d0c0a",
              letterSpacing: "-0.012em",
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
              fontSize: 18,
              fontWeight: 600,
              color: "#0d0c0a",
              letterSpacing: "-0.012em",
              lineHeight: 1.25,
            }}
          >
            {isDeal ? data.name : data.label}
          </button>
        )}

        {!isDeal && data.sublabel && (
          <div style={{ fontSize: 12.5, color: "#6b6760", marginTop: 6 }}>{data.sublabel}</div>
        )}

        {status && (
          <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: status.dot || "#cbd5e1" }} />
            <span style={{ color: "#6b6760" }}>{status.label}</span>
          </div>
        )}
      </div>

      <div style={{ padding: "18px 22px", borderBottom: "1px solid #f1ede8", flex: 1 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
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
            const otherData = other.data as unknown as DealMindmapEntity & DealMindmapDeal;
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
                  padding: "8px 10px",
                  background: "transparent",
                  border: "1px solid #f1ede8",
                  borderRadius: 8,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 160ms ease, border-color 160ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(86, 36, 199, 0.04)";
                  e.currentTarget.style.borderColor = "#e8e4de";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "#f1ede8";
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
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: "#0d0c0a" }}>{otherLabel}</div>
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
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#b91c1c",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Remove {KIND_META[(data as DealMindmapEntity).kind].label} from map
          </button>
        </div>
      )}
    </>
  );
}
