import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ApprovalsClient } from "@/components/suite/ApprovalsClient";
import { listAgentApprovals } from "@/lib/server/repository";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { getRuntimeContext } from "@/lib/server/runtime";

export const dynamic = "force-dynamic";

export default async function SuitePendingPage() {
  const headerList = await headers();
  const cookieHeader = headerList.get("cookie");
  const request = new Request("https://internal.local/suite/pending", {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
  const context = getRuntimeContext(request);
  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));
  if (!sessionUser && !context.user.isLocalAdminBypass) {
    redirect("/login?redirect=/suite/pending");
  }
  const role = sessionUser?.role || context.user.role;
  if (role !== "owner" && role !== "admin") {
    redirect("/suite");
  }

  const approvals = await listAgentApprovals(context.env.DB);

  return <ApprovalsClient approvals={approvals} />;
}
