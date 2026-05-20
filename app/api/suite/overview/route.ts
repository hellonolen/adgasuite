import { NextResponse } from "next/server";
import { deals, documents, leads, tasks } from "@/lib/data/seed";
import { agentModules, businessEvents } from "@/lib/agents/rules";
import { getRuntimeContext } from "@/lib/server/runtime";
import { listCalendarEvents } from "@/lib/server/repository";

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  const calendar = await listCalendarEvents(context.env.DB);
  return NextResponse.json({
    leads: leads.length,
    pipeline_cents: deals.reduce((sum, deal) => sum + deal.value * 100, 0),
    documents: documents.length,
    calendar_events: calendar.length,
    open_tasks: tasks.filter((task) => task.status !== "completed").length,
    agent_modules: agentModules,
    event_types: businessEvents,
  });
}
