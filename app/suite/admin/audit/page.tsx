"use client";

import { useEffect, useMemo, useState } from "react";

type Analytics = {
  ok: boolean;
  counts: Record<string, number>;
  scroll_depths: Array<{ depth: number; count: number }>;
  recent: Array<{
    id: string;
    event_type: string;
    session_id: string | null;
    created_at: string;
    payload: Record<string, unknown>;
  }>;
};

const LABELS: Array<[string, string]> = [
  ["landed", "Visitors"],
  ["optin_clicked", "Opt-in clicks"],
  ["optin_succeeded", "Magic links requested"],
  ["access_viewed", "Access views"],
  ["secret_viewed", "Secret reads"],
  ["scroll_depth", "Scroll depth events"],
];

export default function SuiteAdminAuditPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/lead-magnets/five-secrets/analytics", { credentials: "include" })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as Analytics & { error?: string };
        if (!response.ok) throw new Error(body.error || "Could not load analytics.");
        if (active) setAnalytics(body);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Could not load analytics.");
      });
    return () => {
      active = false;
    };
  }, []);

  const conversion = useMemo(() => {
    const visitors = analytics?.counts?.landed || 0;
    const optins = analytics?.counts?.optin_succeeded || 0;
    if (!visitors) return "0%";
    return `${Math.round((optins / visitors) * 100)}%`;
  }, [analytics]);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8 md:py-14">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Audit</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Lead magnet performance</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Five Secrets visitor, opt-in, access, reading, and scroll metadata. Contact data stays out of D1 analytics.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Opt-in conversion" value={conversion} />
        {LABELS.map(([key, label]) => (
          <Metric key={key} label={label} value={String(analytics?.counts?.[key] || 0)} />
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
        <h2 className="text-lg font-semibold">Scroll depth</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[25, 50, 75, 90].map((depth) => {
            const row = analytics?.scroll_depths?.find((item) => item.depth === depth);
            return <Metric key={depth} label={`${depth}%`} value={String(row?.count || 0)} compact />;
          })}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
        <h2 className="text-lg font-semibold">Recent activity</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          {(analytics?.recent || []).slice(0, 20).map((event) => (
            <div key={event.id} className="grid gap-2 border-b border-border px-4 py-3 text-sm last:border-b-0 md:grid-cols-[220px_1fr_180px]">
              <div className="font-medium">{event.event_type.replace("lead_magnet.five_secrets.", "")}</div>
              <div className="truncate text-muted-foreground">{event.session_id || "five-secrets"}</div>
              <div className="text-muted-foreground md:text-right">{new Date(event.created_at).toLocaleString()}</div>
            </div>
          ))}
          {analytics && analytics.recent.length === 0 && (
            <div className="px-4 py-8 text-sm text-muted-foreground">No Five Secrets analytics events yet.</div>
          )}
          {!analytics && !error && (
            <div className="px-4 py-8 text-sm text-muted-foreground">Loading analytics...</div>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, compact }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className={compact ? "mt-2 text-xl font-semibold" : "mt-2 text-2xl font-semibold"}>{value}</div>
    </div>
  );
}
