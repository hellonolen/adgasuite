/**
 * Domain event catalog — every action in the platform persists one of these to the `events`
 * table in D1. The events table is append-only (see `app/api/agent/events/route.ts`).
 *
 * To add a new event type:
 *   1. Add it to the union below with its payload shape.
 *   2. Add a subscription in `subscriptions.ts` if an agent should react.
 *   3. Emit it via `bus.publish()` from the originating handler.
 */

export type EventActor = "user" | "agent" | "system" | "webhook" | "cron";

export interface BaseEvent {
  id: string;
  organization_id: string;
  actor_type: EventActor;
  actor_id: string | null;
  resource_type: string | null;
  resource_id: string | null;
  created_at: string;
}

// ─── Lead lifecycle ───────────────────────────────────────────────────────────
export interface LeadCapturedEvent extends BaseEvent {
  event_type: "lead.captured";
  payload: { source: string; lead_id: string };
}
export interface LeadQualifiedEvent extends BaseEvent {
  event_type: "lead.qualified";
  payload: { lead_id: string; score: number };
}
export interface LeadLostEvent extends BaseEvent {
  event_type: "lead.lost";
  payload: { lead_id: string; reason: string };
}

// ─── Deal lifecycle ───────────────────────────────────────────────────────────
export interface DealCreatedEvent extends BaseEvent {
  event_type: "deal.created";
  payload: { deal_id: string; stage: string };
}
export interface DealStageChangedEvent extends BaseEvent {
  event_type: "deal.stage_changed";
  payload: { deal_id: string; from: string; to: string };
}
export interface DealWonEvent extends BaseEvent {
  event_type: "deal.won";
  payload: { deal_id: string; value_cents: number };
}
export interface DealLostEvent extends BaseEvent {
  event_type: "deal.lost";
  payload: { deal_id: string; reason: string };
}

// ─── DealFlow canvas ─────────────────────────────────────────────────────────
export interface DealFlowNodeAddedEvent extends BaseEvent {
  event_type: "dealflow.node_added";
  payload: { dealflow_id: string; node_id: string; kind: string };
}
export interface DealFlowNodeRemovedEvent extends BaseEvent {
  event_type: "dealflow.node_removed";
  payload: { dealflow_id: string; node_id: string };
}
export interface DealFlowNodeUpdatedEvent extends BaseEvent {
  event_type: "dealflow.node_updated";
  payload: { dealflow_id: string; node_id: string; changed_fields: string[] };
}
export interface DealFlowNodesMovedEvent extends BaseEvent {
  event_type: "dealflow.nodes_moved";
  payload: { dealflow_id: string; node_ids: string[]; count: number };
}

// ─── Approval queue ───────────────────────────────────────────────────────────
export interface ApprovalRequestedEvent extends BaseEvent {
  event_type: "agent_approval.requested";
  payload: { approval_id: string; agent: string; title: string; risk: string };
}
export interface ApprovalApprovedEvent extends BaseEvent {
  event_type: "agent_approval.approved";
  payload: { approval_id: string; agent: string };
}
export interface ApprovalRejectedEvent extends BaseEvent {
  event_type: "agent_approval.rejected";
  payload: { approval_id: string; agent: string };
}

// ─── Agent jobs ───────────────────────────────────────────────────────────────
export interface AgentJobStartedEvent extends BaseEvent {
  event_type: "agent_job.started";
  payload: { job_id: string; agent: string; job_type: string };
}
export interface AgentJobCreatedEvent extends BaseEvent {
  event_type: "agent_job.created";
  payload: { job_id?: string; agent: string; job_type: string };
}
export interface AgentJobCompletedEvent extends BaseEvent {
  event_type: "agent_job.completed";
  payload: { job_id: string; agent: string; summary?: string };
}
export interface AgentJobFailedEvent extends BaseEvent {
  event_type: "agent_job.failed";
  payload: { job_id: string; agent: string; error: string };
}

// ─── Revenue + intelligence ──────────────────────────────────────────────────
export interface RevenueCapturedEvent extends BaseEvent {
  event_type: "revenue.captured";
  payload: { source: "stripe" | "invoice" | "wire"; amount_cents: number; reference: string };
}
export interface ForecastBelowTargetEvent extends BaseEvent {
  event_type: "forecast.below_target";
  payload: { gap_cents: number; period: string };
}
export interface GapIdentifiedEvent extends BaseEvent {
  event_type: "gap.identified";
  payload: { gap: string; revenue_impact_cents?: number };
}

// ─── Surface tracking ────────────────────────────────────────────────────────
export interface SuiteRouteViewedEvent extends BaseEvent {
  event_type: "suite.route_viewed";
  payload: { route: string; section?: string };
}

export type DomainEvent =
  | LeadCapturedEvent
  | LeadQualifiedEvent
  | LeadLostEvent
  | DealCreatedEvent
  | DealStageChangedEvent
  | DealWonEvent
  | DealLostEvent
  | DealFlowNodeAddedEvent
  | DealFlowNodeRemovedEvent
  | DealFlowNodeUpdatedEvent
  | DealFlowNodesMovedEvent
  | ApprovalRequestedEvent
  | ApprovalApprovedEvent
  | ApprovalRejectedEvent
  | AgentJobCreatedEvent
  | AgentJobStartedEvent
  | AgentJobCompletedEvent
  | AgentJobFailedEvent
  | RevenueCapturedEvent
  | ForecastBelowTargetEvent
  | GapIdentifiedEvent
  | SuiteRouteViewedEvent;

export type DomainEventType = DomainEvent["event_type"];
