import SuiteClient from "@/app/suite/suite-client";

export default function AdminTeamPage() {
  return (
    <main className="suite-shell adga-font-product adga-presence-crisp">
      <SuiteClient bootstrap={{ route: "admin", section: "team" }} />
    </main>
  );
}
