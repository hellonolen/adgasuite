// GET    /api/custom-objects/[id]  — fetch a single custom object (metadata).
// PATCH  /api/custom-objects/[id]  — update name/fields/visibility. Slug is
//                                    immutable. Removing a field requires
//                                    `confirm: "drop_data"` in the payload.
// DELETE /api/custom-objects/[id]  — archive (never DROP). Records remain
//                                    queryable via ?include_archived=true on
//                                    the list endpoint.
//
// All three paths route through the `custom-object` skill so the bus captures
// custom_object.updated / custom_object.deleted events.

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

const patchSchema = z.object({
  slug: z.string().regex(/^[a-z][a-z0-9_]{1,29}$/),
  name_singular: z.string().min(1).max(40),
  name_plural: z.string().min(1).max(40),
  fields: z.array(fieldSchema).min(1).max(100),
  visibility: z.enum(["private", "team", "workspace"]).default("private"),
  // Destructive-removal consent flag. Without it the route rejects updates
  // that drop any previously-declared field key.
  confirm: z.literal("drop_data").optional(),
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
  if (!id) return errorJson("missing custom object id", 400);

  const result = await callSkill(
    {
      env: auth.context.env,
      organization_id: auth.organizationId,
      actor_type: "user",
      actor_id: auth.actorId,
    },
    "custom-object",
    {
      operation: "get",
      object: blankObjectShape(id),
    },
  );

  if (!result.ok) {
    const isNotFound = result.error?.includes("not_found");
    return errorJson(result.error || "get_failed", isNotFound ? 404 : 502);
  }
  const data = result.data as { object?: unknown; records_count: number | null } | undefined;
  return json({
    ok: true,
    object: data?.object ?? null,
    records_count: data?.records_count ?? 0,
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
  if (!id) return errorJson("missing custom object id", 400);

  const body = await readJson<Record<string, unknown>>(request);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson(parsed.error.issues[0]?.message || "Invalid custom object payload.", 400);
  }

  // Gate destructive field removal at the API boundary. The handler treats
  // updates as metadata-only (v1 blob storage), but the contract requires
  // explicit consent for any key that disappears from the schema.
  if (!parsed.data.confirm) {
    const previous = await fetchExistingFields(auth, id);
    if (previous === null) return errorJson("not_found", 404);
    const incoming = new Set(parsed.data.fields.map((f) => f.key));
    const removed = previous.filter((k) => !incoming.has(k));
    if (removed.length > 0) {
      return errorJson(
        `Removing field(s) [${removed.join(", ")}] requires confirm: "drop_data".`,
        409,
      );
    }
  }

  const result = await callSkill(
    {
      env: auth.context.env,
      organization_id: auth.organizationId,
      actor_type: "user",
      actor_id: auth.actorId,
    },
    "custom-object",
    {
      operation: "update",
      object: {
        id,
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
    const reason = result.error || "update_failed";
    const status = reason.includes("not_found")
      ? 404
      : reason.includes("slug_immutable") || reason.includes("slug_reserved")
        ? 409
        : 502;
    return errorJson(reason, status);
  }
  const data = result.data as { object?: unknown; records_count: number | null } | undefined;
  return json({
    ok: true,
    object: data?.object ?? null,
    records_count: data?.records_count ?? 0,
  });
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
  if (!id) return errorJson("missing custom object id", 400);

  const result = await callSkill(
    {
      env: auth.context.env,
      organization_id: auth.organizationId,
      actor_type: "user",
      actor_id: auth.actorId,
    },
    "custom-object",
    {
      operation: "delete",
      object: blankObjectShape(id),
    },
  );

  if (!result.ok) {
    const isNotFound = result.error?.includes("not_found");
    return errorJson(result.error || "delete_failed", isNotFound ? 404 : 502);
  }
  return json({ ok: true });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Minimal object shape for read/delete paths where the handler only needs the
 * id. The contract requires the full object envelope, so we pass placeholders
 * the handler ignores for these operations.
 */
function blankObjectShape(id: string) {
  return {
    id,
    slug: "placeholder",
    name_singular: "x",
    name_plural: "x",
    fields: [{ key: "x", label: "x", type: "text", required: false, options: null }],
    visibility: "private" as const,
  };
}

async function fetchExistingFields(
  auth: { context: { env: CloudflareEnv }; organizationId: string; actorId: string },
  id: string,
): Promise<string[] | null> {
  const result = await callSkill(
    {
      env: auth.context.env,
      organization_id: auth.organizationId,
      actor_type: "user",
      actor_id: auth.actorId,
    },
    "custom-object",
    {
      operation: "get",
      object: blankObjectShape(id),
    },
  );
  if (!result.ok) return null;
  const data = result.data as { object?: { fields?: Array<{ key: string }> } } | undefined;
  if (!data?.object?.fields) return [];
  return data.object.fields.map((f) => f.key);
}
