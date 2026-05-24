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
}
