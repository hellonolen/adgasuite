import SuiteClient from "./suite-client";
import { headers } from "next/headers";
import { loadWorkspaceBillingState } from "@/lib/server/billing";
import { getRuntimeContext } from "@/lib/server/runtime";

export const dynamic = "force-dynamic";

// One shell mount for every /suite/* route. The wrapper carries the .suite-shell class
// that the legacy CSS in components/adga/*.css scopes to, plus the typography hooks.
// Children render inside the workspace area of the suite shell (currently AdgaSuite still
// owns the workspace render based on pathname — extraction into per-route components is
// staged for the next pass).
export default async function SuiteLayout({ children }: { children: React.ReactNode }) {
  const headerList = await headers();
  const cookieHeader = headerList.get("cookie");
  const request = new Request("https://internal.local/suite", {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
  const context = getRuntimeContext(request);
  const billing = await loadWorkspaceBillingState(context, request);

  return (
    <main className="suite-shell adga-font-product adga-presence-crisp">
      <SuiteClient bootstrap={{ billing }}>{children}</SuiteClient>
    </main>
  );
}
