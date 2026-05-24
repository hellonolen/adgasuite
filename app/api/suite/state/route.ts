import { errorJson, json } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { getSuiteState } from "@/lib/server/repository";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { organizationIdForSession } from "@/lib/server/tenant";
import { loadWorkspaceBillingState } from "@/lib/server/billing";

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));

  if (!sessionUser && !context.user.isLocalAdminBypass) {
    return errorJson("Authentication required.", 401);
  }

  const billing = await loadWorkspaceBillingState(context, request);
  if (!billing.accessAllowed) {
    return errorJson("Billing action required.", 402, {
      billing: {
        status: billing.status,
        plan: billing.plan,
        recoveryUrl: "/suite/settings/billing",
      },
    });
  }

  const state = await getSuiteState(context.env.DB, organizationIdForSession(sessionUser));
  const isRealUser = !!sessionUser && !context.user.isLocalAdminBypass;

  return json({
    ok: true,
    mode: isRealUser ? "customer" : "local-demo",
    user: sessionUser
      ? { email: sessionUser.email, role: sessionUser.role }
      : context.user,
    empty_state: isRealUser && state.deals.length === 0 && state.leads.length === 0,
    ...state,
  });
}
