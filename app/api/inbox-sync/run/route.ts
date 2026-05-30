// POST /api/inbox-sync/run
//
// Body: { credential_id: string }  (the email_sync_cursors.id, returned by /connect)
//
// Runs a full Gmail sync via the inbox-sync skill. Returns the batch summary
// so the UI can render "X messages, Y new contacts" without polling.

import { errorJson, json, readJson } from "@/lib/server/http";
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

  const body = await readJson<{ credential_id?: string }>(request);
  if (!body.credential_id) return errorJson("credential_id required", 400);

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
      operation: "sync_full",
      provider: "gmail",
      credential_id: body.credential_id,
    },
  );

  if (!result.ok || !result.data) {
    return errorJson(result.error || "sync_failed", 400);
  }

  return json({ ok: true, ...result.data });
}
