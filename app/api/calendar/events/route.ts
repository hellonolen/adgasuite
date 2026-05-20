import { errorJson, json, readJson } from "@/lib/server/http";
import { createAgentJob, createCalendarEvent, createEvent, listCalendarEvents } from "@/lib/server/repository";
import { getRuntimeContext, requireAdmin } from "@/lib/server/runtime";

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  requireAdmin(context);
  return json({ ok: true, events: await listCalendarEvents(context.env.DB) });
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  requireAdmin(context);
  const body = await readJson<{
    title?: string;
    starts_at?: string;
    ends_at?: string;
    timezone?: string;
    location?: string;
    meeting_url?: string;
    event_type?: "meeting" | "call" | "deadline" | "reminder" | "internal";
    deal_id?: string;
    contact_id?: string;
    attendees?: Array<{ name?: string; email: string; role?: string }>;
    notes?: string;
  }>(request);

  if (!body.title || !body.starts_at || !body.ends_at) {
    return errorJson("title, starts_at, and ends_at are required.");
  }

  const event = await createCalendarEvent(context.env.DB, {
    title: body.title,
    starts_at: body.starts_at,
    ends_at: body.ends_at,
    timezone: body.timezone,
    location: body.location,
    meeting_url: body.meeting_url,
    event_type: body.event_type || "meeting",
    deal_id: body.deal_id,
    contact_id: body.contact_id,
    attendees: body.attendees || [],
    notes: body.notes,
    created_by: context.user.email,
  });

  await createEvent(context.env.DB, {
    organization_id: event.organization_id,
    event_type: "calendar_event.created",
    actor_type: "user",
    actor_id: context.user.email,
    resource_type: "calendar_event",
    resource_id: event.id,
    payload: { title: event.title, starts_at: event.starts_at, deal_id: event.deal_id },
  });

  await createAgentJob(context.env.DB, {
    agent: "operations",
    job_type: "calendar.follow_up",
    input: {
      calendar_event_id: event.id,
      title: event.title,
      starts_at: event.starts_at,
      deal_id: event.deal_id,
      requested_by: context.user.email,
    },
  });

  return json({ ok: true, event });
}
