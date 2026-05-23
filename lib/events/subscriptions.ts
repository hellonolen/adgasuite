/**
 * Subscription wiring — which agent reacts to which event.
 *
 * Keep this file small. The canonical doc requires agents to communicate via events only —
 * no direct imports between agent files. This module is where the connection is declared.
 *
 * Register a subscriber by importing `subscribe` from `./bus` and wiring it here. The actual
 * handler logic lives in the appropriate `agents/<agent>/` module.
 */

// Subscriptions are wired explicitly by the agents themselves on cold start. This file is the
// inventory: every event type should appear here with the agents that react to it so the
// connectivity graph is auditable.

export const SUBSCRIPTION_INVENTORY = {
  "lead.captured":            ["sales"],
  "lead.qualified":           ["sales", "intelligence"],
  "lead.lost":                ["intelligence"],

  "deal.created":             ["intelligence"],
  "deal.stage_changed":       ["conductor", "intelligence"],
  "deal.won":                 ["intelligence", "payments"],
  "deal.lost":                ["intelligence"],

  "map.node_added":           ["conductor"],
  "map.node_removed":         ["conductor"],

  "agent_approval.requested": ["conductor", "communication"],
  "agent_approval.approved":  ["conductor"],
  "agent_approval.rejected":  ["conductor"],

  "agent_job.started":        ["intelligence"],
  "agent_job.completed":      ["conductor", "intelligence"],
  "agent_job.failed":         ["conductor", "intelligence"],

  "revenue.captured":         ["intelligence", "sales"],
  "forecast.below_target":    ["conductor", "intelligence"],
  "gap.identified":           ["conductor"],

  "suite.route_viewed":       ["intelligence"],
} as const;

export type EventSubscriptionKey = keyof typeof SUBSCRIPTION_INVENTORY;
