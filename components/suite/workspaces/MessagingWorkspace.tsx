"use client";

/**
 * MessagingWorkspace — extracted from AdgaSuite.tsx route === "messaging".
 * Lightweight SMS surface: send + history, all backed by /api/messages/sms.
 */

import React from "react";

type SmsRow = {
  id: string;
  to_number: string;
  status: string;
  body: string;
  created_at: string;
};

type SmsPostResult = {
  sms?: { status: string; body: string };
};

function Pill({ tone, children }: { tone: "green" | "amber" | "red"; children: React.ReactNode }) {
  return <span className={"pill " + tone}>{children}</span>;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Not set";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function MessagingWorkspace() {
  const [result, setResult] = React.useState<SmsPostResult | null>(null);
  const [messages, setMessages] = React.useState<SmsRow[]>([]);
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/messages/sms")
      .then((r) => r.json())
      .then((data: { messages?: SmsRow[] }) => {
        if (Array.isArray(data.messages)) setMessages(data.messages);
      })
      .catch(() => {});
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSending(true);
    try {
      const response = await fetch("/api/messages/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: form.get("to"), message: form.get("message") }),
      });
      const data = (await response.json()) as SmsPostResult & { sms?: SmsRow };
      setResult(data);
      if (data.sms) setMessages((prev) => [data.sms as SmsRow, ...prev]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="page-h">
        <div>
          <h1>Messaging</h1>
          <div className="sub">Send and track client text messages from the same workspace where the lead and deal live.</div>
        </div>
      </div>
      <div style={{ padding: "0 32px 28px", display: "grid", gridTemplateColumns: "420px minmax(0,1fr)", gap: 14, overflow: "auto", flex: 1 }}>
        <div className="card">
          <div className="card-h"><div className="ttl">Send text message</div></div>
          <form className="card-b" style={{ display: "flex", flexDirection: "column", gap: 12 }} onSubmit={submit}>
            <div className="field"><label>Phone number</label><input name="to" type="tel" placeholder="+15551234567" required /></div>
            <div className="field"><label>Message</label><textarea name="message" rows={5} placeholder="Meeting reminder, follow-up, or lead response" required /></div>
            <button className="btn primary" type="submit" disabled={sending}>{sending ? "Sending..." : "Send message"}</button>
          </form>
        </div>
        {result?.sms && (
          <div className="card">
            <div className="card-h"><div className="ttl">Delivery</div></div>
            <div className="card-b">
              <dl className="kv">
                <dt>Status</dt>
                <dd><Pill tone={result.sms.status === "sent" ? "green" : "amber"}>{result.sms.status === "sent" ? "Sent" : "Queued"}</Pill></dd>
                <dt>Message</dt>
                <dd>{result.sms.body}</dd>
              </dl>
            </div>
          </div>
        )}
        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-h"><div className="ttl">Message history</div></div>
          <table className="tbl">
            <thead><tr><th>To</th><th>Status</th><th>Message</th><th>Created</th></tr></thead>
            <tbody>
              {messages.length === 0 && <tr><td colSpan={4} className="muted">No messages yet.</td></tr>}
              {messages.map((m) => (
                <tr key={m.id}>
                  <td className="mono">{m.to_number}</td>
                  <td><Pill tone={m.status === "sent" ? "green" : m.status === "failed" ? "red" : "amber"}>{m.status === "sent" ? "Sent" : m.status === "failed" ? "Needs attention" : "Queued"}</Pill></td>
                  <td>{m.body}</td>
                  <td className="mono text-xs">{formatDateTime(m.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
