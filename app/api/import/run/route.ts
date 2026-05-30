// POST /api/import/run — execute a csv/paste import via the csv-import skill.
// Returns batch summary. Emits import.requested + per-row events + import.completed.

import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext, hydrateUserFromSession, requireUser } from "@/lib/server/runtime";
import { callSkill } from "@/lib/agents/skill-registry";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { DEFAULT_ORG_ID, organizationIdForSession } from "@/lib/server/tenant";
import "@/lib/agents/handlers"; // side-effect: registers handlers

interface RunBody {
  source_type?: "csv" | "paste";
  target_type?: "contacts" | "leads" | "deals" | "organizations";
  payload?: {
    csv?: { content: string; has_header: boolean };
    paste?: { rows: string[][]; has_header: boolean };
  };
  field_mapping?: Record<string, string>;
  dedupe_strategy?: "email" | "name_plus_company" | "domain" | "name" | "phone" | "none";
}

const MAX_RUN_BYTES = 5 * 1024 * 1024;
const MAX_PASTE_ROWS_RUN = 50_000;

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  await hydrateUserFromSession(context, request);
  try {
    requireUser(context);
  } catch (response) {
    if (response instanceof Response) return response;
    return errorJson("Unauthorized", 401);
  }

  const body = await readJson<RunBody>(request);
  if (body.source_type !== "csv" && body.source_type !== "paste") {
    return errorJson("source_type must be 'csv' or 'paste'.");
  }
  if (!body.target_type) return errorJson("target_type is required.");
  if (!body.field_mapping || Object.keys(body.field_mapping).length === 0) {
    return errorJson("field_mapping is required.");
  }
  if (body.source_type === "csv") {
    const csvContent = body.payload?.csv?.content;
    if (!csvContent) return errorJson("payload.csv.content required for csv source.");
    if (csvContent.length > MAX_RUN_BYTES) {
      return errorJson(`Payload exceeds run size cap (${Math.round(MAX_RUN_BYTES / 1024)} KB).`, 413);
    }
  }
  if (body.source_type === "paste") {
    const pasteRows = body.payload?.paste?.rows;
    if (!pasteRows?.length) return errorJson("payload.paste.rows required for paste source.");
    if (pasteRows.length > MAX_PASTE_ROWS_RUN) {
      return errorJson(`Payload exceeds run row cap (${MAX_PASTE_ROWS_RUN.toLocaleString()} rows). Split into smaller batches.`, 413);
    }
  }

  const session = await validateSession(context.env.DB, readSessionCookie(request));
  const organizationId = organizationIdForSession(session, DEFAULT_ORG_ID);

  const result = await callSkill(
    {
      env: context.env,
      organization_id: organizationId,
      actor_type: "user",
      actor_id: context.user.email || session?.user_id || "unknown",
    },
    "csv-import",
    {
      source_type: body.source_type,
      target_type: body.target_type,
      payload: body.payload || {},
      field_mapping: body.field_mapping,
      dedupe_strategy: body.dedupe_strategy,
    },
  );

  if (!result.ok) return json({ ok: false, error: result.error || "import_failed" }, { status: 502 });
  return json({ ok: true, batch: result.data });
}
