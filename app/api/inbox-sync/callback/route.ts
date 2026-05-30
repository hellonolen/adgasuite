// GET /api/inbox-sync/callback
//
// Google redirects here after the operator approves inbox-sync OAuth:
//   ?code=...&state=<email_sync_cursor.id>&scope=...
//
// We:
//   1. Look up the cursor row by `state` (which equals the cursor id)
//   2. Exchange code → tokens (NEVER log)
//   3. Fetch userinfo to learn the mailbox email
//   4. Persist encrypted tokens to oauth_credentials
//   5. Update cursor row → status="active", account_email=<real>, cursor=null, credential_id=<oauth_credentials.id>
//   6. Redirect operator back to /suite/inbox-sync?connected=1
//
// SECURITY:
//   - No tokens reach logs or chat
//   - On failure we redirect with ?connected=0&error=<opaque_code> (never raw provider response)

import { NextResponse } from "next/server";
import { getRuntimeContext } from "@/lib/server/runtime";
import {
  exchangeCode,
  fetchUserinfoEmail,
  inboxSyncRedirectUri,
} from "@/lib/integrations/google-oauth";
import { encrypt, isEncryptionConfigured } from "@/lib/server/crypto";
import { newId, nowIso } from "@/lib/server/id";

function failureRedirect(request: Request, code: string): NextResponse {
  const target = new URL("/suite/inbox-sync", request.url);
  target.searchParams.set("connected", "0");
  target.searchParams.set("error", code);
  return NextResponse.redirect(target);
}

function successRedirect(request: Request): NextResponse {
  const target = new URL("/suite/inbox-sync", request.url);
  target.searchParams.set("connected", "1");
  return NextResponse.redirect(target);
}

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  if (!context.env.DB) return failureRedirect(request, "db_missing");
  if (!isEncryptionConfigured()) return failureRedirect(request, "encryption_not_configured");
  if (!context.env.GOOGLE_OAUTH_CLIENT_ID || !context.env.GOOGLE_OAUTH_CLIENT_SECRET) {
    return failureRedirect(request, "oauth_not_configured");
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  if (errorParam) return failureRedirect(request, "user_denied");
  if (!code || !state) return failureRedirect(request, "missing_params");

  // Load the cursor row to discover org + user. The cursor was created by
  // operation="connect" and is the only authoritative tie between this
  // callback and the operator who initiated it.
  const cursor = await context.env.DB
    .prepare(
      `SELECT id, organization_id, user_id, status
         FROM email_sync_cursors
        WHERE id = ?
        LIMIT 1`,
    )
    .bind(state)
    .first<{ id: string; organization_id: string; user_id: string; status: string }>()
    .catch(() => null);

  if (!cursor) return failureRedirect(request, "cursor_not_found");
  if (cursor.status !== "connecting") return failureRedirect(request, `cursor_status_${cursor.status}`);

  let tokens;
  try {
    tokens = await exchangeCode(context.env, {
      code,
      redirect_uri: inboxSyncRedirectUri(context.env, request.url),
    });
  } catch {
    await context.env.DB
      .prepare(
        `UPDATE email_sync_cursors
            SET status = 'errored', last_error_at = ?, last_error_reason = 'oauth_exchange_failed', updated_at = ?
          WHERE id = ?`,
      )
      .bind(nowIso(), nowIso(), cursor.id)
      .run()
      .catch(() => null);
    return failureRedirect(request, "oauth_exchange_failed");
  }

  const accountEmail = (await fetchUserinfoEmail(tokens.access_token)) || null;
  if (!accountEmail) {
    return failureRedirect(request, "userinfo_failed");
  }

  const credentialId = newId("oac");
  const expiresAt = new Date(Date.now() + (tokens.expires_in - 60) * 1000).toISOString();
  const accessEncrypted = await encrypt(tokens.access_token);
  const refreshEncrypted = tokens.refresh_token ? await encrypt(tokens.refresh_token) : null;
  const now = nowIso();

  await context.env.DB
    .prepare(
      `INSERT INTO oauth_credentials
         (id, organization_id, user_id, provider, account_email,
          access_token_encrypted, refresh_token_encrypted, expires_at, scope,
          created_at, updated_at)
       VALUES (?, ?, ?, 'gmail', ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      credentialId,
      cursor.organization_id,
      cursor.user_id,
      accountEmail,
      accessEncrypted,
      refreshEncrypted,
      expiresAt,
      tokens.scope || null,
      now,
      now,
    )
    .run();

  await context.env.DB
    .prepare(
      `UPDATE email_sync_cursors
          SET status = 'active',
              account_email = ?,
              credential_id = ?,
              cursor = NULL,
              last_error_at = NULL,
              last_error_reason = NULL,
              updated_at = ?
        WHERE id = ?`,
    )
    .bind(accountEmail, credentialId, now, cursor.id)
    .run();

  return successRedirect(request);
}
