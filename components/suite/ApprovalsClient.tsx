"use client";

import { useMemo, useState } from "react";

type Approval = {
  id: string;
  agent: string;
  title: string;
  proposed_action: string;
  risk: "low" | "medium" | "high";
  status: "pending" | "approved" | "rejected" | "edited";
  resource_type: string | null;
  resource_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type Execution = {
  status?: "executed" | "blocked" | "skipped" | "failed";
  action_type?: string;
  resource_type?: string;
  resource_id?: string;
  message?: string;
};

export function ApprovalsClient({ approvals }: { approvals: Approval[] }) {
  const [items, setItems] = useState(approvals);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(
    () => items.filter((item) => filter === "all" || item.status === "pending"),
    [items, filter],
  );
  const pendingCount = items.filter((item) => item.status === "pending").length;
  const highCount = items.filter((item) => item.status === "pending" && item.risk === "high").length;

  async function decide(item: Approval, status: "approved" | "rejected") {
    setBusyId(item.id);
    setError(null);
    try {
      const response = await fetch(`/api/agent/approvals/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const body = (await response.json().catch(() => ({}))) as { approval?: Approval; error?: string };
      if (!response.ok || !body.approval) throw new Error(body.error || "Could not update approval.");
      setItems((current) => current.map((approval) => (approval.id === item.id ? body.approval! : approval)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update approval.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="page-h">
        <div>
          <h1><em>Approvals</em>.</h1>
          <div className="sub">
            {pendingCount} pending prepared actions - {highCount} high risk - external sends, payments, and legal actions stay approval gated.
          </div>
        </div>
        <div className="page-actions">
          <button className={filter === "pending" ? "btn primary" : "btn"} type="button" onClick={() => setFilter("pending")}>
            Pending
          </button>
          <button className={filter === "all" ? "btn primary" : "btn"} type="button" onClick={() => setFilter("all")}>
            All
          </button>
        </div>
      </div>

      <div className="pending-filters">
        <span className="ed-tag">{visible.length} shown</span>
        {error && <span style={{ color: "var(--danger,#b42318)", fontSize: 13 }}>{error}</span>}
      </div>

      <div className="pending-body">
        {visible.length === 0 && (
          <div className="ac-card big">
            <div className="ac-card-title">No approvals in this queue.</div>
            <div className="ac-card-target">Prepared actions will appear here after an agent requests approval.</div>
          </div>
        )}

        {visible.map((approval) => {
          const execution = getExecution(approval.payload);
          const preparedAction = getPreparedActionType(approval.payload);
          return (
            <article key={approval.id} className="ac-card big" data-urgency={approval.risk === "medium" ? "med" : approval.risk}>
              <div className="ac-card-h">
                <div className="ac-feed-avatar lg">{approval.agent.slice(0, 2).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ac-card-author">
                    <b style={{ fontSize: 14 }}>{approval.agent}</b>
                    <span className="ac-urg-dot" data-urgency={approval.risk === "medium" ? "med" : approval.risk} />
                    <span className="ed-tag">{approval.risk.toUpperCase()}</span>
                    <span className="ed-tag" style={{ marginLeft: "auto" }}>{approval.status}</span>
                  </div>
                  <div className="ac-card-title" style={{ fontSize: 22 }}>{approval.title}</div>
                  <div className="ac-card-target">
                    {approval.resource_type || "workspace"}
                    {approval.resource_id ? ` - ${approval.resource_id}` : ""}
                    {preparedAction ? ` - ${preparedAction}` : ""}
                  </div>
                </div>
              </div>

              <div className="ac-card-section">
                <div className="ed-tag">Proposed action</div>
                <p style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{approval.proposed_action}</p>
              </div>

              {execution && (
                <div className="ac-card-section">
                  <div className="ed-tag">Execution</div>
                  <p style={{ marginTop: 10 }}>
                    {execution.status || "unknown"} - {execution.message || "No execution message."}
                    {execution.resource_type && execution.resource_id ? ` (${execution.resource_type}:${execution.resource_id})` : ""}
                  </p>
                </div>
              )}

              {approval.status === "pending" && (
                <div className="ac-card-actions">
                  <button className="btn primary" type="button" disabled={busyId === approval.id} onClick={() => decide(approval, "approved")}>
                    {busyId === approval.id ? "Approving..." : "Approve"}
                  </button>
                  <button className="btn" type="button" disabled={busyId === approval.id} onClick={() => decide(approval, "rejected")}>
                    Reject
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}

function getExecution(payload: Record<string, unknown>): Execution | null {
  const execution = payload.prepared_action_execution;
  return execution && typeof execution === "object" ? (execution as Execution) : null;
}

function getPreparedActionType(payload: Record<string, unknown>): string | null {
  const action = payload.prepared_action;
  if (!action || typeof action !== "object") return null;
  const type = (action as { type?: unknown }).type;
  return typeof type === "string" ? type : null;
}
