import { errorJson, json, readJson } from "@/lib/server/http";
import { createEvent, getVoiceCall, updateVoiceCall } from "@/lib/server/repository";
import { getRuntimeContext, requireUser } from "@/lib/server/runtime";
import { DEFAULT_ORG_ID } from "@/lib/server/tenant";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = getRuntimeContext(request);
  requireUser(context);
  const call = await getVoiceCall(context.env.DB, id, DEFAULT_ORG_ID);
  if (!call) return errorJson("Voice call not found.", 404);
  return json({ ok: true, call });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = getRuntimeContext(request);
  requireUser(context);
  const body = await readJson<Record<string, unknown>>(request);

  const call = await updateVoiceCall(context.env.DB, id, {
    status: typeof body.status === "string" ? body.status as never : undefined,
    started_at: typeof body.started_at === "string" || body.started_at === null ? body.started_at : undefined,
    ended_at: typeof body.ended_at === "string" || body.ended_at === null ? body.ended_at : undefined,
    duration_seconds: typeof body.duration_seconds === "number" ? body.duration_seconds : undefined,
    participants: Array.isArray(body.participants) ? body.participants as never : undefined,
    consent: typeof body.consent === "object" && body.consent ? body.consent as Record<string, unknown> : undefined,
    recording: typeof body.recording === "object" && body.recording ? body.recording as Record<string, unknown> : undefined,
    transcript: typeof body.transcript === "object" && body.transcript ? body.transcript as Record<string, unknown> : undefined,
    transcript_text: typeof body.transcript_text === "string" || body.transcript_text === null ? body.transcript_text : undefined,
    summary: typeof body.summary === "string" || body.summary === null ? body.summary : undefined,
    related_records: typeof body.related_records === "object" && body.related_records ? body.related_records as Record<string, unknown> : undefined,
    agentic_outputs: typeof body.agentic_outputs === "object" && body.agentic_outputs ? body.agentic_outputs as Record<string, unknown> : undefined,
  }, DEFAULT_ORG_ID);

  if (!call) return errorJson("Voice call not found.", 404);

  await createEvent(context.env.DB, {
    organization_id: call.organization_id,
    event_type: "voice_call.updated",
    actor_type: "user",
    actor_id: context.user.email,
    resource_type: "voice_call",
    resource_id: call.id,
    payload: { voice_call_id: call.id, fields: Object.keys(body) },
  });

  return json({ ok: true, call });
}
