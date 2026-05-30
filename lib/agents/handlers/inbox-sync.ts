// Communication handler: skills/inbox-sync.skill.md
//
// v1 scope (Gmail only):
//   - operation: "connect"     → persist a `connecting` cursor + return OAuth URL
//   - operation: "sync_full"   → page Gmail messages, upsert contacts, link messages, emit events
//   - other operations (sync_incremental / send_reply / disconnect) → not_implemented
//
// State contract: cloudflare/state/email-sync-cursor.schema.json (email_sync_cursors row)
// Encryption:     lib/server/crypto.ts (AES-GCM keyed by ADGA_ENCRYPTION_KEY)
// OAuth helper:   lib/integrations/google-oauth.ts (separate from sign-in OAuth)
// Gmail helper:   lib/integrations/gmail-api.ts
//
// SECURITY:
//   - NEVER log access_token / refresh_token / message bodies / headers
//   - Tokens are persisted encrypted (oauth_credentials.access_token_encrypted)
//   - Message bodies are not fetched in v1 (we use format=metadata to keep PII minimal)
//
// Event sequencing per cycle:
//   inbox.sync.started   (once at top)
//   contact.auto_created (per new contact)
//   inbox.message.linked (per persisted message)
//   inbox.sync.completed (once at end with counters)  OR  inbox.sync.failed

import { publish } from "@/lib/events/bus";
import { newId, nowIso } from "@/lib/server/id";
import { encrypt, decrypt, isEncryptionConfigured } from "@/lib/server/crypto";
import {
  buildAuthUrl,
  exchangeCode,
  refreshToken,
  inboxSyncRedirectUri,
} from "@/lib/integrations/google-oauth";
import {
  listMessageIds,
  getMessage,
  headerValue,
  parseFromHeader,
} from "@/lib/integrations/gmail-api";
import type { SkillContext } from "@/lib/agents/skill-registry";

export interface InboxSyncInput {
  operation: "connect" | "sync_full" | "sync_incremental" | "send_reply" | "disconnect";
  provider: "gmail" | "outlook";
  credential_id?: string | null;
  cursor?: string | null;
  reply?: {
    thread_id: string;
    message_id: string | null;
    body: string;
    cc: string[] | null;
    bcc: string[] | null;
  };
  /**
   * Optional request URL — used to derive the OAuth redirect_uri so localhost
   * dev flows return to the dev origin instead of the production host.
   */
  request_url?: string | null;
  user_id?: string | null;
  user_email?: string | null;
}

export interface InboxSyncOutput {
  sync_id: string | null;
  messages_processed: number;
  contacts_created: number;
  records_touched: number;
  /**
   * cursor convention:
   *   - operation="connect" → returns the OAuth URL the operator must visit
   *   - operation="sync_full" → returns provider next-page token (null when done)
   */
  cursor: string | null;
}

const MAX_PAGES_PER_RUN = 5;     // 5 pages × ~100 msgs = ~500 msgs / run, keeps Worker CPU bounded
const PAGE_SIZE = 100;
const GMAIL_LOOKBACK = "newer_than:90d";

// ─── Table bootstrap (defensive; migration 0028 is authoritative) ────────────

async function ensureTables(env: CloudflareEnv): Promise<void> {
  if (!env.DB) return;
  await env.DB
    .prepare(
      `CREATE TABLE IF NOT EXISTS email_sync_cursors (
         id TEXT PRIMARY KEY,
         organization_id TEXT NOT NULL,
         user_id TEXT NOT NULL,
         provider TEXT NOT NULL,
         account_email TEXT NOT NULL,
         credential_id TEXT,
         status TEXT NOT NULL,
         cursor TEXT,
         sync_started_at TEXT,
         last_success_at TEXT,
         last_error_at TEXT,
         last_error_reason TEXT,
         messages_total INTEGER NOT NULL DEFAULT 0,
         contacts_created INTEGER NOT NULL DEFAULT 0,
         created_at TEXT NOT NULL,
         updated_at TEXT
       )`,
    )
    .run();
  await env.DB
    .prepare(
      `CREATE TABLE IF NOT EXISTS oauth_credentials (
         id TEXT PRIMARY KEY,
         organization_id TEXT NOT NULL,
         user_id TEXT NOT NULL,
         provider TEXT NOT NULL,
         account_email TEXT,
         access_token_encrypted TEXT NOT NULL,
         refresh_token_encrypted TEXT,
         expires_at TEXT,
         scope TEXT,
         created_at TEXT NOT NULL,
         updated_at TEXT
       )`,
    )
    .run();
  await env.DB
    .prepare(
      `CREATE TABLE IF NOT EXISTS email_messages (
         id TEXT PRIMARY KEY,
         organization_id TEXT NOT NULL,
         message_id TEXT NOT NULL,
         thread_id TEXT,
         account_email TEXT NOT NULL,
         from_email TEXT,
         from_name TEXT,
         subject TEXT,
         snippet TEXT,
         body_encrypted TEXT,
         internal_date TEXT,
         linked_resource_type TEXT,
         linked_resource_id TEXT,
         created_at TEXT NOT NULL
       )`,
    )
    .run();
}

// ─── connect ────────────────────────────────────────────────────────────────

async function handleConnect(
  ctx: SkillContext,
  input: InboxSyncInput,
): Promise<InboxSyncOutput> {
  if (!ctx.env.DB) throw new Error("inbox-sync requires D1.");
  if (input.provider !== "gmail") throw new Error("only gmail supported in v1");
  if (!ctx.env.GOOGLE_OAUTH_CLIENT_ID || !ctx.env.GOOGLE_OAUTH_CLIENT_SECRET) {
    throw new Error("oauth_not_configured");
  }
  if (!isEncryptionConfigured()) {
    throw new Error("encryption_not_configured");
  }

  await ensureTables(ctx.env);

  const cursorId = newId("esc");
  const now = nowIso();
  const redirectUri = inboxSyncRedirectUri(ctx.env, input.request_url || undefined);
  const oauthUrl = buildAuthUrl(ctx.env, { state: cursorId, redirect_uri: redirectUri });

  // We don't know the mailbox email yet — gets filled in on the callback.
  // Account_email is required NOT NULL — use a placeholder keyed on user_id.
  const placeholderAccount = `pending:${input.user_email || ctx.actor_id || cursorId}`;

  await ctx.env.DB
    .prepare(
      `INSERT INTO email_sync_cursors
         (id, organization_id, user_id, provider, account_email, status, cursor,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'connecting', ?, ?, ?)`,
    )
    .bind(
      cursorId,
      ctx.organization_id,
      input.user_id || ctx.actor_id || "system",
      "gmail",
      placeholderAccount,
      oauthUrl,             // cursor field temporarily holds the OAuth URL until callback fires
      now,
      now,
    )
    .run();

  return {
    sync_id: cursorId,
    messages_processed: 0,
    contacts_created: 0,
    records_touched: 0,
    cursor: oauthUrl,
  };
}

// ─── sync_full ───────────────────────────────────────────────────────────────

interface CursorRow {
  id: string;
  organization_id: string;
  user_id: string;
  provider: string;
  account_email: string;
  credential_id: string | null;
  status: string;
  cursor: string | null;
}

interface OAuthCredRow {
  id: string;
  organization_id: string;
  user_id: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  expires_at: string | null;
}

async function loadCursor(env: CloudflareEnv, id: string, organizationId: string): Promise<CursorRow | null> {
  return env.DB!
    .prepare(
      `SELECT id, organization_id, user_id, provider, account_email, credential_id, status, cursor
         FROM email_sync_cursors
        WHERE id = ? AND organization_id = ?
        LIMIT 1`,
    )
    .bind(id, organizationId)
    .first<CursorRow>()
    .catch(() => null);
}

async function loadCredential(env: CloudflareEnv, id: string, organizationId: string): Promise<OAuthCredRow | null> {
  return env.DB!
    .prepare(
      `SELECT id, organization_id, user_id, access_token_encrypted, refresh_token_encrypted, expires_at
         FROM oauth_credentials
        WHERE id = ? AND organization_id = ?
        LIMIT 1`,
    )
    .bind(id, organizationId)
    .first<OAuthCredRow>()
    .catch(() => null);
}

async function getUsableAccessToken(
  ctx: SkillContext,
  cred: OAuthCredRow,
): Promise<string> {
  const accessToken = await decrypt(cred.access_token_encrypted);
  const expiresAtMs = cred.expires_at ? Date.parse(cred.expires_at) : 0;
  // Refresh if expired or within 60s of expiry
  if (!expiresAtMs || expiresAtMs - Date.now() < 60_000) {
    if (!cred.refresh_token_encrypted) return accessToken; // last-ditch: hope it still works
    const refreshTok = await decrypt(cred.refresh_token_encrypted);
    const refreshed = await refreshToken(ctx.env, { refresh_token: refreshTok });
    const newExpiresAt = new Date(Date.now() + (refreshed.expires_in - 60) * 1000).toISOString();
    const newAccessEncrypted = await encrypt(refreshed.access_token);
    await ctx.env.DB!
      .prepare(
        `UPDATE oauth_credentials
            SET access_token_encrypted = ?, expires_at = ?, updated_at = ?
          WHERE id = ?`,
      )
      .bind(newAccessEncrypted, newExpiresAt, nowIso(), cred.id)
      .run();
    return refreshed.access_token;
  }
  return accessToken;
}

interface ContactMatch {
  id: string;
  created: boolean;
}

async function upsertContactByEmail(
  env: CloudflareEnv,
  organizationId: string,
  email: string,
  displayName: string | null,
  now: string,
): Promise<ContactMatch> {
  const existing = await env.DB!
    .prepare(`SELECT id FROM contacts WHERE organization_id = ? AND email = ? LIMIT 1`)
    .bind(organizationId, email)
    .first<{ id: string }>()
    .catch(() => null);
  if (existing?.id) return { id: existing.id, created: false };

  const [firstName, ...restName] = (displayName || email.split("@")[0]).split(/\s+/);
  const lastName = restName.join(" ") || "";
  const contactId = newId("ctc");
  await env.DB!
    .prepare(
      `INSERT INTO contacts
         (id, organization_id, first_name, last_name, email, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'lead', ?, ?)`,
    )
    .bind(contactId, organizationId, firstName || "Unknown", lastName, email, now, now)
    .run();
  return { id: contactId, created: true };
}

async function persistMessageIfNew(
  env: CloudflareEnv,
  organizationId: string,
  accountEmail: string,
  payload: {
    message_id: string;
    thread_id: string | null;
    from_email: string | null;
    from_name: string | null;
    subject: string | null;
    snippet: string | null;
    internal_date: string | null;
    linked_resource_type: string | null;
    linked_resource_id: string | null;
  },
  now: string,
): Promise<{ inserted: boolean; row_id: string }> {
  const existing = await env.DB!
    .prepare(
      `SELECT id FROM email_messages
        WHERE organization_id = ? AND account_email = ? AND message_id = ?
        LIMIT 1`,
    )
    .bind(organizationId, accountEmail, payload.message_id)
    .first<{ id: string }>()
    .catch(() => null);
  if (existing?.id) return { inserted: false, row_id: existing.id };

  const rowId = newId("emsg");
  await env.DB!
    .prepare(
      `INSERT INTO email_messages
         (id, organization_id, message_id, thread_id, account_email,
          from_email, from_name, subject, snippet, body_encrypted, internal_date,
          linked_resource_type, linked_resource_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
    )
    .bind(
      rowId,
      organizationId,
      payload.message_id,
      payload.thread_id,
      accountEmail,
      payload.from_email,
      payload.from_name,
      payload.subject,
      payload.snippet,
      payload.internal_date,
      payload.linked_resource_type,
      payload.linked_resource_id,
      now,
    )
    .run();
  return { inserted: true, row_id: rowId };
}

async function handleSyncFull(
  ctx: SkillContext,
  input: InboxSyncInput,
): Promise<InboxSyncOutput> {
  if (!ctx.env.DB) throw new Error("inbox-sync requires D1.");
  if (input.provider !== "gmail") throw new Error("only gmail supported in v1");
  if (!input.credential_id) throw new Error("credential_id required for sync_full");
  if (!isEncryptionConfigured()) throw new Error("encryption_not_configured");

  await ensureTables(ctx.env);

  const cursorRow = await loadCursor(ctx.env, input.credential_id, ctx.organization_id);
  if (!cursorRow) throw new Error("sync_cursor_not_found");
  if (cursorRow.status !== "active") {
    throw new Error(`sync_cursor_status_${cursorRow.status}`);
  }
  if (!cursorRow.credential_id) throw new Error("no_oauth_credential_linked");

  const cred = await loadCredential(ctx.env, cursorRow.credential_id, ctx.organization_id);
  if (!cred) throw new Error("oauth_credential_not_found");

  const syncStartedAt = nowIso();
  await ctx.env.DB
    .prepare(
      `UPDATE email_sync_cursors
          SET sync_started_at = ?, updated_at = ?, last_error_at = NULL, last_error_reason = NULL
        WHERE id = ?`,
    )
    .bind(syncStartedAt, syncStartedAt, cursorRow.id)
    .run();

  await publish(ctx.env.DB, {
    organization_id: ctx.organization_id,
    event_type: "inbox.sync.started",
    actor_type: ctx.actor_type,
    actor_id: ctx.actor_id,
    resource_type: "email_sync_cursor",
    resource_id: cursorRow.id,
    payload: {
      sync_id: cursorRow.id,
      provider: "gmail",
      account_email: cursorRow.account_email,
    },
  }).catch(() => null);

  let messagesProcessed = 0;
  let contactsCreated = 0;
  let recordsTouched = 0;
  let pageToken: string | null = (input.cursor as string | null) || null;
  let lastPageTokenSeen: string | null = pageToken;

  try {
    const accessToken = await getUsableAccessToken(ctx, cred);

    for (let pageIdx = 0; pageIdx < MAX_PAGES_PER_RUN; pageIdx++) {
      const list = await listMessageIds({
        access_token: accessToken,
        query: GMAIL_LOOKBACK,
        page_token: pageToken,
        max_results: PAGE_SIZE,
      });

      for (const ref of list.messages) {
        // Fetch metadata-only — avoids pulling full bodies until reply/preview lands.
        const msg = await getMessage({
          access_token: accessToken,
          id: ref.id,
          format: "metadata",
          metadata_headers: ["From", "Subject", "Date"],
        }).catch(() => null);
        if (!msg) continue;

        const from = parseFromHeader(headerValue(msg.payload?.headers, "From"));
        const subject = headerValue(msg.payload?.headers, "Subject");
        const internalDateMs = msg.internalDate ? Number(msg.internalDate) : NaN;
        const internalDateIso = Number.isFinite(internalDateMs)
          ? new Date(internalDateMs).toISOString()
          : null;

        let linkedResourceType: string | null = null;
        let linkedResourceId: string | null = null;
        const now = nowIso();

        if (from.email) {
          const contact = await upsertContactByEmail(
            ctx.env,
            ctx.organization_id,
            from.email,
            from.name,
            now,
          );
          linkedResourceType = "contact";
          linkedResourceId = contact.id;
          if (contact.created) {
            contactsCreated += 1;
            await publish(ctx.env.DB, {
              organization_id: ctx.organization_id,
              event_type: "contact.auto_created",
              actor_type: ctx.actor_type,
              actor_id: ctx.actor_id,
              resource_type: "contact",
              resource_id: contact.id,
              payload: {
                contact_id: contact.id,
                source: "inbox",
                sender_email: from.email,
              },
            }).catch(() => null);
          }
        }

        const persist = await persistMessageIfNew(
          ctx.env,
          ctx.organization_id,
          cursorRow.account_email,
          {
            message_id: msg.id,
            thread_id: msg.threadId || ref.threadId || null,
            from_email: from.email,
            from_name: from.name,
            subject,
            snippet: msg.snippet || null,
            internal_date: internalDateIso,
            linked_resource_type: linkedResourceType,
            linked_resource_id: linkedResourceId,
          },
          now,
        );
        if (persist.inserted) {
          messagesProcessed += 1;
          if (linkedResourceType && linkedResourceId) {
            recordsTouched += 1;
            await publish(ctx.env.DB, {
              organization_id: ctx.organization_id,
              event_type: "inbox.message.linked",
              actor_type: ctx.actor_type,
              actor_id: ctx.actor_id,
              resource_type: linkedResourceType,
              resource_id: linkedResourceId,
              payload: {
                message_id: msg.id,
                thread_id: msg.threadId || ref.threadId || msg.id,
                resource_type: linkedResourceType,
                resource_id: linkedResourceId,
              },
            }).catch(() => null);
          }
        }
      }

      lastPageTokenSeen = list.nextPageToken;
      // Persist progress after every page so re-runs resume cleanly.
      await ctx.env.DB
        .prepare(
          `UPDATE email_sync_cursors
              SET cursor = ?,
                  messages_total = messages_total + ?,
                  contacts_created = contacts_created + ?,
                  updated_at = ?
            WHERE id = ?`,
        )
        .bind(
          list.nextPageToken,
          list.messages.length,
          0,                 // counters increment in-memory only this call; the row totals reflect inserts not list size
          nowIso(),
          cursorRow.id,
        )
        .run()
        .catch(() => null);
      pageToken = list.nextPageToken;
      if (!pageToken) break;
    }

    const completedAt = nowIso();
    await ctx.env.DB
      .prepare(
        `UPDATE email_sync_cursors
            SET status = 'active',
                last_success_at = ?,
                contacts_created = contacts_created + ?,
                updated_at = ?
          WHERE id = ?`,
      )
      .bind(completedAt, contactsCreated, completedAt, cursorRow.id)
      .run();

    await publish(ctx.env.DB, {
      organization_id: ctx.organization_id,
      event_type: "inbox.sync.completed",
      actor_type: ctx.actor_type,
      actor_id: ctx.actor_id,
      resource_type: "email_sync_cursor",
      resource_id: cursorRow.id,
      payload: {
        sync_id: cursorRow.id,
        messages_processed: messagesProcessed,
        contacts_created: contactsCreated,
        records_touched: recordsTouched,
      },
    }).catch(() => null);

    return {
      sync_id: cursorRow.id,
      messages_processed: messagesProcessed,
      contacts_created: contactsCreated,
      records_touched: recordsTouched,
      cursor: lastPageTokenSeen,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "sync_failed";
    await ctx.env.DB
      .prepare(
        `UPDATE email_sync_cursors
            SET status = 'errored',
                last_error_at = ?,
                last_error_reason = ?,
                updated_at = ?
          WHERE id = ?`,
      )
      .bind(nowIso(), reason, nowIso(), cursorRow.id)
      .run()
      .catch(() => null);
    await publish(ctx.env.DB, {
      organization_id: ctx.organization_id,
      event_type: "inbox.sync.failed",
      actor_type: ctx.actor_type,
      actor_id: ctx.actor_id,
      resource_type: "email_sync_cursor",
      resource_id: cursorRow.id,
      payload: { sync_id: cursorRow.id, error: reason },
    }).catch(() => null);
    throw error;
  }
}

// ─── Public handler dispatch ────────────────────────────────────────────────

export async function inboxSyncHandler(
  ctx: SkillContext,
  input: InboxSyncInput,
): Promise<InboxSyncOutput> {
  switch (input.operation) {
    case "connect":
      return handleConnect(ctx, input);
    case "sync_full":
      return handleSyncFull(ctx, input);
    case "sync_incremental":
    case "send_reply":
    case "disconnect":
      throw new Error(`not_implemented_in_v1: inbox-sync.${input.operation}`);
    default:
      throw new Error(`unknown_operation: ${String(input.operation)}`);
  }
}

