// POST /api/team/invites/accept — accept a team invite using its token.
// Public endpoint (the recipient does not have a session yet). Validates the
// token, joins the org as the invited role, returns a session cookie that
// signs them in immediately.

import { NextResponse } from "next/server";
import { z } from "zod";
import { errorJson, readJson } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { AUTH_COOKIE_NAME, authCookieOptions } from "@/lib/server/magic-auth";
import { callSkill } from "@/lib/agents/skill-registry";
import "@/lib/agents/handlers";

export const dynamic = "force-dynamic";

const schema = z.object({ token: z.string().min(8) });

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  const body = await readJson<Record<string, unknown>>(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return errorJson("Missing or invalid token.", 400);

  const result = await callSkill(
    {
      env: context.env,
      organization_id: "pending",
      actor_type: "user",
      actor_id: null,
    },
    "team-invite.accept",
    { token: parsed.data.token },
  );

  if (!result.ok || !result.data) {
    return errorJson(result.error || "Could not accept invite.", 400);
  }

  const data = result.data as {
    organization_id: string;
    invitee_email: string;
    session_token: string;
    invite_id: string;
  };

  const response = NextResponse.json({
    ok: true,
    organization_id: data.organization_id,
    email: data.invitee_email,
    redirect: "/suite",
  });
  response.cookies.set(AUTH_COOKIE_NAME, data.session_token, authCookieOptions(request.url));
  return response;
}
