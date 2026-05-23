import SuiteClient from "@/app/suite/suite-client";

export default function AffiliatePayoutsPage() {
  return (
    <main className="suite-shell adga-font-product adga-presence-crisp">
      <SuiteClient bootstrap={{ route: "affiliates", section: "payouts" }} />
    </main>
  );
}
