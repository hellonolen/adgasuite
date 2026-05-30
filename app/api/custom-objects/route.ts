// GET  /api/custom-objects   — list custom objects for the caller's workspace.
//                              ?include_archived=true returns archived too.
// POST /api/custom-objects   — create a new custom object (workspace-defined
//                              record type).
//
// Both paths route through the `custom-object` skill so the bus captures the
// full audit trail. Auth uses the standard hydrateUserFromSession +
// requireUser pattern (same shape as /api/lists).

import { z } from "zod";
import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext, hydrateUserFromSession, requireUser } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { DEFAULT_ORG_ID, organizationIdForSession } from "@/lib/server/tenant";
import { callSkill } from "@/lib/agents/skill-registry";
import "@/lib/agents/handlers";

export const dynamic = "force-dynamic";

const FIELD_TYPES = [
  "text", "long_text", "number", "currency",
  "boolean", "select", "multi_select",
  "date", "datetime", "email", "phone",
  "url", "reference", "formula",
] as const;

const fieldSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{0,40}$/),
  label: z.string().min(1).max(60),
  type: z.enum(FIELD_TYPES),
  required: z.boolean(),
  options: z.record(z.string(), z.unknown()).nullable().optional(),
});

const createSchema = z.object({
  slug: z.string().regex(/^[a-z][a-z0-9_]{1,29}$/, "slug must be lowercase 2-30 chars [a-z0-9_]"),
  name_singular: z.string().min(1).max(40),
  name_plural: z.string().min(1).max(40),
  fields: z.array(fieldSchema).min(1).max(100),
  visibility: z.enum(["private", "team", "workspace"]).default("private"),
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
  if (!context.env.DB) return json({ ok: true, objects: [] });

  const url = new URL(request.url);
  const includeArchived = url.searchParams.get("include_archived") === "true";

  const session = await validateSession(context.env.DB, readSessionCookie(request));
  const organizationId = organizationIdForSession(session, DEFAULT_ORG_ID);

  const result = await callSkill(
    {
      env: context.env,
      organization_id: organizationId,
      actor_type: "user",
      actor_id: context.user.email || session?.user_id || "unknown",
    },
    "custom-object",
    { operation: "list", include_archived: includeArchived },
  );

  if (!result.ok) return errorJson(result.error || "list_failed", 502);
  const data = result.data as { object?: { objects?: unknown[] } } | undefined;
  return json({ ok: true, objects: data?.object?.objects || [] });
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
    return errorJson(parsed.error.issues[0]?.message || "Invalid custom object payload.", 400);
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
    "custom-object",
    {
      operation: "create",
      object: {
        id: null,
        slug: parsed.data.slug,
        name_singular: parsed.data.name_singular,
        name_plural: parsed.data.name_plural,
        fields: parsed.data.fields.map((f) => ({
          key: f.key,
          label: f.label,
          type: f.type,
          required: f.required,
          options: f.options ?? null,
        })),
        visibility: parsed.data.visibility,
      },
    },
  );

  if (!result.ok) {
    const reason = result.error || "create_failed";
    const status = reason.includes("slug_in_use") || reason.includes("slug_reserved")
      ? 409
      : reason.includes("object_limit_reached")
        ? 429
        : 502;
    return errorJson(reason, status);
  }
  const data = result.data as { object_id: string; object?: unknown } | undefined;
  return json(
    { ok: true, object_id: data?.object_id, object: data?.object || null },
    { status: 201 },
  );
}
