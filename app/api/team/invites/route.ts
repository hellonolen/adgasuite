// POST /api/team/invites — create + send a team invite.
// Auth: owner/admin only. Routes through the `team-invite` skill.

import { z } from "zod";
import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext, hydrateUserFromSession, requireAdmin } from "@/lib/server/runtime";
import { organizationIdForSession, DEFAULT_ORG_ID } from "@/lib/server/tenant";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { callSkill } from "@/lib/agents/skill-registry";
import "@/lib/agents/handlers";

export const dynamic = "force-dynamic";

const sendSchema = z.object({
  invitee_email: z.string().email("Enter a valid email."),
  invitee_role: z.enum(["admin", "member"]).default("member"),
  message: z.string().max(500).optional().nullable(),
});

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  await hydrateUserFromSession(context, request);
  requireAdmin(context);
  if (!context.env.DB) return json({ ok: true, invites: [] });

  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));
  const organizationId = organizationIdForSession(sessionUser, DEFAULT_ORG_ID);

  const result = await context.env.DB
    .prepare(
      `SELECT id, invitee_email, invitee_role, status, expires_at, accepted_at, created_at
         FROM team_invites
        WHERE organization_id = ?
          AND COALESCE(archived_at,'') = ''
        ORDER BY created_at DESC
        LIMIT 100`,
    )
    .bind(organizationId)
    .all()
    .catch(() => ({ results: [] }));

  return json({ ok: true, invites: result.results || [] });
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  await hydrateUserFromSession(context, request);
  requireAdmin(context);

  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));
  if (!sessionUser) return errorJson("Authentication required.", 401);

  const body = await readJson<Record<string, unknown>>(request);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) return errorJson(parsed.error.issues[0]?.message || "Invalid invite payload.", 400);

  const organizationId = organizationIdForSession(sessionUser, DEFAULT_ORG_ID);

  const result = await callSkill(
    {
      env: context.env,
      organization_id: organizationId,
      actor_type: "user",
      actor_id: sessionUser.email,
    },
    "team-invite",
    {
      organization_id: organizationId,
      inviter_user_id: sessionUser.user_id,
      inviter_email: sessionUser.email,
      invitee_email: parsed.data.invitee_email,
      invitee_role: parsed.data.invitee_role,
      message: parsed.data.message || null,
    },
  );

  if (!result.ok) return errorJson(result.error || "Invite failed.", 502);
  return json({ ok: true, invite: result.data });
}
