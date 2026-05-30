"use client";

/**
 * TimelinePanel — record-scoped activity stream surface.
 *
 * Mounts on any record detail view (deal, contact, lead, org, workspace) and
 * renders the chronological event list returned by /api/timeline. Pagination
 * uses an opaque base64 cursor — the panel just forwards whatever the server
 * hands back.
 *
 * Light mode only. Tokens come from CSS variables already declared in the
 * suite shell (`--rule`, `--surface`, `--text`, `--text-2`, `--text-3`).
 *
 * Integration is left for a follow-up — mount with:
 *   <TimelinePanel resourceType="deal" resourceId={deal.id} />
 */

import React from "react";

type ResourceType = "contact" | "lead" | "deal" | "organization" | "workspace";

interface TimelineItem {
  id: string;
  event_type: string;
  actor_type: string;
  actor_id: string;
  occurred_at: string;
  summary: string;
  payload: Record<string, unknown>;
}

interface TimelineResponse {
  ok: boolean;
  items: TimelineItem[];
  next_cursor: string | null;
  error?: string;
}

interface TimelinePanelProps {
  resourceType: ResourceType;
  resourceId: string;
}

// ─── Icons ─────────────────────────────────────────────────────────────────────
// Inline SVGs — never import from AdgaSuite.tsx (per panel pattern). One icon
// per high-frequency event category, with a generic dot fallback.

function IconDeal() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
function IconApproval() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" />
    </svg>
  );
}
function IconLead() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    </svg>
  );
}
function IconImport() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function IconInvite() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}
function IconVoice() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" />
    </svg>
  );
}
function IconDot() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function iconFor(eventType: string): React.ReactNode {
  if (eventType.startsWith("deal.")) return <IconDeal />;
  if (eventType.startsWith("agent_approval.")) return <IconApproval />;
  if (eventType.startsWith("lead.")) return <IconLead />;
  if (eventType.startsWith("import.")) return <IconImport />;
  if (eventType.startsWith("team.invite.")) return <IconInvite />;
  if (eventType.startsWith("voice_note.")) return <IconVoice />;
  return <IconDot />;
}

// ─── Relative time ─────────────────────────────────────────────────────────────

function relativeTime(iso: string, now: number = Date.now()): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  const diffMs = now - t;
  if (diffMs < 0) return "just now";
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function TimelinePanel({ resourceType, resourceId }: TimelinePanelProps) {
  const [items, setItems] = React.useState<TimelineItem[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [loadingMore, setLoadingMore] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchPage = React.useCallback(
    async (cursor: string | null, isInitial: boolean) => {
      if (!resourceId) return;
      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const params = new URLSearchParams({
        resource_type: resourceType,
        resource_id: resourceId,
        limit: "20",
      });
      if (cursor) params.set("cursor", cursor);

      try {
        const response = await fetch(`/api/timeline?${params.toString()}`, {
          credentials: "same-origin",
        });
        const data = (await response.json()) as TimelineResponse;
        if (!response.ok || !data.ok) {
          throw new Error(data.error || `Request failed (${response.status})`);
        }
        setItems((prev) => (isInitial ? data.items : [...prev, ...data.items]));
        setNextCursor(data.next_cursor);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load timeline.");
      } finally {
        if (isInitial) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [resourceType, resourceId],
  );

  React.useEffect(() => {
    setItems([]);
    setNextCursor(null);
    void fetchPage(null, true);
  }, [fetchPage]);

  return (
    <div
      style={{
        border: "1px solid var(--rule)",
        borderRadius: 10,
        background: "var(--surface)",
        fontSize: 13,
        color: "var(--text)",
      }}
    >
      <header
        style={{
          padding: "12px 14px",
          borderBottom: "1px solid var(--rule)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontWeight: 600, letterSpacing: "-0.005em" }}>Activity</div>
        <div style={{ fontSize: 11, color: "var(--text-3)" }}>
          {loading ? "Loading…" : `${items.length} event${items.length === 1 ? "" : "s"}`}
        </div>
      </header>

      {error && (
        <div
          style={{
            margin: 12,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid var(--rule)",
            background: "var(--surface)",
            color: "var(--text-2)",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div
          style={{
            padding: "24px 14px",
            textAlign: "center",
            color: "var(--text-3)",
            fontSize: 12,
          }}
        >
          No activity yet.
        </div>
      )}

      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {items.map((item) => (
          <li
            key={item.id}
            style={{
              display: "flex",
              gap: 10,
              padding: "10px 14px",
              borderTop: "1px solid var(--rule)",
              alignItems: "flex-start",
            }}
          >
            <span
              aria-hidden
              style={{
                display: "inline-flex",
                width: 22,
                height: 22,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 6,
                background: "var(--surface)",
                border: "1px solid var(--rule)",
                color: "var(--text-2)",
                flex: "0 0 auto",
                marginTop: 1,
              }}
            >
              {iconFor(item.event_type)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text)",
                  lineHeight: 1.4,
                  wordBreak: "break-word",
                }}
              >
                {item.summary}
              </div>
              <div
                style={{
                  marginTop: 2,
                  fontSize: 11,
                  color: "var(--text-3)",
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                }}
              >
                <span title={item.occurred_at}>{relativeTime(item.occurred_at)}</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span>{item.event_type}</span>
                {item.actor_id && (
                  <>
                    <span style={{ opacity: 0.5 }}>·</span>
                    <span>{item.actor_id}</span>
                  </>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {nextCursor && (
        <div
          style={{
            padding: 12,
            borderTop: "1px solid var(--rule)",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            onClick={() => void fetchPage(nextCursor, false)}
            disabled={loadingMore}
            style={{
              fontSize: 12,
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid var(--rule)",
              background: "var(--surface)",
              color: "var(--text)",
              cursor: loadingMore ? "default" : "pointer",
              opacity: loadingMore ? 0.6 : 1,
            }}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
