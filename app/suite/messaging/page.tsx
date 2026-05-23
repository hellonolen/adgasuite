import SuiteClient from "@/app/suite/suite-client";

export default function MessagingPage() {
  return (
    <main className="suite-shell adga-font-product adga-presence-crisp">
      <SuiteClient bootstrap={{ route: "messaging" }} />
    </main>
  );
}
