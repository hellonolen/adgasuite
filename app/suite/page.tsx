import { redirect } from "next/navigation";
import { getRuntimeContext } from "@/lib/server/runtime";

// /suite is not a dashboard. The product's primary surface is the live operational graph.
// Land the operator on a real map — the most recently updated one, or the maps gallery if
// the workspace has none yet.
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
      // fall through to gallery
    }
  }

  redirect("/suite/maps");
}
