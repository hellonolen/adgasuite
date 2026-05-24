import { redirect } from "next/navigation";
import { getRuntimeContext } from "@/lib/server/runtime";

// /suite is not a duplicate dashboard. Land the operator on the most recently
// updated deal canvas, or the Deals page if the workspace has none yet.
export default async function SuiteRootRedirect() {
  const context = getRuntimeContext(new Request("http://localhost/"));
  const db = context.env.DB;

  if (db) {
    try {
      const latestMap = await db
        .prepare("SELECT id FROM maps ORDER BY updated_at DESC LIMIT 1")
        .first<{ id: string }>();
      if (latestMap?.id) redirect(`/suite/map/${latestMap.id}`);
      const latestDeal = await db
        .prepare("SELECT id FROM deals ORDER BY updated_at DESC LIMIT 1")
        .first<{ id: string }>();
      if (latestDeal?.id) redirect(`/suite/map/${latestDeal.id}`);
    } catch {
      // fall through to Deals
    }
  }

  redirect("/suite/deals");
}
