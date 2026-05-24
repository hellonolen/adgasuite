import { errorJson, json, readJson } from "@/lib/server/http";
import { archiveCalendarEvent, createEvent, getCalendarEvent, updateCalendarEvent } from "@/lib/server/repository";
import { getRuntimeContext, requireAdmin } from "@/lib/server/runtime";
import { DEFAULT_ORG_ID } from "@/lib/server/tenant";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = getRuntimeContext(request);
  requireAdmin(context);

  const event = await getCalendarEvent(context.env.DB, id, DEFAULT_ORG_ID);
  if (!event) return errorJson("Calendar event not found.", 404);
  return json({ ok: true, event });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = getRuntimeContext(request);
  requireAdmin(context);
  const body = await readJson<Record<string, unknown>>(request);

  const event = await updateCalendarEvent(context.env.DB, id, {
    title: typeof body.title === "string" ? body.title : undefined,
    starts_at: typeof body.starts_at === "string" ? body.starts_at : undefined,
    ends_at: typeof body.ends_at === "string" ? body.ends_at : undefined,
    timezone: typeof body.timezone === "string" ? body.timezone : undefined,
    location: typeof body.location === "string" || body.location === null ? body.location : undefined,
    meeting_url: typeof body.meeting_url === "string" || body.meeting_url === null ? body.meeting_url : undefined,
    status: typeof body.status === "string" ? body.status as never : undefined,
    event_type: typeof body.event_type === "string" ? body.event_type as never : undefined,
    deal_id: typeof body.deal_id === "string" || body.deal_id === null ? body.deal_id : undefined,
    contact_id: typeof body.contact_id === "string" || body.contact_id === null ? body.contact_id : undefined,
    attendees: Array.isArray(body.attendees) ? body.attendees as never : undefined,
    notes: typeof body.notes === "string" || body.notes === null ? body.notes : undefined,
  }, DEFAULT_ORG_ID);

  if (!event) return errorJson("Calendar event not found.", 404);

  await createEvent(context.env.DB, {
    organization_id: event.organization_id,
    event_type: "calendar_event.updated",
    actor_type: "user",
    actor_id: context.user.email,
    resource_type: "calendar_event",
    resource_id: event.id,
    payload: { calendar_event_id: event.id, fields: Object.keys(body) },
  });

  return json({ ok: true, event });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = getRuntimeContext(request);
  requireAdmin(context);

  const event = await archiveCalendarEvent(context.env.DB, id, DEFAULT_ORG_ID);
  if (!event) return errorJson("Calendar event not found.", 404);

  await createEvent(context.env.DB, {
    organization_id: event.organization_id,
    event_type: "calendar_event.archived",
    actor_type: "user",
    actor_id: context.user.email,
    resource_type: "calendar_event",
    resource_id: event.id,
    payload: { calendar_event_id: event.id, title: event.title },
  });

  return json({ ok: true, event, archived: true });
}
