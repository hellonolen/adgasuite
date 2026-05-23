import SuiteClient from "@/app/suite/suite-client";

export default function StoryPage() {
  return (
    <main className="suite-shell adga-font-product adga-presence-crisp">
      <SuiteClient bootstrap={{ route: "story" }} />
    </main>
  );
}
