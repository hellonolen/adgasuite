import SuiteClient from "@/app/suite/suite-client";

export default function CalendarPage() {
  return (
    <main className="suite-shell adga-font-product adga-presence-crisp">
      <SuiteClient bootstrap={{ route: "calendar" }} />
    </main>
  );
}
