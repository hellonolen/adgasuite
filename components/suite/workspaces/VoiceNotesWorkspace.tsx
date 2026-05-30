"use client";

/**
 * VoiceNotesWorkspace — extracted from AdgaSuite.tsx route === "voice-notes".
 * Loads behind the WorkspaceContract declared in app/suite/workspaces.ts.
 * Browser SpeechRecognition for live capture; falls back to file upload that
 * the backend transcribes via Whisper (`@cf/openai/whisper`).
 */

import React from "react";

type VoiceNote = {
  id: string;
  title?: string | null;
  file_name?: string | null;
  resource_type?: string | null;
  resource_id?: string | null;
  word_count?: number | null;
  transcript_text?: string | null;
  transcription_status?: string | null;
  stt_model?: string | null;
};

type VoicePostResult = {
  voice_note?: VoiceNote;
};

function IconMic({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

function Pill({ tone, children }: { tone: "green" | "amber" | "red"; children: React.ReactNode }) {
  return <span className={"pill " + tone}>{children}</span>;
}

function statusTone(status: string | null | undefined): "green" | "amber" | "red" {
  const s = String(status || "");
  if (s.startsWith("completed")) return "green";
  if (s === "failed") return "red";
  return "amber";
}

export default function VoiceNotesWorkspace() {
  const [result, setResult] = React.useState<VoicePostResult | null>(null);
  const [notes, setNotes] = React.useState<VoiceNote[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const [liveTranscript, setLiveTranscript] = React.useState("");
  const [interimTranscript, setInterimTranscript] = React.useState("");
  const [liveError, setLiveError] = React.useState("");
  const recognitionRef = React.useRef<any>(null);
  const listeningRef = React.useRef(false);
  const finalTranscriptRef = React.useRef("");

  React.useEffect(() => {
    fetch("/api/voice-notes")
      .then((r) => r.json())
      .then((data: { voice_notes?: VoiceNote[] }) => {
        if (Array.isArray(data.voice_notes)) setNotes(data.voice_notes);
      })
      .catch(() => {});
  }, []);

  const supportsLiveSpeech = () =>
    typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const startLiveNote = () => {
    setLiveError("");
    if (!supportsLiveSpeech()) {
      setLiveError("Live speech-to-text is not available in this browser. You can still attach audio below.");
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    finalTranscriptRef.current = liveTranscript ? liveTranscript.trim() + " " : "";
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) finalTranscriptRef.current += text.trim() + " ";
        else interim += text;
      }
      setLiveTranscript(finalTranscriptRef.current.trim());
      setInterimTranscript(interim.trim());
    };
    recognition.onerror = () => {
      setLiveError("Speech-to-text stopped. Start again when ready.");
      setListening(false);
      listeningRef.current = false;
    };
    recognition.onend = () => {
      if (listeningRef.current) {
        try { recognition.start(); } catch { /* ignore */ }
      }
    };
    recognitionRef.current = recognition;
    listeningRef.current = true;
    setListening(true);
    recognition.start();
  };

  const stopLiveNote = () => {
    listeningRef.current = false;
    setListening(false);
    setInterimTranscript("");
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
  };

  const saveLiveNote = async () => {
    const transcript = [liveTranscript, interimTranscript].filter(Boolean).join(" ").trim();
    if (!transcript) return;
    setSaving(true);
    try {
      const form = new FormData();
      form.set("title", "Live voice note");
      form.set("transcript_text", transcript);
      form.set("resource_type", "workspace");
      const response = await fetch("/api/voice-notes", { method: "POST", body: form });
      const data = (await response.json()) as VoicePostResult;
      setResult(data);
      if (data.voice_note) setNotes((prev) => [data.voice_note as VoiceNote, ...prev]);
      setLiveTranscript("");
      setInterimTranscript("");
      finalTranscriptRef.current = "";
    } finally {
      setSaving(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    setSaving(true);
    try {
      const response = await fetch("/api/voice-notes", { method: "POST", body: form });
      const data = (await response.json()) as VoicePostResult;
      setResult(data);
      if (data.voice_note) setNotes((prev) => [data.voice_note as VoiceNote, ...prev]);
      formEl.reset();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-h">
        <div>
          <h1>Voice Notes</h1>
          <div className="sub">Speak, upload audio, let AI transcribe, and attach the result to deals, leads, or contacts.</div>
        </div>
      </div>
      <div style={{ padding: "0 32px 28px", display: "grid", gridTemplateColumns: "minmax(0,1fr) 420px", gap: 14, overflow: "auto", flex: 1 }}>
        <div className="card">
          <div className="card-h"><div className="ttl">Live note</div><span className="text-xs muted">{listening ? "Listening now" : "Ready"}</span></div>
          <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="live-transcript">
              {liveTranscript || interimTranscript ? (
                <>
                  <span>{liveTranscript}</span>
                  {interimTranscript && <em>{interimTranscript}</em>}
                </>
              ) : (
                <span className="muted">Click Start and speak. Your words will appear here as you talk.</span>
              )}
            </div>
            <div className="text-xs muted">Live notes save immediately as completed transcripts. Uploaded audio uses Cloudflare AI Whisper when the AI binding is available.</div>
            {liveError && <div className="text-sm" style={{ color: "var(--status-amber)" }}>{liveError}</div>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {!listening && <button className="btn primary" type="button" onClick={startLiveNote}><IconMic /> Start speaking</button>}
              {listening && <button className="btn primary" type="button" onClick={stopLiveNote}>Stop</button>}
              <button className="btn" type="button" onClick={saveLiveNote} disabled={saving || !(liveTranscript || interimTranscript)}>{saving ? "Saving..." : "Save note"}</button>
              <button className="btn ghost" type="button" onClick={() => { setLiveTranscript(""); setInterimTranscript(""); finalTranscriptRef.current = ""; }}>Clear</button>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-h"><div className="ttl">Attach audio</div><span className="text-xs muted">Optional fallback</span></div>
          <form className="card-b" style={{ display: "flex", flexDirection: "column", gap: 12 }} onSubmit={submit}>
            <div className="field"><label>Title</label><input name="title" type="text" placeholder="Follow-up call, meeting recap, field note" /></div>
            <div className="field"><label>Audio</label><input name="audio" type="file" accept="audio/*" required /></div>
            <div className="row2">
              <div className="field"><label>Record type</label><input name="resource_type" type="text" placeholder="lead, deal, contact" /></div>
              <div className="field"><label>Record ID</label><input name="resource_id" type="text" placeholder="Optional" /></div>
            </div>
            <button className="btn" type="submit" disabled={saving}>{saving ? "Processing..." : "Attach audio"}</button>
          </form>
        </div>
        <div className="card">
          <div className="card-h"><div className="ttl">Latest note</div></div>
          <div className="card-b">
            {!result && <div className="text-sm muted">Your saved voice note will appear here.</div>}
            {result?.voice_note && (
              <dl className="kv">
                <dt>Status</dt>
                <dd><Pill tone={statusTone(result.voice_note.transcription_status)}>{String(result.voice_note.transcription_status).startsWith("completed") ? "Saved" : "Processing"}</Pill></dd>
                <dt>AI model</dt><dd className="mono">{result.voice_note.stt_model || "browser speech recognition"}</dd>
                <dt>Words</dt><dd>{result.voice_note.word_count || 0}</dd>
                <dt>Transcript</dt><dd>{result.voice_note.transcript_text || "Transcript will appear when processing finishes."}</dd>
              </dl>
            )}
          </div>
        </div>
        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-h"><div><div className="ttl">Voice-note library</div><div className="sub">{notes.length} saved notes · transcripts stay linked to the source record.</div></div></div>
          <div className="card-b" style={{ padding: 0 }}>
            {notes.length === 0 && <div className="list-row"><div className="muted">No saved voice notes yet.</div></div>}
            {notes.slice(0, 12).map((note) => (
              <div key={note.id} className="list-row" style={{ height: "auto", padding: "12px 16px" }}>
                <IconMic />
                <div className="grow">
                  <b>{note.title || note.file_name || "Voice note"}</b>
                  <div className="sub">{note.resource_type || "workspace"}{note.resource_id ? " · " + note.resource_id : ""} · {note.word_count || 0} words</div>
                </div>
                <Pill tone={statusTone(note.transcription_status)}>
                  {String(note.transcription_status || "").startsWith("completed") ? "Transcribed" : note.transcription_status === "failed" ? "Failed" : "Processing"}
                </Pill>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
