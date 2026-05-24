import { z } from "zod";
import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { createDealFlow, listDealFlows } from "@/lib/server/repository";
import { readStoredJsonPayload, storeJsonPayload } from "@/lib/server/payload-storage";
import { organizationIdForSession } from "@/lib/server/tenant";

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

  const organizationId = organizationIdForSession(auth.sessionUser);
  const rows = await listDealFlows(auth.context.env.DB, organizationId);
  const dealFlows = await Promise.all(rows.map(async (row) => {
    const payload = await readStoredJsonPayload<Record<string, unknown>>(
      auth.context.env,
      auth.context.env.DB,
      row.payload_r2_key,
      row.storage_object_id,
    );
    return payload ? { ...row, ...payload, id: row.id, organization_id: row.organization_id } : row;
  }));
  return json({ ok: true, dealFlows, maps: dealFlows });
}

const createSchema = z.object({
  name: z.string().min(1, "name is required").max(200),
  deal_id: z.string().min(1).max(200).optional().nullable(),
  template: z.string().min(1).max(80).optional().nullable(),
});

export async function POST(request: Request) {
  const auth = await requireSession(request);
  if (auth.unauthorized) return errorJson("Authentication required.", 401);
  const organizationId = organizationIdForSession(auth.sessionUser);

  const body = await readJson(request);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson("Invalid payload.", 400, parsed.error.flatten());
  }

  const record = await createDealFlow(auth.context.env.DB, {
    organization_id: organizationId,
    name: "DealFlow payload in R2",
    deal_id: parsed.data.deal_id ?? null,
    template: parsed.data.template ?? null,
    created_by_user_id: auth.sessionUser?.user_id || auth.context.user.email || null,
  });
  const payload = { ...record, name: parsed.data.name, deal_id: parsed.data.deal_id ?? null, template: parsed.data.template ?? null };
  const stored = auth.context.env.DB
    ? await storeJsonPayload({
        env: auth.context.env,
        db: auth.context.env.DB,
        organization_id: organizationId,
        resource_type: "dealflow",
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

  const dealFlow = { ...record, ...payload, payload_r2_key: stored?.r2_key || null, storage_object_id: stored?.storage_object_id || null };
  return json({ ok: true, dealFlow, map: dealFlow }, { status: 201 });
}
