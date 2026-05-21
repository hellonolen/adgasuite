import { errorJson, json } from "@/lib/server/http";
import { createEvent } from "@/lib/server/repository";
import { getRuntimeContext, requireUser } from "@/lib/server/runtime";
import { newId, nowIso } from "@/lib/server/id";

const STT_MODEL = "@cf/openai/whisper";

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  requireUser(context);
  if (!context.env.DB) return json({ ok: true, voice_notes: [] });

  try {
    const result = await context.env.DB.prepare(
      "SELECT * FROM voice_notes WHERE organization_id = ? ORDER BY created_at DESC LIMIT 100",
    ).bind("org_adga_primary").all();
    return json({ ok: true, voice_notes: result.results || [] });
  } catch {
    return json({ ok: true, voice_notes: [] });
  }
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  requireUser(context);

  const form = await request.formData();
  const file = form.get("audio");
  if (!(file instanceof File)) return errorJson("audio file is required.");

  const timestamp = nowIso();
  const id = newId("voice");
  const bytes = await file.arrayBuffer();
  const bucket = context.env.UPLOADS_BUCKET || context.env.DOCUMENTS_BUCKET;
  const r2Key = `voice-notes/${id}/${file.name || "audio.webm"}`;

  if (bucket) {
    await bucket.put(r2Key, bytes, {
      httpMetadata: { contentType: file.type || "audio/webm" },
    });
  }

  let transcriptText: string | null = null;
  let transcriptVtt: string | null = null;
  let wordCount: number | null = null;
  let transcriptionStatus = "stored";

  if (context.env.AI) {
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
    title: String(form.get("title") || file.name || "Voice note"),
    resource_type: form.get("resource_type") ? String(form.get("resource_type")) : null,
    resource_id: form.get("resource_id") ? String(form.get("resource_id")) : null,
    r2_key: bucket ? r2Key : null,
    file_name: file.name || "audio.webm",
    mime_type: file.type || "audio/webm",
    size_bytes: file.size,
    transcription_status: transcriptionStatus,
    transcript_text: transcriptText,
    transcript_vtt: transcriptVtt,
    word_count: wordCount,
    stt_model: STT_MODEL,
    created_at: timestamp,
    updated_at: timestamp,
  };

  if (context.env.DB) try {
    await context.env.DB.prepare(
      `INSERT INTO voice_notes
        (id, organization_id, owner_user_id, title, resource_type, resource_id, r2_key, file_name, mime_type, size_bytes,
         transcription_status, transcript_text, transcript_vtt, word_count, stt_model, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        voiceNote.id, voiceNote.organization_id, voiceNote.owner_user_id, voiceNote.title, voiceNote.resource_type,
        voiceNote.resource_id, voiceNote.r2_key, voiceNote.file_name, voiceNote.mime_type, voiceNote.size_bytes,
        voiceNote.transcription_status, voiceNote.transcript_text, voiceNote.transcript_vtt, voiceNote.word_count,
        voiceNote.stt_model, voiceNote.created_at, voiceNote.updated_at,
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
    payload: { voice_note: voiceNote },
  });

  return json({ ok: true, voice_note: voiceNote });
}
