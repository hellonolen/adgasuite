/**
 * Event bus — publish/subscribe with D1 persistence, retry, and dead-letter tracking.
 *
 * Every published event is written to the `events` table (append-only) before subscribers
 * are notified. This guarantees the audit trail survives even if a handler crashes.
 *
 * publish() accepts both strictly-typed DomainEvents (compile-time guaranteed shape) and
 * untyped event_type strings (legacy paths during the migration window). Handlers attach
 * by event_type — unknown types just fan to zero listeners, never throw.
 *
 * The bus is in-process today. When we move to Durable Objects + Workers Queues, this
 * module's surface stays the same — only the internals change.
 */

import type { DomainEvent, DomainEventType } from "./types";
import { createEvent } from "@/lib/server/repository";
import { parkDeadLetter, recordDeliveryAttempt, REPLAY_RETRY_BUDGET } from "./replay";
import { registerEventSubscriptions, type SubscriptionContext } from "./subscriptions";

type EventOf<T extends DomainEventType> = Extract<DomainEvent, { event_type: T }>;
type Handler<T extends DomainEventType> = (event: EventOf<T>, context: SubscriptionContext) => void | Promise<void>;
type AnyHandler = (
  event: { event_type: string; payload?: Record<string, unknown> } & Record<string, unknown>,
  context: SubscriptionContext,
) => void | Promise<void>;

const handlers: Map<string, Set<AnyHandler>> = new Map();

export function subscribe<T extends DomainEventType>(eventType: T, handler: Handler<T>): () => void {
  const set = handlers.get(eventType) ?? new Set<AnyHandler>();
  set.add(handler as unknown as AnyHandler);
  handlers.set(eventType, set);
  return () => set.delete(handler as unknown as AnyHandler);
}

// Register skill handlers BEFORE wiring subscriptions so the EVENT_SKILL_BINDINGS
// can look them up. The handlers self-register via the side-effect import.
import "@/lib/agents/handlers";
registerEventSubscriptions(subscribe);

export interface PublishInput {
  organization_id: string;
  event_type: string;
  actor_type: "user" | "agent" | "system" | "webhook" | "cron";
  actor_id?: string | null;
  resource_type?: string | null;
  resource_id?: string | null;
  payload?: Record<string, unknown>;
}

export async function publish(
  db: D1Database | undefined,
  event: PublishInput,
): Promise<unknown> {
  const persisted = await createEvent(db, {
    organization_id: event.organization_id,
    event_type: event.event_type,
    actor_type: event.actor_type,
    actor_id: event.actor_id ?? null,
    resource_type: event.resource_type ?? null,
    resource_id: event.resource_id ?? null,
    payload: event.payload ?? {},
  });

  const subscribers = handlers.get(event.event_type);
  if (subscribers && subscribers.size > 0) {
    for (const handler of subscribers) {
      Promise.resolve(handler(persisted as any, { db }))
        .then(async () => {
          await recordDeliveryAttempt(db, (persisted as { id?: string }).id ?? "", null);
        })
        .catch(async (err) => {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[event-bus] handler for ${event.event_type} threw:`, err);
          await recordDeliveryAttempt(db, (persisted as { id?: string }).id ?? "", message);
          // If this handler has now exhausted its retry budget, park the event in the
          // dead-letter table so an operator (or the Conductor agent) can review it.
          const attempts = ((persisted as { delivery_attempts?: number }).delivery_attempts ?? 0) + 1;
          if (attempts >= REPLAY_RETRY_BUDGET) {
            await parkDeadLetter(db, {
              id: (persisted as { id: string }).id,
              organization_id: event.organization_id,
              event_type: event.event_type,
              actor_type: event.actor_type,
              actor_id: event.actor_id ?? null,
              resource_type: event.resource_type ?? null,
              resource_id: event.resource_id ?? null,
              created_at: new Date().toISOString(),
              payload: event.payload ?? {},
              delivery_attempts: attempts,
              last_error: message,
              last_attempted_at: new Date().toISOString(),
            });
          }
        });
    }
  }

  return persisted;
}

/** Number of currently-registered handlers per event type. Diagnostic surface for /api/mcp. */
export function inspectHandlers(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [type, set] of handlers.entries()) out[type] = set.size;
  return out;
}
