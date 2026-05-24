import { errorJson, json } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { getSuiteState } from "@/lib/server/repository";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { organizationIdForSession } from "@/lib/server/tenant";

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));

  if (!sessionUser && !context.user.isLocalAdminBypass) {
    return errorJson("Authentication required.", 401);
  }

  const state = await getSuiteState(context.env.DB, organizationIdForSession(sessionUser));

  return json({
    ok: true,
    user: sessionUser
      ? { email: sessionUser.email, role: sessionUser.role }
      : context.user,
    ...state,
  });
}
