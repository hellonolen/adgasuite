import SuiteClient from "./suite-client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isBillingRecoveryPath, loadWorkspaceBillingState } from "@/lib/server/billing";
import { getRuntimeContext } from "@/lib/server/runtime";
import { resolveTenantSession } from "@/lib/server/tenant";

export const dynamic = "force-dynamic";

// One shell mount for every /suite/* route. The wrapper carries the .suite-shell class
// that the legacy CSS in components/adga/*.css scopes to, plus the typography hooks.
// Children render inside the workspace area of the suite shell (currently AdgaSuite still
// owns the workspace render based on pathname — extraction into per-route components is
// staged for the next pass).
export default async function SuiteLayout({ children }: { children: React.ReactNode }) {
  const headerList = await headers();
  const cookieHeader = headerList.get("cookie");
  const pathname = headerList.get("x-adga-pathname") || "/suite";
  const request = new Request("https://internal.local/suite", {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
  const context = getRuntimeContext(request);
  const session = await resolveTenantSession(context, request);
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(pathname)}`);
  }

  const billing = await loadWorkspaceBillingState(context, request);
  if (!billing.accessAllowed && !isBillingRecoveryPath(pathname)) {
    redirect(`/suite/settings/billing?status=${encodeURIComponent(billing.status)}`);
  }

  return (
    <main className="suite-shell adga-font-product adga-presence-crisp">
      <SuiteClient bootstrap={{ billing }}>{children}</SuiteClient>
    </main>
  );
}
