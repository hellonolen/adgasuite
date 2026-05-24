import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import {
  readSessionCookie,
  validateSession,
} from "@/lib/server/magic-auth";
import { DEFAULT_ORG_ID, organizationIdForSession } from "@/lib/server/tenant";

interface WorkspaceUpdateBody {
  name?: string;
  domain?: string;
  plan?: string;
  defaultDealType?: string;
  businessHoursStart?: string;
  businessHoursEnd?: string;
  timezone?: string;
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));

  const isOwnerSession = sessionUser?.role === "owner";
  const isOwnerBypass =
    context.user.isLocalAdminBypass && context.user.email === "hellonolen@gmail.com";

  if (!isOwnerSession && !isOwnerBypass) {
    return errorJson("Admin access required.", 403);
  }

  const body = await readJson<WorkspaceUpdateBody>(request);
  const organizationId = organizationIdForSession(sessionUser);
  const now = new Date().toISOString();
  const accepted = {
    name: body.name?.trim() || null,
    domain: body.domain?.trim() || null,
    plan: body.plan || null,
    defaultDealType: body.defaultDealType || null,
    businessHoursStart: body.businessHoursStart || null,
    businessHoursEnd: body.businessHoursEnd || null,
    timezone: body.timezone || null,
  };

  if (!context.env.DB) {
    return json({ ok: true, persisted: false, accepted });
  }

  const organization = await context.env.DB
    .prepare("SELECT id, slug FROM organizations WHERE id = ?")
    .bind(organizationId)
    .first<{ id: string; slug: string }>();

  if (!organization) return errorJson("Workspace organization was not found.", 404);

  await context.env.DB
    .prepare(
      `UPDATE organizations
       SET name = COALESCE(?, name),
           plan = COALESCE(?, plan),
           updated_at = ?
       WHERE id = ?`,
    )
    .bind(accepted.name, accepted.plan, now, organizationId)
    .run();

  await context.env.DB
    .prepare(
      `INSERT INTO organization_settings (organization_id, panel, values_json, updated_by, updated_at)
       VALUES (?, 'workspace', ?, ?, ?)
       ON CONFLICT(organization_id, panel) DO UPDATE SET
         values_json = excluded.values_json,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`,
    )
    .bind(
      organizationId,
      JSON.stringify({
        domain: accepted.domain,
        defaultDealType: accepted.defaultDealType,
        businessHoursStart: accepted.businessHoursStart,
        businessHoursEnd: accepted.businessHoursEnd,
        timezone: accepted.timezone,
      }),
      sessionUser?.email || context.user.email,
      now,
    )
    .run();

  return json({
    ok: true,
    persisted: true,
    organization_id: organizationId || DEFAULT_ORG_ID,
    accepted,
  });
}
