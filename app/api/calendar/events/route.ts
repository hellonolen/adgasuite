import { errorJson, json, readJson } from "@/lib/server/http";
import { createAgentJob, createCalendarEvent, createEvent, listCalendarEvents } from "@/lib/server/repository";
import { sendPostmarkEmail } from "@/lib/integrations/postmark";
import { getRuntimeContext, requireAdmin } from "@/lib/server/runtime";
import { newId, nowIso } from "@/lib/server/id";
import { protectedTestRecipientError } from "@/lib/server/email-safety";

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
    send_invites?: boolean;
  }>(request);

  if (!body.title || !body.starts_at || !body.ends_at) {
    return errorJson("title, starts_at, and ends_at are required.");
  }

  const meetingUrl = body.meeting_url || `https://meet.adga.ai/m/${crypto.randomUUID().slice(0, 8)}`;
  const event = await createCalendarEvent(context.env.DB, {
    title: body.title,
    starts_at: body.starts_at,
    ends_at: body.ends_at,
    timezone: body.timezone,
    location: body.location,
    meeting_url: meetingUrl,
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

  const deliveries = body.send_invites === false ? [] : await sendCalendarInvites({
    db: context.env.DB,
    env: context.env,
    event,
    requestedBy: context.user.email,
  });

  return json({ ok: true, event, deliveries });
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function icsDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function buildIcs(event: Awaited<ReturnType<typeof createCalendarEvent>>, requestedBy: string) {
  const attendees = event.attendees.map((attendee) => `ATTENDEE;CN=${escapeIcs(attendee.name || attendee.email)};RSVP=TRUE:mailto:${attendee.email}`).join("\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ADGA Suite//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${event.id}@adga.ai`,
    `DTSTAMP:${icsDate(nowIso())}`,
    `DTSTART:${icsDate(event.starts_at)}`,
    `DTEND:${icsDate(event.ends_at)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(`${event.notes || ""}\n\nMeeting link: ${event.meeting_url || ""}`)}`,
    `LOCATION:${escapeIcs(event.meeting_url || event.location || "ADGA meeting")}`,
    `ORGANIZER;CN=ADGA:mailto:${requestedBy}`,
    attendees,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

async function sendCalendarInvites({
  db,
  env,
  event,
  requestedBy,
}: {
  db?: D1Database;
  env: CloudflareEnv;
  event: Awaited<ReturnType<typeof createCalendarEvent>>;
  requestedBy: string;
}) {
  const timestamp = nowIso();
  const ics = buildIcs(event, requestedBy);
  const deliveries: Array<{
    id: string;
    organization_id: string;
    calendar_event_id: string;
    recipient_email: string;
    recipient_name: string | null;
    channel: string;
    provider: string;
    status: string;
    provider_status: number | null;
    provider_response: string | null;
    sent_at: string | null;
    created_at: string;
    updated_at: string;
  }> = [];

  for (const attendee of event.attendees.filter((item) => item.email)) {
    const protectedRecipient = protectedTestRecipientError(attendee.email);
    if (protectedRecipient) {
      const delivery = {
        id: newId("cal_invite"),
        organization_id: event.organization_id,
        calendar_event_id: event.id,
        recipient_email: attendee.email,
        recipient_name: attendee.name || null,
        channel: "email",
        provider: "postmark",
        status: "blocked",
        provider_status: 403,
        provider_response: protectedRecipient,
        sent_at: null,
        created_at: timestamp,
        updated_at: timestamp,
      };
      deliveries.push(delivery);
      if (db) try {
        await db.prepare(
          `INSERT INTO calendar_invite_deliveries
            (id, organization_id, calendar_event_id, recipient_email, recipient_name, channel, provider, status, provider_status, provider_response, sent_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(delivery.id, delivery.organization_id, delivery.calendar_event_id, delivery.recipient_email, delivery.recipient_name, delivery.channel, delivery.provider, delivery.status, delivery.provider_status, delivery.provider_response, delivery.sent_at, delivery.created_at, delivery.updated_at)
          .run();
      } catch {}
      await createEvent(db, {
        organization_id: event.organization_id,
        event_type: "calendar_invite.blocked",
        actor_type: "system",
        actor_id: "calendar",
        resource_type: "calendar_event",
        resource_id: event.id,
        payload: { delivery },
      });
      continue;
    }

    const result = await sendPostmarkEmail(
      {
        to: attendee.email,
        subject: `Meeting invite: ${event.title}`,
        htmlBody: `
          <p>You have been invited to a meeting from ADGA.</p>
          <p><strong>${event.title}</strong></p>
          <p>Starts: ${new Date(event.starts_at).toLocaleString("en-US", { timeZone: event.timezone })}</p>
          <p>Ends: ${new Date(event.ends_at).toLocaleString("en-US", { timeZone: event.timezone })}</p>
          <p>Meeting link: <a href="${event.meeting_url}">${event.meeting_url}</a></p>
          ${event.notes ? `<p>${event.notes}</p>` : ""}
        `,
        textBody: `You have been invited to ${event.title}.\nStarts: ${event.starts_at}\nEnds: ${event.ends_at}\nMeeting link: ${event.meeting_url}\n${event.notes || ""}`,
        attachments: [
          {
            name: "invite.ics",
            content: Buffer.from(ics).toString("base64"),
            contentType: "text/calendar; method=REQUEST",
          },
        ],
      },
      env,
    );
    const delivery = {
      id: newId("cal_invite"),
      organization_id: event.organization_id,
      calendar_event_id: event.id,
      recipient_email: attendee.email,
      recipient_name: attendee.name || null,
      channel: "email",
      provider: "postmark",
      status: result.ok ? "sent" : result.skipped ? "skipped" : "failed",
      provider_status: result.status || null,
      provider_response: result.reason || result.body || null,
      sent_at: result.ok ? timestamp : null,
      created_at: timestamp,
      updated_at: timestamp,
    };
    deliveries.push(delivery);

    if (db) try {
      await db.prepare(
        `INSERT INTO calendar_invite_deliveries
          (id, organization_id, calendar_event_id, recipient_email, recipient_name, channel, provider, status, provider_status, provider_response, sent_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(delivery.id, delivery.organization_id, delivery.calendar_event_id, delivery.recipient_email, delivery.recipient_name, delivery.channel, delivery.provider, delivery.status, delivery.provider_status, delivery.provider_response, delivery.sent_at, delivery.created_at, delivery.updated_at)
        .run();
    } catch {}

    await createEvent(db, {
      organization_id: event.organization_id,
      event_type: delivery.status === "sent" ? "calendar_invite.sent" : "calendar_invite.not_sent",
      actor_type: "system",
      actor_id: "calendar",
      resource_type: "calendar_event",
      resource_id: event.id,
      payload: { delivery },
    });
  }

  return deliveries;
}
