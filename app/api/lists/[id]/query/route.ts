// POST /api/lists/[id]/query — resolve the saved list's filters and return
// up to RESULT_LIMIT rows. Always live — there is no materialized cache.
// Emits list.queried with matched_count + duration_ms for the Intelligence
// agent's slow-query detector.

import { errorJson, json } from "@/lib/server/http";
import { getRuntimeContext, hydrateUserFromSession, requireUser } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { DEFAULT_ORG_ID, organizationIdForSession } from "@/lib/server/tenant";
import { callSkill } from "@/lib/agents/skill-registry";
import "@/lib/agents/handlers";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, ctx: RouteContext) {
  const context = getRuntimeContext(request);
  await hydrateUserFromSession(context, request);
  try {
    requireUser(context);
  } catch (response) {
    if (response instanceof Response) return response;
    return errorJson("Unauthorized", 401);
  }

  const { id } = await ctx.params;
  if (!id) return errorJson("missing list id", 400);

  const session = await validateSession(context.env.DB, readSessionCookie(request));
  const organizationId = organizationIdForSession(session, DEFAULT_ORG_ID);

  const result = await callSkill(
    {
      env: context.env,
      organization_id: organizationId,
      actor_type: "user",
      actor_id: context.user.email || session?.user_id || "unknown",
    },
    "list-segment",
    {
      operation: "query",
      list: {
        id,
        name: "",
        target_type: "contacts",
        filters: [],
        sort: null,
        visibility: "private",
      },
    },
  );

  if (!result.ok) {
    const isNotFound = result.error?.includes("not_found");
    return errorJson(result.error || "query_failed", isNotFound ? 404 : 502);
  }
  const data = result.data as { rows: unknown[]; matched_count: number | null } | undefined;
  return json({
    ok: true,
    rows: data?.rows || [],
    matched_count: data?.matched_count ?? 0,
  });
}
