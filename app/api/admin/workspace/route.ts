import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import {
  readSessionCookie,
  validateSession,
} from "@/lib/server/magic-auth";

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

  // STUB: this route accepts the update payload but does not yet persist it.
  // Wiring to the organizations table lives behind the next Phase 11 ticket.
  return json({
    ok: true,
    accepted: {
      name: body.name?.trim() || null,
      domain: body.domain?.trim() || null,
      plan: body.plan || null,
      defaultDealType: body.defaultDealType || null,
      businessHoursStart: body.businessHoursStart || null,
      businessHoursEnd: body.businessHoursEnd || null,
      timezone: body.timezone || null,
    },
    note: "Stub endpoint — payload received but not persisted yet.",
  });
}
