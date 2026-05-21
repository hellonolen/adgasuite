import { errorJson, json, readJson } from "@/lib/server/http";
import { createEvent } from "@/lib/server/repository";
import { getRuntimeContext, requireUser } from "@/lib/server/runtime";
import { newId, nowIso } from "@/lib/server/id";

type CommunicationBody = {
  deal_id?: string;
  resource_type?: string;
  resource_id?: string;
  audience?: "internal" | "client" | "counterparty" | "general";
  channel?: "note" | "sms" | "email" | "voice" | "call" | "meeting";
  body?: string;
  title?: string;
  visibility?: "internal" | "client_visible";
  voice_note_id?: string;
  sms_message_id?: string;
  email_event_id?: string;
};

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  requireUser(context);

  const url = new URL(request.url);
  const dealId = url.searchParams.get("deal_id");
  if (!context.env.DB) return json({ ok: true, messages: [] });

  try {
    const query = dealId
      ? `SELECT * FROM communication_messages WHERE organization_id = ? AND resource_type = 'deal' AND resource_id = ? ORDER BY created_at DESC LIMIT 100`
      : `SELECT * FROM communication_messages WHERE organization_id = ? ORDER BY created_at DESC LIMIT 100`;
    const statement = context.env.DB.prepare(query);
    const result = dealId
      ? await statement.bind("org_adga_primary", dealId).all()
      : await statement.bind("org_adga_primary").all();
    return json({ ok: true, messages: result.results || [] });
  } catch {
    return json({ ok: true, messages: [] });
  }
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  requireUser(context);
  const body = await readJson<CommunicationBody>(request);

  const resourceType = body.resource_type || "deal";
  const resourceId = body.resource_id || body.deal_id;
  if (!resourceId) return errorJson("resource_id or deal_id is required.");
  if (!body.body) return errorJson("body is required.");

  const timestamp = nowIso();
  const threadId = newId("thread");
  const messageId = newId("comm");
  const audience = body.audience || "internal";
  const channel = body.channel || "note";
  const visibility = body.visibility || (audience === "client" ? "client_visible" : "internal");

  const message = {
    id: messageId,
    thread_id: threadId,
    organization_id: "org_adga_primary",
    resource_type: resourceType,
    resource_id: resourceId,
    audience,
    channel,
    body: body.body,
    voice_note_id: body.voice_note_id || null,
    sms_message_id: body.sms_message_id || null,
    email_event_id: body.email_event_id || null,
    visibility,
    created_by: context.user.email,
    created_at: timestamp,
  };

  if (context.env.DB) {
    try {
      await context.env.DB.prepare(
        `INSERT INTO communication_threads
          (id, organization_id, resource_type, resource_id, audience, channel, title, latest_status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(threadId, message.organization_id, resourceType, resourceId, audience, channel, body.title || "Communication", "open", context.user.email, timestamp, timestamp)
        .run();

      await context.env.DB.prepare(
        `INSERT INTO communication_messages
          (id, thread_id, organization_id, resource_type, resource_id, audience, channel, body, voice_note_id, sms_message_id, email_event_id, visibility, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          message.id, message.thread_id, message.organization_id, message.resource_type, message.resource_id,
          message.audience, message.channel, message.body, message.voice_note_id, message.sms_message_id,
          message.email_event_id, message.visibility, message.created_by, message.created_at,
        )
        .run();
    } catch {}
  }

  await createEvent(context.env.DB, {
    organization_id: message.organization_id,
    event_type: "communication.message_created",
    actor_type: "user",
    actor_id: context.user.email,
    resource_type: message.resource_type,
    resource_id: message.resource_id,
    payload: { message },
  });

  return json({ ok: true, message });
}
