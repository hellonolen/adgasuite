import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { organizationIdForSession } from "@/lib/server/tenant";

export const dynamic = "force-dynamic";

// /suite is not a duplicate dashboard. Land the operator on the most recently
// updated deal canvas, or the Deals page if the workspace has none yet.
export default async function SuiteRootRedirect() {
  const headerList = await headers();
  const cookieHeader = headerList.get("cookie");
  const host = headerList.get("x-forwarded-host") || headerList.get("host") || "internal.local";
  const proto = headerList.get("x-forwarded-proto") || "https";
  const request = new Request(`${proto}://${host}/suite`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
  const context = getRuntimeContext(request);
  const db = context.env.DB;
  const sessionUser = await validateSession(db, readSessionCookie(request));

  if (!sessionUser && !context.user.isLocalAdminBypass) {
    redirect("/login?redirect=/suite");
  }
  const organizationId = organizationIdForSession(sessionUser);

  if (db) {
    try {
      const latestMap = await db
        .prepare("SELECT id FROM maps WHERE organization_id = ? AND archived_at IS NULL ORDER BY updated_at DESC LIMIT 1")
        .bind(organizationId)
        .first<{ id: string }>();
      if (latestMap?.id) redirect(`/suite/dealflow/${latestMap.id}`);
      const latestDeal = await db
        .prepare("SELECT id FROM deals WHERE organization_id = ? AND archived_at IS NULL ORDER BY updated_at DESC LIMIT 1")
        .bind(organizationId)
        .first<{ id: string }>();
      if (latestDeal?.id) redirect(`/suite/dealflow/${latestDeal.id}`);
    } catch {
      // fall through to Deals
    }
  }

  redirect("/suite/deals");
}
