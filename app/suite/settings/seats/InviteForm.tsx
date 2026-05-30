"use client";

import React, { useState, useTransition } from "react";

interface Props {
  defaultRole?: "admin" | "member";
}

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; email: string }
  | { kind: "error"; message: string };

export default function InviteForm({ defaultRole = "member" }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">(defaultRole);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setStatus({ kind: "sending" });
    startTransition(async () => {
      try {
        const response = await fetch("/api/team/invites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            invitee_email: email.trim(),
            invitee_role: role,
            message: message.trim() || null,
          }),
        });
        const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!response.ok || !data.ok) throw new Error(data.error || "Invite failed.");
        setStatus({ kind: "sent", email: email.trim() });
        setEmail("");
        setMessage("");
      } catch (error) {
        setStatus({ kind: "error", message: error instanceof Error ? error.message : "Invite failed." });
      }
    });
  };

  return (
    <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "1fr 130px 1fr auto", gap: 10, alignItems: "center" }}>
      <input
        type="email"
        required
        placeholder="teammate@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={pending}
        style={{ padding: "10px 12px", border: "1px solid #e8e4de", borderRadius: 6, fontSize: 14, background: "#fff" }}
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as "admin" | "member")}
        disabled={pending}
        style={{ padding: "10px 12px", border: "1px solid #e8e4de", borderRadius: 6, fontSize: 14, background: "#fff" }}
      >
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </select>
      <input
        type="text"
        placeholder="Optional message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={pending}
        maxLength={500}
        style={{ padding: "10px 12px", border: "1px solid #e8e4de", borderRadius: 6, fontSize: 14, background: "#fff" }}
      />
      <button
        type="submit"
        disabled={pending || !email.trim()}
        style={{
          padding: "10px 16px",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          background: pending || !email.trim() ? "#a8a39c" : "#5d2cd6",
          color: "#fff",
          border: "none",
          borderRadius: 999,
          cursor: pending || !email.trim() ? "not-allowed" : "pointer",
        }}
      >
        {pending ? "Sending..." : "Invite"}
      </button>
      {status.kind === "sent" && (
        <div style={{ gridColumn: "1 / -1", fontSize: 13, color: "#16a34a" }}>
          Invite sent to {status.email}.
        </div>
      )}
      {status.kind === "error" && (
        <div style={{ gridColumn: "1 / -1", fontSize: 13, color: "#ef4444" }}>
          {status.message}
        </div>
      )}
    </form>
  );
}
