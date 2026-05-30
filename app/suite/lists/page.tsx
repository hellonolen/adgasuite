// /suite/lists — Lists workspace. Server component handles auth + initial
// fetch; ListsClient.tsx owns the interactive form / filter builder / results
// panel. Light mode only; visual style matches /suite/settings/seats.

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { DEFAULT_ORG_ID, organizationIdForSession } from "@/lib/server/tenant";
import { callSkill } from "@/lib/agents/skill-registry";
import "@/lib/agents/handlers";
import ListsClient, { type ListSummary } from "./ListsClient";

export const dynamic = "force-dynamic";

async function loadLists(env: CloudflareEnv, organizationId: string, actorId: string): Promise<ListSummary[]> {
  if (!env.DB) return [];
  const result = await callSkill(
    {
      env,
      organization_id: organizationId,
      actor_type: "user",
      actor_id: actorId,
    },
    "list-segment",
    { operation: "list_all" },
  );
  if (!result.ok) return [];
  const data = result.data as { lists?: ListSummary[] } | undefined;
  return data?.lists || [];
}

export default async function SuiteListsPage() {
  const headerList = await headers();
  const cookieHeader = headerList.get("cookie");
  const request = new Request("https://internal.local/suite/lists", {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });

  const context = getRuntimeContext(request);
  const session = await validateSession(context.env.DB, readSessionCookie(request));
  if (!session && !context.user.isLocalAdminBypass) {
    redirect("/login?next=/suite/lists");
  }

  const organizationId = organizationIdForSession(session, DEFAULT_ORG_ID);
  const actorId = session?.email || context.user.email || "unknown";
  const lists = await loadLists(context.env, organizationId, actorId);

  return (
    <div
      style={{
        padding: "0 var(--suite-gutter, 32px) 48px",
        display: "flex",
        flexDirection: "column",
        gap: 28,
      }}
    >
      <div className="page-h">
        <div>
          <h1>Lists.</h1>
          <div className="sub">
            Saved filtered views over contacts, leads, and deals. Live results — no cache.
          </div>
        </div>
      </div>

      <ListsClient initialLists={lists} />
    </div>
  );
}
