// PATCH  /api/record-comments/[id]  — edit body. Re-resolves @mentions.
// DELETE /api/record-comments/[id]  — soft-delete. Body stays in DB for audit.
// POST   /api/record-comments/[id]  — add or remove an emoji reaction.
//
// All three paths route through the `record-comment` skill so the bus captures
// record.comment.updated / .deleted / .reacted events. Tenant isolation is
// enforced by the handler — every read/write filters on organization_id.

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

const patchSchema = z.object({
  body: z.string().min(1).max(4000),
  resource_type: resourceTypeSchema,
  resource_id: z.string().min(1),
});

const reactSchema = z.object({
  emoji: z.string().min(1).max(12),
  action: z.enum(["add", "remove"]),
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

function mapErrorStatus(error: string | undefined): number {
  const message = error || "";
  if (message.includes("not_found")) return 404;
  if (
    message.includes("too_long") ||
    message.includes("required") ||
    message.includes("invalid") ||
    message.includes("mismatch") ||
    message.includes("unknown") ||
    message.includes("deleted")
  ) {
    return 400;
  }
  return 502;
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
  if (!id) return errorJson("missing comment id", 400);

  const body = await readJson<Record<string, unknown>>(request);
  const parsed = patchSchema.safeParse(body);
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
      operation: "update",
      comment: {
        id,
        resource_type: parsed.data.resource_type,
        resource_id: parsed.data.resource_id,
        parent_comment_id: null,
        body: parsed.data.body,
        mentions: [],
      },
    },
  );

  if (!result.ok) return errorJson(result.error || "update_failed", mapErrorStatus(result.error));
  const data = result.data as { comment_id: string; comments?: unknown[] } | undefined;
  return json({ ok: true, comment: data?.comments?.[0] ?? null });
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
  if (!id) return errorJson("missing comment id", 400);

  const result = await callSkill(
    {
      env: auth.context.env,
      organization_id: auth.organizationId,
      actor_type: "user",
      actor_id: auth.actorId,
    },
    "record-comment",
    {
      operation: "delete",
      comment: {
        id,
        // resource_type / resource_id not strictly used in delete path —
        // handler loads the row by id within the org and ignores these.
        // Schemas still require them so we pass safe placeholders.
        resource_type: "contact",
        resource_id: "",
        parent_comment_id: null,
        body: "",
        mentions: [],
      },
    },
  );

  if (!result.ok) return errorJson(result.error || "delete_failed", mapErrorStatus(result.error));
  return json({ ok: true });
}

export async function POST(request: Request, ctx: RouteContext) {
  let auth;
  try {
    auth = await resolveAuth(request);
  } catch (response) {
    if (response instanceof Response) return response;
    return errorJson("Unauthorized", 401);
  }
  const { id } = await ctx.params;
  if (!id) return errorJson("missing comment id", 400);

  const body = await readJson<Record<string, unknown>>(request);
  const parsed = reactSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson(parsed.error.issues[0]?.message || "Invalid reaction payload.", 400);
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
      operation: "react",
      reaction: {
        comment_id: id,
        emoji: parsed.data.emoji,
        action: parsed.data.action,
      },
    },
  );

  if (!result.ok) return errorJson(result.error || "react_failed", mapErrorStatus(result.error));
  const data = result.data as { comment_id: string; comments?: unknown[] } | undefined;
  return json({ ok: true, comment: data?.comments?.[0] ?? null });
}
