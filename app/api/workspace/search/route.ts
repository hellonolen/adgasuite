import { z } from "zod";

import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext, requireAdmin } from "@/lib/server/runtime";
import { DEFAULT_ORG_ID } from "@/lib/server/tenant";
import { searchWorkspace } from "@/lib/server/workspace-search";

const SearchSchema = z.object({
  q: z.string().min(2).max(120),
  limit: z.number().int().min(1).max(25).optional(),
  organization_id: z.string().min(1).max(120).optional(),
});

function parseGet(request: Request) {
  const url = new URL(request.url);
  const limit = url.searchParams.get("limit");
  return SearchSchema.safeParse({
    q: url.searchParams.get("q") || "",
    limit: limit ? Number(limit) : undefined,
    organization_id: url.searchParams.get("organization_id") || undefined,
  });
}

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  try {
    requireAdmin(context);
  } catch (response) {
    if (response instanceof Response) return response;
    return errorJson("Forbidden", 403);
  }

  const parsed = parseGet(request);
  if (!parsed.success) return errorJson("Invalid search query.", 400, parsed.error.issues);

  const results = await searchWorkspace(context.env, {
    query: parsed.data.q,
    organizationId: parsed.data.organization_id || DEFAULT_ORG_ID,
    limit: parsed.data.limit,
  });
  return json({ ok: true, ...results });
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  try {
    requireAdmin(context);
  } catch (response) {
    if (response instanceof Response) return response;
    return errorJson("Forbidden", 403);
  }

  const body = await readJson<Record<string, unknown>>(request);
  const parsed = SearchSchema.safeParse(body);
  if (!parsed.success) return errorJson("Invalid search query.", 400, parsed.error.issues);

  const results = await searchWorkspace(context.env, {
    query: parsed.data.q,
    organizationId: parsed.data.organization_id || DEFAULT_ORG_ID,
    limit: parsed.data.limit,
  });
  return json({ ok: true, ...results });
}
