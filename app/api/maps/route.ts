import { z } from "zod";
import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { createMap, listMaps } from "@/lib/server/repository";
import { readJsonPayload, storeJsonPayload } from "@/lib/server/payload-storage";

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

  const rows = await listMaps(auth.context.env.DB, DEFAULT_ORG_ID);
  const maps = await Promise.all(rows.map(async (row) => {
    const payload = await readJsonPayload<Record<string, unknown>>(auth.context.env, row.payload_r2_key);
    return payload ? { ...row, ...payload, id: row.id, organization_id: row.organization_id } : row;
  }));
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
    name: "Map payload in R2",
    deal_id: parsed.data.deal_id ?? null,
    template: parsed.data.template ?? null,
    created_by_user_id: auth.sessionUser?.user_id || auth.context.user.email || null,
  });
  const payload = { ...record, name: parsed.data.name, deal_id: parsed.data.deal_id ?? null, template: parsed.data.template ?? null };
  const stored = auth.context.env.DB
    ? await storeJsonPayload({
        env: auth.context.env,
        db: auth.context.env.DB,
        organization_id: DEFAULT_ORG_ID,
        resource_type: "map",
        resource_id: record.id,
        payload,
        created_by: auth.sessionUser?.email || auth.context.user.email || null,
      })
    : null;
  if (auth.context.env.DB && stored) {
    await auth.context.env.DB.prepare("UPDATE maps SET payload_r2_key = ?, storage_object_id = ? WHERE id = ?")
      .bind(stored.r2_key, stored.storage_object_id, record.id)
      .run();
  }

  return json({ ok: true, map: { ...record, ...payload, payload_r2_key: stored?.r2_key || null, storage_object_id: stored?.storage_object_id || null } }, { status: 201 });
}
