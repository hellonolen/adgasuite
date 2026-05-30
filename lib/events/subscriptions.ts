/**
 * Subscription wiring — which agent reacts to which event.
 *
 * Keep this file small. The canonical doc requires agents to communicate via events only —
 * no direct imports between agent files. This module is where the connection is declared.
 *
 * Register a subscriber by importing `subscribe` from `./bus` and wiring it here. The actual
 * handler logic lives in the appropriate `agents/<agent>/` module.
 */

// This file is both the subscription inventory and the default in-process wiring. Every event
// type should appear here with the agents that react to it so the connectivity graph is auditable.
import { createAgentJob, type AgentName } from "@/lib/server/repository";
import type { DomainEvent, DomainEventType } from "./types";
import { callSkill, getRegisteredSkill } from "@/lib/agents/skill-registry";

// Event → skill handler bindings. When an event fires, in addition to creating
// an agent_job for the LLM tick, the bus invokes the bound skill handler
// inline so deterministic work happens immediately. Async LLM enrichment
// continues in the background via the agent_job path.
//
// The handler decides whether to act on the payload (idempotent, safe to
// invoke even if the work has already been done by the originator).
export const EVENT_SKILL_BINDINGS: Partial<Record<DomainEventType, string[]>> = {
  // Stripe webhook also invokes workspace-activation directly; this binding
  // catches the case where subscription.activated is published from elsewhere
  // (replay, MCP, diag/simulate) and ensures activation still runs.
  "subscription.activated": ["workspace-activation"],

  // After a workspace activates, recompose the operator's brief so their
  // /suite/home reflects the new state on first load.
  "workspace.activated": ["daily-brief"],

  // When a teammate accepts, recompose the inviter's brief so the new member
  // shows up immediately.
  "team.invite.accepted": ["daily-brief"],

  // When a dealflow is created or a node is added, the brief may need a refresh.
  "deal.created": ["daily-brief"],

  // After an import finishes, recompose the brief so the operator sees the
  // newly-imported rows on next load, and auto-fire the enrichment pass with
  // the default safe operations (normalize_names + derive_company_from_email).
  // Enrichment handler decides whether to act based on rows imported.
  "import.completed": ["daily-brief", "import-enrichment"],

  // Inbox auto-population — when sync finishes, recompose the brief so the
  // operator sees the freshly-populated contact/deal cards on next load.
  "inbox.sync.completed": ["daily-brief"],

  // A new contact auto-created from inbox sync gets scored by Sales agent so
  // it shows up on the brief with a score, not as a generic blob.
  "contact.auto_created": ["lead-scoring"],

  // A mention on a record fires the same notification path as approvals — the
  // bound handler resolves the recipient + sends. record-comment skill emits
  // record.comment.mentioned per mention.
  "record.comment.mentioned": ["record-comment"],
};

export const SUBSCRIPTION_INVENTORY = {
  "lead.captured":            ["sales"],
  "lead.qualified":           ["sales", "intelligence"],
  "lead.lost":                ["intelligence"],

  "deal.created":             ["intelligence"],
  "deal.stage_changed":       ["conductor", "intelligence"],
  "deal.won":                 ["intelligence", "payments"],
  "deal.lost":                ["intelligence"],

  "dealflow.node_added":      ["conductor"],
  "dealflow.node_updated":    ["conductor"],
  "dealflow.nodes_moved":     ["conductor"],
  "dealflow.node_removed":    ["conductor"],

  "agent_approval.requested": ["conductor", "communication"],
  "agent_approval.approved":  ["conductor"],
  "agent_approval.rejected":  ["conductor"],

  "agent_job.created":        ["conductor"],
  "agent_job.started":        ["intelligence"],
  "agent_job.completed":      ["conductor", "intelligence"],
  "agent_job.failed":         ["conductor", "intelligence"],

  "revenue.captured":         ["intelligence", "sales"],
  "forecast.below_target":    ["conductor", "intelligence"],
  "gap.identified":           ["conductor"],

  "suite.route_viewed":       ["intelligence"],

  // Workspace lifecycle — first paying customer → ready to use
  "subscription.activated":   ["conductor", "intelligence", "sales"],
  "workspace.activated":      ["conductor", "intelligence", "sales"],

  // Conductor daily brief — the agent's primary visible output
  "conductor.brief.requested":["conductor"],
  "conductor.brief.composed": ["intelligence"],
  "brief.item_clicked":       ["intelligence"],

  // Team invites — replaces the SQL-only path
  "team.invite.sent":         ["communication", "intelligence"],
  "team.invite.accepted":     ["sales", "intelligence"],
  "team.invite.expired":      ["conductor"],

  // Import wedge — operations owns the batch lifecycle; intelligence watches
  // for cohorts that change after import; sales gets the lead spike.
  "import.requested":         ["operations"],
  "import.row_succeeded":     ["operations"],
  "import.row_failed":        ["operations"],
  "import.completed":         ["operations", "intelligence", "sales"],
  "import.failed":            ["operations", "conductor"],
  "enrichment.requested":     ["intelligence"],
  "enrichment.completed":     ["intelligence"],
  "enrichment.failed":        ["intelligence", "conductor"],

  // Lists — intelligence owns saved cohorts; conductor on delete is for
  // gap-detection cleanup of stale references.
  "list.created":             ["intelligence"],
  "list.updated":             ["intelligence"],
  "list.deleted":             ["intelligence", "conductor"],
  "list.queried":             ["intelligence"],

  // Activity timeline reads — intelligence learns which records get attention.
  "timeline.viewed":          ["intelligence"],

  // Inbox/calendar sync — communication owns the channel boundary, intelligence
  // gets the new-record spike, sales gets the new contacts to qualify.
  "inbox.sync.started":       ["communication"],
  "inbox.sync.completed":     ["communication", "intelligence", "sales"],
  "inbox.sync.failed":        ["communication", "conductor"],
  "inbox.message.linked":     ["communication", "intelligence"],
  "contact.auto_created":     ["sales", "intelligence"],

  // Custom objects — operations owns the metadata change; intelligence
  // rebuilds any cached schema after a new object lands.
  "custom_object.created":    ["operations", "intelligence"],
  "custom_object.updated":    ["operations", "intelligence"],
  "custom_object.deleted":    ["operations", "intelligence", "conductor"],

  // Record comments — communication delivers mentions; intelligence indexes
  // comment volume per record as an attention signal.
  "record.comment.created":   ["communication", "intelligence"],
  "record.comment.mentioned": ["communication"],
  "record.comment.updated":   ["communication"],
  "record.comment.deleted":   ["communication", "conductor"],
  "record.comment.reacted":   ["intelligence"],
} as const satisfies Partial<Record<DomainEventType, readonly AgentName[]>>;

export type EventSubscriptionKey = keyof typeof SUBSCRIPTION_INVENTORY;

export interface SubscriptionContext {
  db?: D1Database;
}

export type EventSubscriber = <T extends DomainEventType>(
  eventType: T,
  handler: (event: Extract<DomainEvent, { event_type: T }>, context: SubscriptionContext) => void | Promise<void>,
) => () => void;

let registered = false;

export function registerEventSubscriptions(subscribe: EventSubscriber): void {
  if (registered) return;
  registered = true;

  for (const [eventType, agents] of Object.entries(SUBSCRIPTION_INVENTORY) as Array<
    [EventSubscriptionKey, readonly AgentName[]]
  >) {
    for (const agent of agents) {
      subscribe(eventType, async (event, context) => {
        await createAgentJob(context.db, {
          agent,
          job_type: `event.${event.event_type}`,
          organization_id: event.organization_id,
          input: {
            event_id: event.id,
            event_type: event.event_type,
            resource_type: event.resource_type,
            resource_id: event.resource_id,
            actor_type: event.actor_type,
            actor_id: event.actor_id,
            payload: event.payload,
            source: "event_subscription",
          },
        });
      });
    }
  }

  // Skill handler bindings — invoke deterministic handlers inline so the
  // operator's view reflects the work immediately, without waiting for the
  // cron tick to drain the agent_job queue.
  for (const [eventType, skillIds] of Object.entries(EVENT_SKILL_BINDINGS) as Array<
    [DomainEventType, string[]]
  >) {
    for (const skillId of skillIds) {
      subscribe(eventType, async (event, context) => {
        if (!getRegisteredSkill(skillId)) return; // handler not yet registered (build/replay window)
        // Map event payload to the skill's expected input shape.
        // Each binding here is intentional and the input shape per binding is
        // documented in the matching skills/<id>.skill.md file.
        const input = buildSkillInputForBinding(eventType, event, skillId);
        if (input === null) return;
        await callSkill(
          {
            env: { DB: context.db } as unknown as CloudflareEnv,
            organization_id: event.organization_id,
            actor_type: event.actor_type,
            actor_id: event.actor_id,
            calling_skill: `event:${eventType}`,
          },
          skillId,
          input,
        ).catch(() => null);
      });
    }
  }
}

function buildSkillInputForBinding(
  eventType: DomainEventType,
  event: DomainEvent,
  skillId: string,
): Record<string, unknown> | null {
  const payload = (event.payload || {}) as Record<string, unknown>;

  if (skillId === "workspace-activation" && eventType === "subscription.activated") {
    const email = (payload.email as string) || "";
    if (!email) return null;
    return {
      email,
      plan: (payload.plan as string) || "team",
      stripe_customer_id: (payload.stripe_customer_id as string | null) ?? null,
      stripe_subscription_id: (payload.stripe_subscription_id as string | null) ?? null,
      organization_id: event.organization_id,
    };
  }

  if (skillId === "import-enrichment" && eventType === "import.completed") {
    const batchId = (payload.batch_id as string) || "";
    if (!batchId) return null;
    return {
      batch_id: batchId,
      operations: ["normalize_names", "derive_company_from_email"],
    };
  }

  if (skillId === "lead-scoring" && eventType === "contact.auto_created") {
    const contactId = (payload.contact_id as string) || "";
    if (!contactId) return null;
    return {
      contact_id: contactId,
      source: (payload.source as string) || "inbox",
    };
  }

  if (skillId === "record-comment" && eventType === "record.comment.mentioned") {
    const commentId = (payload.comment_id as string) || "";
    const mentionedUserId = (payload.mentioned_user_id as string) || "";
    if (!commentId || !mentionedUserId) return null;
    return {
      operation: "notify_mention",
      reaction: { comment_id: commentId, emoji: "@", action: "add" },
      _mentioned_user_id: mentionedUserId,
      _mentioned_email: (payload.mentioned_email as string) || "",
    };
  }

  if (skillId === "daily-brief") {
    // workspace.activated / team.invite.accepted / deal.created — recompose
    // the brief for the operator inferred from the event actor or payload.
    const userEmail =
      (payload.user_email as string) ||
      (payload.email as string) ||
      (payload.invitee_email as string) ||
      (typeof event.actor_id === "string" && event.actor_id.includes("@") ? event.actor_id : "") ||
      "";
    if (!userEmail || !event.organization_id) return null;
    return {
      organization_id: event.organization_id,
      user_email: userEmail,
      force_recompose: true,
    };
  }

  return null;
}
