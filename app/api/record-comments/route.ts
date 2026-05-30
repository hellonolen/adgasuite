// GET  /api/record-comments?resource_type=...&resource_id=...&cursor=...&limit=...
//        — list comments on a resource, chronological ASC, threaded by parent_comment_id.
// POST /api/record-comments
//        — create a new top-level or reply comment. Auto-resolves @email mentions
//          to org members + emits record.comment.mentioned per resolved mention.
//
// Both paths route through the `record-comment` skill so the bus captures the
// full audit trail. Tenant isolation: organization_id resolved from session +
// passed through to the handler, which filters every read/write on it.

import { z } from "zod";
import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext, hydrateUserFromSession, requireUser } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { DEFAULT_ORG_ID, organizationIdForSession } from "@/lib/server/tenant";
import { callSkill } from "@/lib/agents/skill-registry";
import "@/lib/agents/handlers";

export const dynamic = "force-dynamic";

const resourceTypeSchema = z.enum([
  "contact",
  "lead",
  "deal",
  "organization",
  "custom_object",
]);

const createSchema = z.object({
  resource_type: resourceTypeSchema,
  resource_id: z.string().min(1),
  parent_comment_id: z.string().min(1).nullable().optional(),
  body: z.string().min(1).max(4000),
  custom_object_slug: z.string().min(1).nullable().optional(),
});

async function resolveAuth(request: Request) {
  const context = getRuntimeContext(request);
  await hydrateUserFromSession(context, request);
  requireUser(context);
  const session = await validateSession(context.env.DB, readSessionCookie(request));
  const organizationId = organizationIdForSession(session, DEFAULT_ORG_ID);
  return {
    context,
    organizationId,
    actorId: context.user.email || session?.user_id || "unknown",
  };
}

export async function GET(request: Request) {
  let auth;
  try {
    auth = await resolveAuth(request);
  } catch (response) {
    if (response instanceof Response) return response;
    return errorJson("Unauthorized", 401);
  }
  if (!auth.context.env.DB) return json({ ok: true, comments: [], next_cursor: null });

  const url = new URL(request.url);
  const resourceType = url.searchParams.get("resource_type");
  const resourceId = url.searchParams.get("resource_id");
  const cursor = url.searchParams.get("cursor");
  const limitRaw = url.searchParams.get("limit");

  const typeParsed = resourceTypeSchema.safeParse(resourceType);
  if (!typeParsed.success) {
    return errorJson("resource_type is required and must be a valid type.", 400);
  }
  if (!resourceId) {
    return errorJson("resource_id is required.", 400);
  }
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : null;

  const result = await callSkill(
    {
      env: auth.context.env,
      organization_id: auth.organizationId,
      actor_type: "user",
      actor_id: auth.actorId,
    },
    "record-comment",
    {
      operation: "list",
      resource_type: typeParsed.data,
      resource_id: resourceId,
      cursor: cursor ?? null,
      limit: limit && Number.isFinite(limit) ? limit : null,
    },
  );

  if (!result.ok) return errorJson(result.error || "list_failed", 502);
  const data = result.data as { comments?: unknown[]; next_cursor?: string | null } | undefined;
  return json({
    ok: true,
    comments: data?.comments || [],
    next_cursor: data?.next_cursor ?? null,
  });
}

export async function POST(request: Request) {
  let auth;
  try {
    auth = await resolveAuth(request);
  } catch (response) {
    if (response instanceof Response) return response;
    return errorJson("Unauthorized", 401);
  }

  const body = await readJson<Record<string, unknown>>(request);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson(parsed.error.issues[0]?.message || "Invalid comment payload.", 400);
  }

  const result = await callSkill(
    {
      env: auth.context.env,
      organization_id: auth.organizationId,
      actor_type: "user",
      actor_id: auth.actorId,
    },
    "record-comment",
    {
      operation: "create",
      comment: {
        id: null,
        resource_type: parsed.data.resource_type,
        resource_id: parsed.data.resource_id,
        parent_comment_id: parsed.data.parent_comment_id ?? null,
        body: parsed.data.body,
        mentions: [],
        custom_object_slug: parsed.data.custom_object_slug ?? null,
      },
    },
  );

  if (!result.ok) {
    const message = result.error || "create_failed";
    const status = message.includes("not_found")
      ? 404
      : message.includes("too_long") || message.includes("required") || message.includes("invalid") || message.includes("mismatch") || message.includes("unknown")
        ? 400
        : 502;
    return errorJson(message, status);
  }
  const data = result.data as { comment_id: string; comments?: unknown[] } | undefined;
  return json(
    { ok: true, comment_id: data?.comment_id, comment: data?.comments?.[0] ?? null },
    { status: 201 },
  );
}
