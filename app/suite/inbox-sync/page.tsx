// /suite/inbox-sync
//
// Owner-only workspace surface. Lists connected mailboxes (email_sync_cursors
// rows) and exposes "Connect Gmail" + per-mailbox "Sync now" controls.
//
// Auth pattern mirrors /suite/settings/seats: validate session cookie, require
// owner/admin role, fall through to local admin bypass for dev.
//
// SECURITY: this page reads only metadata from email_sync_cursors. Tokens
// live in oauth_credentials and never reach the client.

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { DEFAULT_ORG_ID, organizationIdForSession } from "@/lib/server/tenant";
import { ConnectButton, SyncNowButton } from "./InboxSyncActions";

export const dynamic = "force-dynamic";

interface MailboxRow {
  id: string;
  account_email: string;
  provider: string;
  status: string;
  messages_total: number;
  contacts_created: number;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_reason: string | null;
  created_at: string;
  credential_id: string | null;
}

async function loadMailboxes(
  db: D1Database | undefined,
  organizationId: string,
): Promise<MailboxRow[]> {
  if (!db) return [];
  const result = await db
    .prepare(
      `SELECT id, account_email, provider, status, messages_total, contacts_created,
              last_success_at, last_error_at, last_error_reason, created_at, credential_id
         FROM email_sync_cursors
        WHERE organization_id = ?
        ORDER BY created_at DESC`,
    )
    .bind(organizationId)
    .all<MailboxRow>()
    .catch(() => ({ results: [] as MailboxRow[] }));
  return result.results || [];
}

function StatusPill({ status }: { status: string }) {
  const color =
    status === "active"
      ? { bg: "#e6f3e6", fg: "#3a7a3a" }
      : status === "connecting"
        ? { bg: "#fff4d6", fg: "#7a5a18" }
        : status === "errored"
          ? { bg: "#fce6e2", fg: "#a23a2c" }
          : { bg: "#f1ede8", fg: "#6b6760" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 9px",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        background: color.bg,
        color: color.fg,
        borderRadius: 999,
      }}
    >
      {status}
    </span>
  );
}

function Banner({ kind, text }: { kind: "ok" | "err"; text: string }) {
  const bg = kind === "ok" ? "#e6f3e6" : "#fce6e2";
  const fg = kind === "ok" ? "#3a7a3a" : "#a23a2c";
  return (
    <div
      style={{
        padding: "10px 14px",
        background: bg,
        color: fg,
        fontSize: 13,
        borderRadius: 8,
        border: `1px solid ${fg}33`,
      }}
    >
      {text}
    </div>
  );
}

interface SearchParams {
  connected?: string;
  error?: string;
}

export default async function SuiteInboxSyncPage(props: { searchParams?: Promise<SearchParams> }) {
  const headerList = await headers();
  const cookieHeader = headerList.get("cookie");
  const request = new Request("https://internal.local/suite/inbox-sync", {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
  const context = getRuntimeContext(request);
  const session = await validateSession(context.env.DB, readSessionCookie(request));
  if (!session && !context.user.isLocalAdminBypass) {
    redirect("/login?next=/suite/inbox-sync");
  }
  if (session && session.role !== "owner" && session.role !== "admin") {
    redirect("/suite");
  }

  const organizationId = organizationIdForSession(session, DEFAULT_ORG_ID);
  const mailboxes = await loadMailboxes(context.env.DB, organizationId);
  const searchParams = (await props.searchParams) || {};
  const connected = searchParams.connected === "1";
  const error = searchParams.error;

  return (
    <div style={{ padding: "0 var(--suite-gutter, 32px) 48px", display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="page-h">
        <div>
          <h1>Inbox sync.</h1>
          <div className="sub">Auto-populate the workspace from Gmail. v1: Gmail read-only, last 90 days.</div>
        </div>
      </div>

      {connected && <Banner kind="ok" text="Gmail connected. Run your first sync below." />}
      {error && <Banner kind="err" text={`Connection failed: ${error}`} />}

      <section
        style={{
          border: "1px solid #e8e4de",
          borderRadius: 8,
          background: "#fff",
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#6b6760",
          }}
        >
          Connect a mailbox
        </div>
        <div style={{ fontSize: 13, color: "#4f485d", lineHeight: 1.5 }}>
          ADGA reads message headers + snippets only. Bodies are not pulled in v1.
          Tokens are encrypted at rest.
        </div>
        <ConnectButton />
      </section>

      <section style={{ border: "1px solid #e8e4de", borderRadius: 8, background: "#fff" }}>
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid #e8e4de",
            background: "#f9f7f4",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#6b6760",
            }}
          >
            Connected mailboxes ({mailboxes.length})
          </span>
        </div>

        {mailboxes.length === 0 && (
          <div style={{ padding: "24px 16px", fontSize: 13, color: "#6b6760" }}>
            No mailboxes connected yet. Connect Gmail above to populate your workspace.
          </div>
        )}

        {mailboxes.map((m) => (
          <div
            key={m.id}
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid #f1ede8",
              display: "grid",
              gridTemplateColumns: "1.4fr 0.6fr 0.8fr 0.8fr 1fr",
              gap: 12,
              alignItems: "center",
              fontSize: 13,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ color: "#0d0c0a", fontWeight: 500 }}>
                {m.account_email.startsWith("pending:") ? "(awaiting OAuth)" : m.account_email}
              </span>
              <span style={{ color: "#6b6760", fontSize: 11 }}>
                {m.provider} · added {new Date(m.created_at).toLocaleDateString()}
              </span>
              {m.last_error_reason && (
                <span style={{ color: "#a23a2c", fontSize: 11 }}>last error: {m.last_error_reason}</span>
              )}
            </div>
            <StatusPill status={m.status} />
            <div style={{ color: "#6b6760", fontSize: 12 }}>
              <div>{m.messages_total} messages</div>
              <div>{m.contacts_created} contacts</div>
            </div>
            <div style={{ color: "#6b6760", fontSize: 12 }}>
              {m.last_success_at ? `synced ${new Date(m.last_success_at).toLocaleString()}` : "never synced"}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              {m.status === "active" && m.credential_id && <SyncNowButton credentialId={m.id} />}
            </div>
          </div>
        ))}
      </section>

      <section style={{ fontSize: 12, color: "#6b6760", lineHeight: 1.5 }}>
        v1 scope: Gmail · read-only · last 90 days · contact auto-creation.
        Outlook, calendar sync, and outbound replies land in subsequent iterations
        on the same skill contract.
      </section>
    </div>
  );
}
