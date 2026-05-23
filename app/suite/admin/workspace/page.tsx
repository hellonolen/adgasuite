import SuiteClient from "@/app/suite/suite-client";

export default function AdminWorkspacePage() {
  return (
    <main className="suite-shell adga-font-product adga-presence-crisp">
      <SuiteClient bootstrap={{ route: "admin", section: "workspace" }} />
    </main>
  );
}
