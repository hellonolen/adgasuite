import { errorJson, json, readJson } from "@/lib/server/http";
import { createEvent, createVoiceCall, listVoiceCalls } from "@/lib/server/repository";
import { getRuntimeContext, requireUser } from "@/lib/server/runtime";
import { DEFAULT_ORG_ID } from "@/lib/server/tenant";

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  requireUser(context);
  const calls = await listVoiceCalls(context.env.DB, DEFAULT_ORG_ID);
  return json({ ok: true, calls });
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  requireUser(context);
  const body = await readJson<Record<string, unknown>>(request);

  if (body.direction === "outbound" && body.status !== "scheduled") {
    return errorJson("Outbound calls can only be scaffolded as scheduled records. No outbound call is placed by this API.");
  }

  const call = await createVoiceCall(context.env.DB, {
    organization_id: DEFAULT_ORG_ID,
    direction: body.direction === "outbound" ? "outbound" : "inbound",
    status: typeof body.status === "string" ? body.status as never : "scheduled",
    started_at: typeof body.started_at === "string" ? body.started_at : null,
    participants: Array.isArray(body.participants) ? body.participants as never : [],
    consent: typeof body.consent === "object" && body.consent ? body.consent as Record<string, unknown> : undefined,
    recording: typeof body.recording === "object" && body.recording ? body.recording as Record<string, unknown> : undefined,
    transcript: typeof body.transcript === "object" && body.transcript ? body.transcript as Record<string, unknown> : undefined,
    related_records: typeof body.related_records === "object" && body.related_records ? body.related_records as Record<string, unknown> : {},
    provider: typeof body.provider === "string" ? body.provider : null,
    provider_call_id: typeof body.provider_call_id === "string" ? body.provider_call_id : null,
    created_by: context.user.email,
  });

  await createEvent(context.env.DB, {
    organization_id: call.organization_id,
    event_type: "voice_call.created",
    actor_type: "user",
    actor_id: context.user.email,
    resource_type: "voice_call",
    resource_id: call.id,
    payload: { voice_call_id: call.id, direction: call.direction, status: call.status },
  });

  return json({ ok: true, call }, { status: 201 });
}
