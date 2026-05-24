import { errorJson, json, readJson } from "@/lib/server/http";
import { createEvent, getVoiceCall, updateVoiceCall } from "@/lib/server/repository";
import { readStoredJsonPayload, storeJsonPayload } from "@/lib/server/payload-storage";
import { getRuntimeContext, requireUser } from "@/lib/server/runtime";
import { DEFAULT_ORG_ID } from "@/lib/server/tenant";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = getRuntimeContext(request);
  requireUser(context);
  const call = await getVoiceCall(context.env.DB, id, DEFAULT_ORG_ID);
  if (!call) return errorJson("Voice call not found.", 404);
  const payload = await readStoredJsonPayload<Record<string, unknown>>(
    context.env,
    context.env.DB,
    call.payload_r2_key,
    call.storage_object_id,
  );
  return json({ ok: true, call: payload ? { ...call, ...payload, id: call.id, organization_id: call.organization_id } : call });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = getRuntimeContext(request);
  requireUser(context);
  const body = await readJson<Record<string, unknown>>(request);

  const existing = await getVoiceCall(context.env.DB, id, DEFAULT_ORG_ID);
  if (!existing) return errorJson("Voice call not found.", 404);
  const existingPayload = await readStoredJsonPayload<Record<string, unknown>>(
    context.env,
    context.env.DB,
    existing.payload_r2_key,
    existing.storage_object_id,
  );
  const nextPayload = {
    ...(existingPayload || existing),
    ...body,
    id,
    organization_id: DEFAULT_ORG_ID,
  };
  const stored = context.env.DB
    ? await storeJsonPayload({
        env: context.env,
        db: context.env.DB,
        organization_id: DEFAULT_ORG_ID,
        resource_type: "voice_call",
        resource_id: id,
        payload: nextPayload,
        created_by: context.user.email,
      })
    : null;

  const call = await updateVoiceCall(context.env.DB, id, {
    status: typeof body.status === "string" ? body.status as never : undefined,
    started_at: typeof body.started_at === "string" || body.started_at === null ? body.started_at : undefined,
    ended_at: typeof body.ended_at === "string" || body.ended_at === null ? body.ended_at : undefined,
    duration_seconds: typeof body.duration_seconds === "number" ? body.duration_seconds : undefined,
    participants: Array.isArray(body.participants) ? [] : undefined,
    consent: typeof body.consent === "object" && body.consent ? { stored: "r2_payload" } : undefined,
    recording: typeof body.recording === "object" && body.recording ? { stored: "r2_payload" } : undefined,
    transcript: typeof body.transcript === "object" && body.transcript ? { stored: "r2_payload", r2Key: stored?.r2_key || existing.payload_r2_key } : undefined,
    transcript_text: typeof body.transcript_text === "string" || body.transcript_text === null ? null : undefined,
    summary: typeof body.summary === "string" || body.summary === null ? null : undefined,
    related_records: typeof body.related_records === "object" && body.related_records ? {} : undefined,
    agentic_outputs: typeof body.agentic_outputs === "object" && body.agentic_outputs ? {} : undefined,
    payload_r2_key: stored?.r2_key || existing.payload_r2_key,
    storage_object_id: stored?.storage_object_id || existing.storage_object_id,
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

  return json({ ok: true, call: { ...call, ...nextPayload, payload_r2_key: stored?.r2_key || call.payload_r2_key, storage_object_id: stored?.storage_object_id || call.storage_object_id } });
}
