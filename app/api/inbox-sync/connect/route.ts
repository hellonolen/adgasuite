// POST /api/inbox-sync/connect
//
// Initiates the Gmail OAuth flow:
//   1. Calls the `inbox-sync` skill with operation="connect"
//   2. Receives an `oauth_url` (stored in the cursor row temporarily)
//   3. Returns it to the client so the browser can redirect
//
// The actual mailbox connection completes in /api/inbox-sync/callback.

import { errorJson, json } from "@/lib/server/http";
import {
  getRuntimeContext,
  hydrateUserFromSession,
  requireAdmin,
} from "@/lib/server/runtime";
import { callSkill } from "@/lib/agents/skill-registry";
import { DEFAULT_ORG_ID, organizationIdForSession } from "@/lib/server/tenant";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import type { InboxSyncInput, InboxSyncOutput } from "@/lib/agents/handlers/inbox-sync";

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  await hydrateUserFromSession(context, request);
  requireAdmin(context);

  const session = await validateSession(context.env.DB, readSessionCookie(request));
  const organizationId = organizationIdForSession(session, DEFAULT_ORG_ID);

  const result = await callSkill<InboxSyncInput, InboxSyncOutput>(
    {
      env: context.env,
      organization_id: organizationId,
      actor_type: "user",
      actor_id: context.user.email,
    },
    "inbox-sync",
    {
      operation: "connect",
      provider: "gmail",
      request_url: request.url,
      user_id: session?.user_id || context.user.email,
      user_email: context.user.email,
    },
  );

  if (!result.ok || !result.data) {
    return errorJson(result.error || "connect_failed", 400);
  }

  return json({
    ok: true,
    sync_id: result.data.sync_id,
    oauth_url: result.data.cursor,
  });
}
