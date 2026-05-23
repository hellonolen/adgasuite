import { z } from "zod";
import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { createMap, listMaps } from "@/lib/server/repository";

const DEFAULT_ORG_ID = "org_adga_primary";

async function requireSession(request: Request) {
  const context = getRuntimeContext(request);
  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));
  if (!sessionUser && !context.user.isLocalAdminBypass) {
    return { context, sessionUser: null, unauthorized: true as const };
  }
  return { context, sessionUser, unauthorized: false as const };
}

export async function GET(request: Request) {
  const auth = await requireSession(request);
  if (auth.unauthorized) return errorJson("Authentication required.", 401);

  const maps = await listMaps(auth.context.env.DB, DEFAULT_ORG_ID);
  return json({ ok: true, maps });
}

const createSchema = z.object({
  name: z.string().min(1, "name is required").max(200),
  deal_id: z.string().min(1).max(200).optional().nullable(),
  template: z.string().min(1).max(80).optional().nullable(),
});

export async function POST(request: Request) {
  const auth = await requireSession(request);
  if (auth.unauthorized) return errorJson("Authentication required.", 401);

  const body = await readJson(request);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson("Invalid payload.", 400, parsed.error.flatten());
  }

  const record = await createMap(auth.context.env.DB, {
    organization_id: DEFAULT_ORG_ID,
    name: parsed.data.name,
    deal_id: parsed.data.deal_id ?? null,
    template: parsed.data.template ?? null,
    created_by_user_id: auth.sessionUser?.user_id || auth.context.user.email || null,
  });

  return json({ ok: true, map: record }, { status: 201 });
}
