import { errorJson, json, readJson } from "@/lib/server/http";
import { createEvent } from "@/lib/server/repository";
import { getRuntimeContext, requireUser } from "@/lib/server/runtime";
import { newId, nowIso } from "@/lib/server/id";
import { readJsonPayload, storeJsonPayload } from "@/lib/server/payload-storage";

type RepresentationBody = {
  deal_id?: string;
  client_name?: string;
  client_company?: string;
  client_email?: string;
  client_phone?: string;
  relationship_type?: string;
  portal_status?: string;
  access_level?: string;
};

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  requireUser(context);

  const url = new URL(request.url);
  const dealId = url.searchParams.get("deal_id");
  if (!context.env.DB) return json({ ok: true, representations: [] });

  try {
    const query = dealId
      ? "SELECT * FROM deal_representations WHERE organization_id = ? AND deal_id = ? ORDER BY created_at DESC LIMIT 50"
      : "SELECT * FROM deal_representations WHERE organization_id = ? ORDER BY created_at DESC LIMIT 100";
    const statement = context.env.DB.prepare(query);
    const result = dealId
      ? await statement.bind("org_adga_primary", dealId).all()
      : await statement.bind("org_adga_primary").all();
    const representations = await Promise.all((result.results || []).map(async (row: Record<string, unknown>) => {
      const payload = await readJsonPayload<Record<string, unknown>>(context.env, String(row.payload_r2_key || ""));
      return payload ? { ...row, ...payload, id: row.id, organization_id: row.organization_id } : row;
    }));
    return json({ ok: true, representations });
  } catch {
    return json({ ok: true, representations: [] });
  }
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  requireUser(context);
  const body = await readJson<RepresentationBody>(request);

  if (!body.deal_id) return errorJson("deal_id is required.");
  if (!body.client_name && !body.client_company) return errorJson("client_name or client_company is required.");

  const timestamp = nowIso();
  const representation = {
    id: newId("repr"),
    organization_id: "org_adga_primary",
    deal_id: body.deal_id,
    client_name: body.client_name || body.client_company || "Represented client",
    client_company: body.client_company || null,
    client_email: body.client_email || null,
    client_phone: body.client_phone || null,
    relationship_type: body.relationship_type || "represented_client",
    portal_status: body.portal_status || "prepared",
    access_level: body.access_level || "deal_status_documents_meetings_updates",
    created_by: context.user.email,
    created_at: timestamp,
    updated_at: timestamp,
  };
  const stored = context.env.DB
    ? await storeJsonPayload({
        env: context.env,
        db: context.env.DB,
        organization_id: representation.organization_id,
        resource_type: "deal_representation",
        resource_id: representation.id,
        payload: representation,
        created_by: context.user.email,
      })
    : null;

  if (context.env.DB) {
    try {
      await context.env.DB.prepare(
        `INSERT INTO deal_representations
          (id, organization_id, deal_id, client_name, client_company, client_email, client_phone, relationship_type, portal_status, access_level, created_by, payload_r2_key, storage_object_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          representation.id, representation.organization_id, representation.deal_id, `Representation ${representation.id.slice(-8)}`,
          null, null, null,
          representation.relationship_type, representation.portal_status, representation.access_level,
          representation.created_by, stored?.r2_key || null, stored?.storage_object_id || null, representation.created_at, representation.updated_at,
        )
        .run();
    } catch {}
  }

  await createEvent(context.env.DB, {
    organization_id: representation.organization_id,
    event_type: "deal.representation_created",
    actor_type: "user",
    actor_id: context.user.email,
    resource_type: "deal",
    resource_id: representation.deal_id,
    payload: { representation_id: representation.id, payload_r2_key: stored?.r2_key || null, storage_object_id: stored?.storage_object_id || null },
  });

  return json({ ok: true, representation });
}
