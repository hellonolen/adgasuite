// /suite/import — Import wizard.
//
// Server component shell — mirrors the auth + tenant pattern from
// /suite/settings/seats. The interactive wizard (file upload, preview,
// commit) is a client child so the page itself stays cacheable + crawlable.
//
// Skill: skills/csv-import.skill.md
// Routes used: /api/import/preview, /api/import/run, /api/import/batches,
//              /api/import/batches/[id], /api/import/batches/[id]/retry

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { DEFAULT_ORG_ID, organizationIdForSession } from "@/lib/server/tenant";
import ImportWizard from "./ImportWizard";

export const dynamic = "force-dynamic";

export default async function SuiteImportPage() {
  const headerList = await headers();
  const cookieHeader = headerList.get("cookie");
  const request = new Request("https://internal.local/suite/import", {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
  const context = getRuntimeContext(request);
  const session = await validateSession(context.env.DB, readSessionCookie(request));
  if (!session && !context.user.isLocalAdminBypass) {
    redirect("/login?next=/suite/import");
  }

  // organizationId is resolved here for parity with seats — the wizard derives
  // tenant scope server-side on each API call, so we only need it for display.
  const organizationId = organizationIdForSession(session, DEFAULT_ORG_ID);

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
          <h1>Import.</h1>
          <div className="sub">Bring a pipeline from CSV or paste.</div>
        </div>
      </div>

      <ImportWizard workspaceId={organizationId} />
    </div>
  );
}
