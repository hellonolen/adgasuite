"use client";

import React, { useState, useTransition } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "error"; message: string }
  | { kind: "done"; summary: string };

export function ConnectButton() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    setStatus({ kind: "working" });
    startTransition(async () => {
      try {
        const resp = await fetch("/api/inbox-sync/connect", { method: "POST" });
        const data = (await resp.json()) as { ok?: boolean; oauth_url?: string; error?: string };
        if (!data.ok || !data.oauth_url) {
          setStatus({ kind: "error", message: data.error || "connect_failed" });
          return;
        }
        window.location.href = data.oauth_url;
      } catch (err) {
        const message = err instanceof Error ? err.message : "network_error";
        setStatus({ kind: "error", message });
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button
        type="button"
        onClick={onClick}
        disabled={pending || status.kind === "working"}
        style={{
          padding: "10px 16px",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          background: "#5d2cd6",
          color: "#ffffff",
          border: "none",
          borderRadius: 999,
          cursor: pending ? "wait" : "pointer",
        }}
      >
        {status.kind === "working" ? "Opening Google…" : "Connect Gmail"}
      </button>
      {status.kind === "error" && (
        <span style={{ fontSize: 12, color: "#a23a2c" }}>Could not start OAuth: {status.message}</span>
      )}
    </div>
  );
}

export function SyncNowButton({ credentialId }: { credentialId: string }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    setStatus({ kind: "working" });
    startTransition(async () => {
      try {
        const resp = await fetch("/api/inbox-sync/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential_id: credentialId }),
        });
        const data = (await resp.json()) as {
          ok?: boolean;
          messages_processed?: number;
          contacts_created?: number;
          records_touched?: number;
          error?: string;
        };
        if (!data.ok) {
          setStatus({ kind: "error", message: data.error || "sync_failed" });
          return;
        }
        const summary = `${data.messages_processed ?? 0} messages · ${data.contacts_created ?? 0} new contacts`;
        setStatus({ kind: "done", summary });
        // Trigger a soft refresh so the cursor totals on the page update.
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        const message = err instanceof Error ? err.message : "network_error";
        setStatus({ kind: "error", message });
      }
    });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button
        type="button"
        onClick={onClick}
        disabled={pending || status.kind === "working"}
        style={{
          padding: "6px 12px",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          background: "#0d0c0a",
          color: "#ffffff",
          border: "none",
          borderRadius: 999,
          cursor: pending ? "wait" : "pointer",
        }}
      >
        {status.kind === "working" ? "Syncing…" : "Sync now"}
      </button>
      {status.kind === "done" && <span style={{ fontSize: 12, color: "#3a7a3a" }}>{status.summary}</span>}
      {status.kind === "error" && <span style={{ fontSize: 12, color: "#a23a2c" }}>{status.message}</span>}
    </div>
  );
}

