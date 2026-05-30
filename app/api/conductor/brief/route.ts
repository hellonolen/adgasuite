// GET /api/conductor/brief
// Returns the Conductor's daily brief for the authenticated operator.
// Page surfaces (e.g. /suite home) call this to render the brief items.
// Backed by the `daily-brief` skill — cached in D1 daily_briefs table.

import { errorJson, json } from "@/lib/server/http";
import { getRuntimeContext, hydrateUserFromSession, requireUser } from "@/lib/server/runtime";
import { organizationIdForSession, DEFAULT_ORG_ID } from "@/lib/server/tenant";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { callSkill } from "@/lib/agents/skill-registry";
import "@/lib/agents/handlers"; // side-effect: registers handlers

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  await hydrateUserFromSession(context, request);
  requireUser(context);

  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));
  const organizationId = organizationIdForSession(sessionUser, DEFAULT_ORG_ID);
  const userEmail = sessionUser?.email || context.user.email || "";

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";

  const result = await callSkill(
    {
      env: context.env,
      organization_id: organizationId,
      actor_type: "user",
      actor_id: userEmail,
    },
    "daily-brief",
    { organization_id: organizationId, user_email: userEmail, force_recompose: force },
  );

  if (!result.ok) return errorJson(result.error || "Brief composition failed.", 500);
  return json({ ok: true, brief: result.data });
}

export async function POST(request: Request) {
  // POST = explicit recompose (operator clicked "refresh")
  const recompose = new URL(request.url);
  recompose.searchParams.set("force", "1");
  return GET(new Request(recompose.toString(), { headers: request.headers }));
}
