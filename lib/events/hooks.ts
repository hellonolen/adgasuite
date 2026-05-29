"use client";

/**
 * React-side event hooks — let any workspace subscribe to the domain event stream and re-render
 * when relevant events fire. This is the rail for event-driven UI.
 *
 * The hook subscribes to a CLIENT-SIDE bus mirror (BroadcastChannel for cross-tab fan-out, plus
 * an in-memory emitter for same-tab fan-out). Server-emitted events reach the client via the
 * existing /api/agent/events POST + optional polling/SSE that will land in a follow-up.
 *
 * Goal: any workspace can write
 *
 *   useSuiteEvent("lead.captured", (event) => { ... });
 *
 * and the UI reacts to agent activity without any code in the parent shell knowing about it.
 */

import React from "react";
import type { DomainEvent, DomainEventType } from "./types";

type EventOf<T extends DomainEventType> = Extract<DomainEvent, { event_type: T }>;
type Listener = (event: DomainEvent) => void;

class ClientEventEmitter {
  private listeners = new Map<DomainEventType, Set<Listener>>();
  private channel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      this.channel = new BroadcastChannel("adga:events");
      this.channel.onmessage = (e) => this.fan(e.data as DomainEvent);
    }
  }

  on(eventType: DomainEventType, listener: Listener): () => void {
    const set = this.listeners.get(eventType) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(eventType, set);
    return () => set.delete(listener);
  }

  emit(event: DomainEvent): void {
    this.fan(event);
    if (this.channel) this.channel.postMessage(event);
  }

  private fan(event: DomainEvent): void {
    const set = this.listeners.get(event.event_type);
    if (!set) return;
    for (const l of set) {
      try { l(event); } catch (e) { console.error("[event-hooks] listener threw:", e); }
    }
  }
}

// Module-singleton so all hooks share one bus mirror per tab.
let _emitter: ClientEventEmitter | null = null;
function getEmitter(): ClientEventEmitter {
  if (!_emitter) _emitter = new ClientEventEmitter();
  return _emitter;
}

/** Subscribe to a domain event type. Re-renders the calling component on each matching event. */
export function useSuiteEvent<T extends DomainEventType>(
  eventType: T,
  handler: (event: EventOf<T>) => void,
): void {
  React.useEffect(() => {
    const emitter = getEmitter();
    const unsubscribe = emitter.on(eventType, handler as Listener);
    return unsubscribe;
  }, [eventType, handler]);
}

/** Emit an event into the client mirror. Call this after a successful POST to /api/agent/events. */
export function emitSuiteEvent(event: DomainEvent): void {
  getEmitter().emit(event);
}

/**
 * useEventStream — polls /api/events/stream and fans new events into the client emitter.
 * Closes the server→client link required by GAP #6. One mount per app at most (handled
 * by the SuiteContextProvider so every workspace gets reactive updates "for free").
 *
 *   - Polls every `intervalMs` (default 10 s) while the tab is visible.
 *   - Pauses while hidden (visibilitychange), resumes on focus.
 *   - Cursor persists across polls; on first call it picks events from the last 10 s.
 */
export function useEventStream({ intervalMs = 10_000 }: { intervalMs?: number } = {}): void {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    let cursor: string | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      if (cancelled) return;
      if (document.visibilityState === "hidden") {
        timer = setTimeout(poll, intervalMs);
        return;
      }
      try {
        const url = new URL("/api/events/stream", window.location.origin);
        if (cursor) url.searchParams.set("since", cursor);
        const response = await fetch(url.toString(), {
          credentials: "include",
          headers: { accept: "application/json" },
        });
        if (response.ok) {
          const data = (await response.json().catch(() => null)) as
            | { ok?: boolean; events?: DomainEvent[]; cursor?: string }
            | null;
          if (data?.cursor) cursor = data.cursor;
          if (data?.events) {
            const emitter = getEmitter();
            for (const event of data.events) emitter.emit(event);
          }
        }
      } catch {
        // Quiet — next tick retries. The audit log on the server is the truth.
      }
      if (!cancelled) timer = setTimeout(poll, intervalMs);
    };

    poll();
    const onVisibility = () => {
      if (document.visibilityState === "visible" && !timer) poll();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs]);
}
