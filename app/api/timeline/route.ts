// GET /api/timeline?resource_type=...&resource_id=...&cursor=...&limit=20
//
// Read-only adapter that proxies to the `activity-timeline` skill. Returns the
// chronological event stream for any record surface (contact / lead / deal /
// organization / workspace).
//
// Auth: any authenticated user in the org (timeline is record-scoped — the
// permission boundary is the record, enforced at the skill layer).

import { errorJson, json } from "@/lib/server/http";
import { getRuntimeContext, hydrateUserFromSession, requireUser } from "@/lib/server/runtime";
import { organizationIdForSession, DEFAULT_ORG_ID } from "@/lib/server/tenant";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { callSkill } from "@/lib/agents/skill-registry";
import type {
  ActivityTimelineInput,
  ActivityTimelineOutput,
  TimelineResourceType,
} from "@/lib/agents/handlers/activity-timeline";
import "@/lib/agents/handlers";

export const dynamic = "force-dynamic";

const VALID_RESOURCE_TYPES: ReadonlySet<TimelineResourceType> = new Set([
  "contact",
  "lead",
  "deal",
  "organization",
  "workspace",
]);

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parseLimit(raw: string | null): number {
  if (!raw) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, parsed);
}

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  await hydrateUserFromSession(context, request);
  try {
    requireUser(context);
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }

  const url = new URL(request.url);
  const resourceTypeParam = (url.searchParams.get("resource_type") || "").trim() as TimelineResourceType;
  const resourceId = (url.searchParams.get("resource_id") || "").trim();
  const cursor = url.searchParams.get("cursor");
  const limit = parseLimit(url.searchParams.get("limit"));

  if (!VALID_RESOURCE_TYPES.has(resourceTypeParam)) {
    return errorJson("resource_type must be one of: contact, lead, deal, organization, workspace.", 400);
  }
  if (!resourceId) {
    return errorJson("resource_id is required.", 400);
  }

  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));
  const organizationId = organizationIdForSession(sessionUser, DEFAULT_ORG_ID);

  const input: ActivityTimelineInput = {
    resource_type: resourceTypeParam,
    resource_id: resourceId,
    filters: {
      since: null,
      until: null,
      event_types: null,
      actor_type: null,
      limit,
      cursor: cursor ?? null,
    },
  };

  const result = await callSkill<ActivityTimelineInput, ActivityTimelineOutput>(
    {
      env: context.env,
      organization_id: organizationId,
      actor_type: "user",
      actor_id: sessionUser?.email || context.user.email,
    },
    "activity-timeline",
    input,
  );

  if (!result.ok || !result.data) {
    return errorJson(result.error || "Timeline read failed.", 502);
  }

  return json({
    ok: true,
    items: result.data.items,
    next_cursor: result.data.next_cursor,
  });
}
