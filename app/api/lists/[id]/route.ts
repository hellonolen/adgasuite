// GET    /api/lists/[id]  — fetch a single list (the list contract, not the rows).
// PATCH  /api/lists/[id]  — update a list's name / filters / sort / visibility.
// DELETE /api/lists/[id]  — delete the list. Rows are never affected.
//
// All three paths route through the `list-segment` skill so the bus captures
// list.updated / list.deleted events.

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

const patchSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(280).optional().nullable(),
  target_type: z.enum(["contacts", "leads", "deals", "organizations"]),
  filters: z.array(filterSchema).default([]),
  sort: z.array(sortSchema).optional().nullable(),
  visibility: z.enum(["private", "team", "workspace"]).default("private"),
  pinned: z.boolean().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

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

export async function GET(request: Request, ctx: RouteContext) {
  let auth;
  try {
    auth = await resolveAuth(request);
  } catch (response) {
    if (response instanceof Response) return response;
    return errorJson("Unauthorized", 401);
  }
  const { id } = await ctx.params;
  if (!id) return errorJson("missing list id", 400);
  if (!auth.context.env.DB) return errorJson("d1_unavailable", 503);

  const row = await auth.context.env.DB
    .prepare(
      `SELECT id, organization_id, name, description, target_type,
              filters_json, sort_json, visibility, pinned,
              cohort_tracking_json, created_by, created_at, updated_at
         FROM lists
        WHERE id = ? AND organization_id = ?
        LIMIT 1`,
    )
    .bind(id, auth.organizationId)
    .first<Record<string, unknown>>()
    .catch(() => null);
  if (!row) return errorJson("not_found", 404);

  return json({
    ok: true,
    list: {
      ...row,
      filters: safeParseJson(String(row.filters_json ?? "[]"), []),
      sort: row.sort_json ? safeParseJson(String(row.sort_json), null) : null,
      pinned: Boolean(row.pinned),
    },
  });
}

export async function PATCH(request: Request, ctx: RouteContext) {
  let auth;
  try {
    auth = await resolveAuth(request);
  } catch (response) {
    if (response instanceof Response) return response;
    return errorJson("Unauthorized", 401);
  }
  const { id } = await ctx.params;
  if (!id) return errorJson("missing list id", 400);

  const body = await readJson<Record<string, unknown>>(request);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson(parsed.error.issues[0]?.message || "Invalid list payload.", 400);
  }

  const result = await callSkill(
    {
      env: auth.context.env,
      organization_id: auth.organizationId,
      actor_type: "user",
      actor_id: auth.actorId,
    },
    "list-segment",
    {
      operation: "update",
      list: {
        id,
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

  if (!result.ok) {
    const isNotFound = result.error?.includes("not_found");
    return errorJson(result.error || "update_failed", isNotFound ? 404 : 502);
  }
  const data = result.data as { list?: unknown } | undefined;
  return json({ ok: true, list: data?.list ?? null });
}

export async function DELETE(request: Request, ctx: RouteContext) {
  let auth;
  try {
    auth = await resolveAuth(request);
  } catch (response) {
    if (response instanceof Response) return response;
    return errorJson("Unauthorized", 401);
  }
  const { id } = await ctx.params;
  if (!id) return errorJson("missing list id", 400);

  const result = await callSkill(
    {
      env: auth.context.env,
      organization_id: auth.organizationId,
      actor_type: "user",
      actor_id: auth.actorId,
    },
    "list-segment",
    {
      operation: "delete",
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
    return errorJson(result.error || "delete_failed", isNotFound ? 404 : 502);
  }
  return json({ ok: true });
}

function safeParseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
