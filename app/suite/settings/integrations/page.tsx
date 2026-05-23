import SuiteClient from "@/app/suite/suite-client";

export default function SettingsIntegrationsPage() {
  return (
    <main className="suite-shell adga-font-product adga-presence-crisp">
      <SuiteClient bootstrap={{ route: "settings", section: "integrations" }} />
    </main>
  );
}
