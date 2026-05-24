import { errorJson, json } from "@/lib/server/http";
import { createEvent } from "@/lib/server/repository";
import { getRuntimeContext, requireUser } from "@/lib/server/runtime";
import { newId, nowIso } from "@/lib/server/id";
import { readJsonPayload, storeJsonPayload } from "@/lib/server/payload-storage";

const STT_MODEL = "@cf/openai/whisper";

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  requireUser(context);
  if (!context.env.DB) return json({ ok: true, voice_notes: [] });

  try {
	    const result = await context.env.DB.prepare(
	      "SELECT * FROM voice_notes WHERE organization_id = ? ORDER BY created_at DESC LIMIT 100",
	    ).bind("org_adga_primary").all();
	    const voiceNotes = await Promise.all((result.results || []).map(async (row: Record<string, unknown>) => {
	      const payload = await readJsonPayload<Record<string, unknown>>(context.env, String(row.payload_r2_key || ""));
	      return payload ? { ...row, ...payload, id: row.id, organization_id: row.organization_id } : row;
	    }));
	    return json({ ok: true, voice_notes: voiceNotes });
  } catch {
    return json({ ok: true, voice_notes: [] });
  }
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  requireUser(context);

  const form = await request.formData();
  const file = form.get("audio");
  const liveTranscript = String(form.get("transcript_text") || "").trim();
  const isLiveTranscript = !(file instanceof File) && liveTranscript.length > 0;
  if (!(file instanceof File) && !isLiveTranscript) return errorJson("audio file or live transcript is required.");

  const timestamp = nowIso();
  const id = newId("voice");
  const bucket = context.env.UPLOADS_BUCKET || context.env.DOCUMENTS_BUCKET;
  const bytes = file instanceof File ? await file.arrayBuffer() : null;
  const r2Key = file instanceof File ? `voice-notes/${id}/${file.name || "audio.webm"}` : null;

  if (bucket && file instanceof File && bytes && r2Key) {
    await bucket.put(r2Key, bytes, {
      httpMetadata: { contentType: file.type || "audio/webm" },
    });
  }

  let transcriptText: string | null = null;
  let transcriptVtt: string | null = null;
  let wordCount: number | null = null;
  let transcriptionStatus = "stored";

  if (isLiveTranscript) {
    transcriptText = liveTranscript;
    wordCount = liveTranscript.split(/\s+/).filter(Boolean).length;
    transcriptionStatus = "completed_live";
  } else if (context.env.AI && bytes) {
    try {
      const output = await context.env.AI.run(STT_MODEL, {
        audio: [...new Uint8Array(bytes)],
      }) as { text?: string; vtt?: string; word_count?: number };
      transcriptText = output.text || null;
      transcriptVtt = output.vtt || null;
      wordCount = output.word_count || (transcriptText ? transcriptText.split(/\s+/).filter(Boolean).length : null);
      transcriptionStatus = transcriptText ? "completed" : "completed_empty";
    } catch (error) {
      transcriptionStatus = "failed";
    }
  } else {
    transcriptionStatus = "stored_no_ai_binding";
  }

	  const voiceNote = {
    id,
    organization_id: "org_adga_primary",
    owner_user_id: context.user.email,
    title: String(form.get("title") || (file instanceof File ? file.name : "") || "Voice note"),
    resource_type: form.get("resource_type") ? String(form.get("resource_type")) : null,
    resource_id: form.get("resource_id") ? String(form.get("resource_id")) : null,
    r2_key: bucket ? r2Key : null,
    file_name: file instanceof File ? (file.name || "audio.webm") : "live-speech-to-text",
    mime_type: file instanceof File ? (file.type || "audio/webm") : "text/plain",
    size_bytes: file instanceof File ? file.size : liveTranscript.length,
    transcription_status: transcriptionStatus,
    transcript_text: transcriptText,
    transcript_vtt: transcriptVtt,
    word_count: wordCount,
    stt_model: STT_MODEL,
    created_at: timestamp,
	    updated_at: timestamp,
	  };
	  const stored = context.env.DB
	    ? await storeJsonPayload({
	        env: context.env,
	        db: context.env.DB,
	        organization_id: voiceNote.organization_id,
	        resource_type: "voice_note",
	        resource_id: voiceNote.id,
	        payload: voiceNote,
	        created_by: context.user.email,
	      })
	    : null;

	  if (context.env.DB) try {
	    await context.env.DB.prepare(
	      `INSERT INTO voice_notes
	        (id, organization_id, owner_user_id, title, resource_type, resource_id, r2_key, file_name, mime_type, size_bytes,
	         transcription_status, transcript_text, transcript_vtt, word_count, stt_model, payload_r2_key, storage_object_id, created_at, updated_at)
	       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	    )
	      .bind(
	        voiceNote.id, voiceNote.organization_id, voiceNote.owner_user_id, voiceNote.title, voiceNote.resource_type,
	        voiceNote.resource_id, voiceNote.r2_key, voiceNote.file_name, voiceNote.mime_type, voiceNote.size_bytes,
	        voiceNote.transcription_status, null, null, voiceNote.word_count,
	        voiceNote.stt_model, stored?.r2_key || null, stored?.storage_object_id || null, voiceNote.created_at, voiceNote.updated_at,
	      )
      .run();
  } catch {}

  await createEvent(context.env.DB, {
    organization_id: voiceNote.organization_id,
    event_type: "voice_note.created",
    actor_type: "user",
	    actor_id: context.user.email,
	    resource_type: "voice_note",
	    resource_id: voiceNote.id,
	    payload: { voice_note_id: voiceNote.id, payload_r2_key: stored?.r2_key || null, storage_object_id: stored?.storage_object_id || null },
	  });

  return json({ ok: true, voice_note: voiceNote });
}
