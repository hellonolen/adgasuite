import SuiteClient from "@/app/suite/suite-client";

export default function VoiceNotesPage() {
  return (
    <main className="suite-shell adga-font-product adga-presence-crisp">
      <SuiteClient bootstrap={{ route: "voice-notes" }} />
    </main>
  );
}
