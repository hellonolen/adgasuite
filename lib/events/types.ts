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

// ─── Subscription + workspace activation ─────────────────────────────────────
export interface SubscriptionActivatedEvent extends BaseEvent {
  event_type: "subscription.activated";
  payload: {
    email: string;
    plan: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    cadence?: "month" | "year";
  };
}
export interface WorkspaceActivatedEvent extends BaseEvent {
  event_type: "workspace.activated";
  payload: {
    email: string;
    plan: string;
    activated_at: string;
    autonomy_mode: "hands_off" | "medium" | "hands_on";
  };
}

// ─── Conductor brief ─────────────────────────────────────────────────────────
export interface ConductorBriefRequestedEvent extends BaseEvent {
  event_type: "conductor.brief.requested";
  payload: { user_email: string };
}
export interface ConductorBriefComposedEvent extends BaseEvent {
  event_type: "conductor.brief.composed";
  payload: { user_email: string; item_count: number; composed_at: string };
}
export interface BriefItemClickedEvent extends BaseEvent {
  event_type: "brief.item_clicked";
  payload: { brief_item_id: string; kind: string; deal_id: string | null };
}

// ─── Team invites ────────────────────────────────────────────────────────────
export interface TeamInviteSentEvent extends BaseEvent {
  event_type: "team.invite.sent";
  payload: {
    invite_id: string;
    invitee_email: string;
    invitee_role: "admin" | "member";
    expires_at: string;
  };
}
export interface TeamInviteAcceptedEvent extends BaseEvent {
  event_type: "team.invite.accepted";
  payload: { invite_id: string; invitee_email: string; user_id: string };
}
export interface TeamInviteExpiredEvent extends BaseEvent {
  event_type: "team.invite.expired";
  payload: { invite_id: string; invitee_email: string };
}

// ─── Import wedge (csv-import + adapter skills) ──────────────────────────────
export interface ImportRequestedEvent extends BaseEvent {
  event_type: "import.requested";
  payload: {
    batch_id: string;
    source_type: "csv" | "paste" | "hubspot" | "pipedrive" | "salesforce" | "notion" | "airtable";
    target_type: "contacts" | "leads" | "deals" | "organizations";
    rows_total: number | null;
  };
}
export interface ImportRowSucceededEvent extends BaseEvent {
  event_type: "import.row_succeeded";
  payload: {
    batch_id: string;
    row_number: number;
    target_record_id: string;
    dedupe_match: string | null;
  };
}
export interface ImportRowFailedEvent extends BaseEvent {
  event_type: "import.row_failed";
  payload: {
    batch_id: string;
    row_number: number;
    failure_reason: string;
    failure_detail: string | null;
  };
}
export interface ImportCompletedEvent extends BaseEvent {
  event_type: "import.completed";
  payload: {
    batch_id: string;
    target_type: "contacts" | "leads" | "deals" | "organizations";
    rows_total: number;
    rows_succeeded: number;
    rows_failed: number;
    duration_ms: number;
  };
}
export interface ImportFailedEvent extends BaseEvent {
  event_type: "import.failed";
  payload: { batch_id: string; error: string };
}

// ─── Import enrichment skill ─────────────────────────────────────────────────
export interface EnrichmentRequestedEvent extends BaseEvent {
  event_type: "enrichment.requested";
  payload: { enrichment_id: string; batch_id: string; operations: string[] };
}
export interface EnrichmentCompletedEvent extends BaseEvent {
  event_type: "enrichment.completed";
  payload: {
    enrichment_id: string;
    batch_id: string;
    operations_applied: Array<{ operation: string; rows_touched: number; rows_changed: number }>;
    duration_ms: number;
  };
}
export interface EnrichmentFailedEvent extends BaseEvent {
  event_type: "enrichment.failed";
  payload: { enrichment_id: string; batch_id: string; error: string };
}

// ─── List segments ───────────────────────────────────────────────────────────
export interface ListCreatedEvent extends BaseEvent {
  event_type: "list.created";
  payload: { list_id: string; name: string; target_type: string };
}
export interface ListUpdatedEvent extends BaseEvent {
  event_type: "list.updated";
  payload: { list_id: string };
}
export interface ListDeletedEvent extends BaseEvent {
  event_type: "list.deleted";
  payload: { list_id: string };
}
export interface ListQueriedEvent extends BaseEvent {
  event_type: "list.queried";
  payload: { list_id: string; matched_count: number; duration_ms: number };
}

// ─── Activity timeline ───────────────────────────────────────────────────────
export interface TimelineViewedEvent extends BaseEvent {
  event_type: "timeline.viewed";
  payload: {
    resource_type: "contact" | "lead" | "deal" | "organization" | "workspace";
    resource_id: string;
    items_returned: number;
  };
}

// ─── Inbox sync ──────────────────────────────────────────────────────────────
export interface InboxSyncStartedEvent extends BaseEvent {
  event_type: "inbox.sync.started";
  payload: { sync_id: string; provider: "gmail" | "outlook"; account_email: string };
}
export interface InboxSyncCompletedEvent extends BaseEvent {
  event_type: "inbox.sync.completed";
  payload: {
    sync_id: string;
    messages_processed: number;
    contacts_created: number;
    records_touched: number;
  };
}
export interface InboxSyncFailedEvent extends BaseEvent {
  event_type: "inbox.sync.failed";
  payload: { sync_id: string; error: string };
}
export interface InboxMessageLinkedEvent extends BaseEvent {
  event_type: "inbox.message.linked";
  payload: { message_id: string; thread_id: string; resource_type: string; resource_id: string };
}
export interface ContactAutoCreatedEvent extends BaseEvent {
  event_type: "contact.auto_created";
  payload: { contact_id: string; source: "inbox" | "calendar"; sender_email: string };
}

// ─── Custom objects ──────────────────────────────────────────────────────────
export interface CustomObjectCreatedEvent extends BaseEvent {
  event_type: "custom_object.created";
  payload: { object_id: string; slug: string };
}
export interface CustomObjectUpdatedEvent extends BaseEvent {
  event_type: "custom_object.updated";
  payload: { object_id: string };
}
export interface CustomObjectDeletedEvent extends BaseEvent {
  event_type: "custom_object.deleted";
  payload: { object_id: string };
}

// ─── Record comments ─────────────────────────────────────────────────────────
export interface RecordCommentCreatedEvent extends BaseEvent {
  event_type: "record.comment.created";
  payload: {
    comment_id: string;
    resource_type: string;
    resource_id: string;
    body_preview: string;
  };
}
export interface RecordCommentMentionedEvent extends BaseEvent {
  event_type: "record.comment.mentioned";
  payload: { comment_id: string; mentioned_user_id: string; mentioned_email: string };
}
export interface RecordCommentUpdatedEvent extends BaseEvent {
  event_type: "record.comment.updated";
  payload: { comment_id: string };
}
export interface RecordCommentDeletedEvent extends BaseEvent {
  event_type: "record.comment.deleted";
  payload: { comment_id: string };
}
export interface RecordCommentReactedEvent extends BaseEvent {
  event_type: "record.comment.reacted";
  payload: { comment_id: string; emoji: string; action: "add" | "remove" };
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
  | SuiteRouteViewedEvent
  | SubscriptionActivatedEvent
  | WorkspaceActivatedEvent
  | ConductorBriefRequestedEvent
  | ConductorBriefComposedEvent
  | BriefItemClickedEvent
  | TeamInviteSentEvent
  | TeamInviteAcceptedEvent
  | TeamInviteExpiredEvent
  | ImportRequestedEvent
  | ImportRowSucceededEvent
  | ImportRowFailedEvent
  | ImportCompletedEvent
  | ImportFailedEvent
  | EnrichmentRequestedEvent
  | EnrichmentCompletedEvent
  | EnrichmentFailedEvent
  | ListCreatedEvent
  | ListUpdatedEvent
  | ListDeletedEvent
  | ListQueriedEvent
  | TimelineViewedEvent
  | InboxSyncStartedEvent
  | InboxSyncCompletedEvent
  | InboxSyncFailedEvent
  | InboxMessageLinkedEvent
  | ContactAutoCreatedEvent
  | CustomObjectCreatedEvent
  | CustomObjectUpdatedEvent
  | CustomObjectDeletedEvent
  | RecordCommentCreatedEvent
  | RecordCommentMentionedEvent
  | RecordCommentUpdatedEvent
  | RecordCommentDeletedEvent
  | RecordCommentReactedEvent;

export type DomainEventType = DomainEvent["event_type"];
