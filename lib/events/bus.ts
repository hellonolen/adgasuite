/**
 * Event bus — publish/subscribe with D1 persistence.
 *
 * Every published event is written to the `events` table (append-only) before subscribers
 * are notified. This guarantees the audit trail survives even if a handler crashes.
 *
 * The bus is in-process today. When we move to Durable Objects + Workers Queues, this
 * module's surface stays the same — only the internals change.
 */

import type { DomainEvent, DomainEventType } from "./types";
import { createEvent } from "@/lib/server/repository";

type EventOf<T extends DomainEventType> = Extract<DomainEvent, { event_type: T }>;
type Handler<T extends DomainEventType> = (event: EventOf<T>) => void | Promise<void>;

const handlers: Map<DomainEventType, Set<Handler<DomainEventType>>> = new Map();

export function subscribe<T extends DomainEventType>(eventType: T, handler: Handler<T>): () => void {
  const set = handlers.get(eventType) ?? new Set();
  set.add(handler as unknown as Handler<DomainEventType>);
  handlers.set(eventType, set);
  return () => set.delete(handler as unknown as Handler<DomainEventType>);
}

export async function publish<T extends DomainEventType>(
  db: D1Database | undefined,
  event: Omit<EventOf<T>, "id" | "created_at"> & { event_type: T },
): Promise<EventOf<T>> {
  const persisted = (await createEvent(db, {
    organization_id: event.organization_id,
    event_type: event.event_type,
    actor_type: event.actor_type,
    actor_id: event.actor_id ?? null,
    resource_type: event.resource_type ?? null,
    resource_id: event.resource_id ?? null,
    payload: (event as { payload?: Record<string, unknown> }).payload ?? {},
  })) as EventOf<T>;

  const subscribers = handlers.get(event.event_type);
  if (subscribers) {
    for (const handler of subscribers) {
      Promise.resolve(handler(persisted)).catch((err) => {
        // Never let a bad subscriber crash the publish path.
        console.error(`[event-bus] handler for ${event.event_type} threw:`, err);
      });
    }
  }

  return persisted;
}
