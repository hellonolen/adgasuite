import { NextResponse } from "next/server";
import { errorJson } from "@/lib/server/http";
import { agentModules, businessEvents } from "@/lib/agents/rules";
import { getRuntimeContext } from "@/lib/server/runtime";
import { listCalendarEvents } from "@/lib/server/repository";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
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

  const db = context.env.DB;
  const calendar = await listCalendarEvents(db);

  if (!db) {
    return NextResponse.json({
      leads: 0,
      pipeline_cents: 0,
      documents: 0,
      calendar_events: calendar.length,
      open_tasks: 0,
      agent_modules: agentModules,
      event_types: businessEvents,
    });
  }

  const [leadCount, pipelineSum, documentCount, openTaskCount] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS n FROM leads").first<{ n: number }>(),
    db.prepare("SELECT COALESCE(SUM(value_cents), 0) AS n FROM deals").first<{ n: number }>(),
    db.prepare("SELECT COUNT(*) AS n FROM documents").first<{ n: number }>(),
    db.prepare("SELECT COUNT(*) AS n FROM tasks WHERE status != 'completed'").first<{ n: number }>(),
  ]);

  return NextResponse.json({
    leads: Number(leadCount?.n ?? 0),
    pipeline_cents: Number(pipelineSum?.n ?? 0),
    documents: Number(documentCount?.n ?? 0),
    calendar_events: calendar.length,
    open_tasks: Number(openTaskCount?.n ?? 0),
    agent_modules: agentModules,
    event_types: businessEvents,
  });
}
