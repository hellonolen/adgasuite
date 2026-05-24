import { errorJson, json, readJson } from "@/lib/server/http";
import { createEvent, getVoiceCall, updateVoiceCall } from "@/lib/server/repository";
import { readStoredJsonPayload, storeJsonPayload } from "@/lib/server/payload-storage";
import { getRuntimeContext, requireUser } from "@/lib/server/runtime";
import { DEFAULT_ORG_ID } from "@/lib/server/tenant";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = getRuntimeContext(request);
  requireUser(context);
  const body = await readJson<{ transcript_text?: string; summary?: string; transcript?: Record<string, unknown>; agentic_outputs?: Record<string, unknown> }>(request);

  if (!body.transcript_text && !body.transcript && !body.summary) {
    return errorJson("transcript_text, transcript, or summary is required.");
  }

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
    transcript_text: body.transcript_text,
    summary: body.summary,
    transcript: body.transcript || { enabled: true, status: "stored" },
    agentic_outputs: body.agentic_outputs,
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
    transcript_text: null,
    summary: null,
    transcript: { enabled: true, status: "stored", r2Key: stored?.r2_key || existing.payload_r2_key },
    agentic_outputs: body.agentic_outputs ? { stored: "r2_payload" } : undefined,
    payload_r2_key: stored?.r2_key || existing.payload_r2_key,
    storage_object_id: stored?.storage_object_id || existing.storage_object_id,
  }, DEFAULT_ORG_ID);
  if (!call) return errorJson("Voice call not found.", 404);

  await createEvent(context.env.DB, {
    organization_id: call.organization_id,
    event_type: "voice_call.transcript_updated",
    actor_type: "user",
    actor_id: context.user.email,
    resource_type: "voice_call",
    resource_id: call.id,
    payload: { voice_call_id: call.id, has_transcript_text: Boolean(body.transcript_text), has_summary: Boolean(body.summary), payload_r2_key: stored?.r2_key || call.payload_r2_key, storage_object_id: stored?.storage_object_id || call.storage_object_id },
  });

  return json({ ok: true, call: { ...call, ...nextPayload, payload_r2_key: stored?.r2_key || call.payload_r2_key, storage_object_id: stored?.storage_object_id || call.storage_object_id } });
}

export const PATCH = POST;
