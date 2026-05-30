// GET /api/lists   — list all lists for the caller's organization.
// POST /api/lists  — create a new list.
//
// Both paths route through the `list-segment` skill so the bus captures the
// full audit trail. Auth uses the standard hydrateUserFromSession +
// requireUser pattern (no admin-only restriction — every team member can save
// their own list).

import { z } from "zod";
import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext, hydrateUserFromSession, requireUser } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { DEFAULT_ORG_ID, organizationIdForSession } from "@/lib/server/tenant";
import { callSkill } from "@/lib/agents/skill-registry";
import "@/lib/agents/handlers";

export const dynamic = "force-dynamic";

const filterSchema = z.object({
  field: z.string().min(1),
  op: z.enum([
    "eq", "neq", "gt", "gte", "lt", "lte",
    "contains", "starts_with", "in", "between",
    "is_null", "is_not_null",
  ]),
  value: z.unknown(),
});

const sortSchema = z.object({
  field: z.string().min(1),
  direction: z.enum(["asc", "desc"]),
});

const createSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(280).optional().nullable(),
  target_type: z.enum(["contacts", "leads", "deals", "organizations"]),
  filters: z.array(filterSchema).default([]),
  sort: z.array(sortSchema).optional().nullable(),
  visibility: z.enum(["private", "team", "workspace"]).default("private"),
  pinned: z.boolean().optional(),
});

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  await hydrateUserFromSession(context, request);
  try {
    requireUser(context);
  } catch (response) {
    if (response instanceof Response) return response;
    return errorJson("Unauthorized", 401);
  }
  if (!context.env.DB) return json({ ok: true, lists: [] });

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
    { operation: "list_all" },
  );

  if (!result.ok) return errorJson(result.error || "list_failed", 502);
  const data = result.data as { lists?: unknown[] } | undefined;
  return json({ ok: true, lists: data?.lists || [] });
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  await hydrateUserFromSession(context, request);
  try {
    requireUser(context);
  } catch (response) {
    if (response instanceof Response) return response;
    return errorJson("Unauthorized", 401);
  }

  const body = await readJson<Record<string, unknown>>(request);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson(parsed.error.issues[0]?.message || "Invalid list payload.", 400);
  }

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
      operation: "create",
      list: {
        id: null,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        target_type: parsed.data.target_type,
        filters: parsed.data.filters,
        sort: parsed.data.sort ?? null,
        visibility: parsed.data.visibility,
        pinned: parsed.data.pinned ?? false,
      },
    },
  );

  if (!result.ok) return errorJson(result.error || "create_failed", 502);
  const data = result.data as { list_id: string; list?: unknown } | undefined;
  return json({ ok: true, list_id: data?.list_id, list: data?.list || null }, { status: 201 });
}
