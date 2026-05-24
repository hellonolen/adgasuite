import { errorJson, json, readJson } from "@/lib/server/http";
import { createEvent, createVoiceCall, listVoiceCalls, updateVoiceCall, type VoiceCall } from "@/lib/server/repository";
import { readStoredJsonPayload, storeJsonPayload } from "@/lib/server/payload-storage";
import { getRuntimeContext, requireUser } from "@/lib/server/runtime";
import { DEFAULT_ORG_ID } from "@/lib/server/tenant";

const VOICE_CALL_STATUSES = new Set<VoiceCall["status"]>(["scheduled", "ringing", "active", "completed", "missed", "failed", "cancelled"]);

function normalizeVoiceCallStatus(value: unknown): VoiceCall["status"] {
  return typeof value === "string" && VOICE_CALL_STATUSES.has(value as VoiceCall["status"])
    ? value as VoiceCall["status"]
    : "scheduled";
}

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  requireUser(context);
  const calls = await listVoiceCalls(context.env.DB, DEFAULT_ORG_ID);
  const hydratedCalls = await Promise.all(calls.map(async (call) => {
    const payload = await readStoredJsonPayload<Record<string, unknown>>(
      context.env,
      context.env.DB,
      call.payload_r2_key,
      call.storage_object_id,
    );
    return payload ? { ...call, ...payload, id: call.id, organization_id: call.organization_id } : call;
  }));
  return json({ ok: true, calls: hydratedCalls });
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  requireUser(context);
  const body = await readJson<Record<string, unknown>>(request);

  if (body.direction === "outbound" && body.status !== "scheduled") {
    return errorJson("Outbound calls can only be scaffolded as scheduled records. No outbound call is placed by this API.");
  }

  const payload = {
    organization_id: DEFAULT_ORG_ID,
    direction: body.direction === "outbound" ? "outbound" as const : "inbound" as const,
    status: normalizeVoiceCallStatus(body.status),
    started_at: typeof body.started_at === "string" ? body.started_at : null,
    participants: Array.isArray(body.participants) ? body.participants as never : [],
    consent: typeof body.consent === "object" && body.consent ? body.consent as Record<string, unknown> : undefined,
    recording: typeof body.recording === "object" && body.recording ? body.recording as Record<string, unknown> : undefined,
    transcript: typeof body.transcript === "object" && body.transcript ? body.transcript as Record<string, unknown> : undefined,
    related_records: typeof body.related_records === "object" && body.related_records ? body.related_records as Record<string, unknown> : {},
    provider: typeof body.provider === "string" ? body.provider : null,
    provider_call_id: typeof body.provider_call_id === "string" ? body.provider_call_id : null,
    created_by: context.user.email,
  };

  const call = await createVoiceCall(context.env.DB, {
    organization_id: DEFAULT_ORG_ID,
    direction: payload.direction,
    status: payload.status,
    started_at: payload.started_at,
    provider: payload.provider,
    provider_call_id: payload.provider_call_id,
    created_by: payload.created_by,
    participants: [],
    consent: { stored: "r2_payload" },
    recording: { stored: "r2_payload" },
    transcript: { stored: "r2_payload" },
    related_records: {},
    agentic_outputs: {},
  });

  const stored = context.env.DB
    ? await storeJsonPayload({
        env: context.env,
        db: context.env.DB,
        organization_id: DEFAULT_ORG_ID,
        resource_type: "voice_call",
        resource_id: call.id,
        payload: { ...payload, id: call.id, created_at: call.created_at, updated_at: call.updated_at },
        created_by: context.user.email,
      })
    : null;
  const storedCall = stored
    ? await createVoiceCallStoragePointer(context.env.DB, call, stored.r2_key, stored.storage_object_id)
    : call;

  await createEvent(context.env.DB, {
    organization_id: storedCall.organization_id,
    event_type: "voice_call.created",
    actor_type: "user",
    actor_id: context.user.email,
    resource_type: "voice_call",
    resource_id: storedCall.id,
    payload: { voice_call_id: storedCall.id, direction: storedCall.direction, status: storedCall.status, payload_r2_key: stored?.r2_key || null, storage_object_id: stored?.storage_object_id || null },
  });

  return json({ ok: true, call: { ...storedCall, ...payload, id: storedCall.id, payload_r2_key: stored?.r2_key || null, storage_object_id: stored?.storage_object_id || null } }, { status: 201 });
}

async function createVoiceCallStoragePointer(
  db: D1Database | undefined,
  call: Awaited<ReturnType<typeof createVoiceCall>>,
  payloadR2Key: string,
  storageObjectId: string | null,
) {
  return (await updateVoiceCall(db, call.id, {
    payload_r2_key: payloadR2Key,
    storage_object_id: storageObjectId,
  }, call.organization_id)) || call;
}
