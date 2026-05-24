import { errorJson, json, readJson } from "@/lib/server/http";
import { createEvent, updateVoiceCall } from "@/lib/server/repository";
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

  const call = await updateVoiceCall(context.env.DB, id, {
    transcript_text: body.transcript_text,
    summary: body.summary,
    transcript: body.transcript || { enabled: true, status: "stored", r2Key: null },
    agentic_outputs: body.agentic_outputs,
  }, DEFAULT_ORG_ID);
  if (!call) return errorJson("Voice call not found.", 404);

  await createEvent(context.env.DB, {
    organization_id: call.organization_id,
    event_type: "voice_call.transcript_updated",
    actor_type: "user",
    actor_id: context.user.email,
    resource_type: "voice_call",
    resource_id: call.id,
    payload: { voice_call_id: call.id, has_transcript_text: Boolean(call.transcript_text), has_summary: Boolean(call.summary) },
  });

  return json({ ok: true, call });
}

export const PATCH = POST;
