import { z } from "zod";
import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { nowIso } from "@/lib/server/id";
import { createEvent } from "@/lib/server/repository";
import { readJsonPayload, storeJsonPayload } from "@/lib/server/payload-storage";

const ORG_ID = "org_adga_primary";

const updateSchema = z.object({
  first_name: z.string().trim().min(1).optional(),
  last_name: z.string().trim().min(1).optional(),
  email: z.string().trim().email().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  title: z.string().trim().nullable().optional(),
  company: z.string().trim().nullable().optional(),
  linkedin_url: z.string().trim().url().nullable().optional(),
  x_url: z.string().trim().url().nullable().optional(),
  instagram_url: z.string().trim().url().nullable().optional(),
  facebook_url: z.string().trim().url().nullable().optional(),
  role_authority: z.string().trim().nullable().optional(),
  source: z.string().trim().nullable().optional(),
  status: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
  state_region: z.string().trim().nullable().optional(),
  country: z.string().trim().nullable().optional(),
  industry: z.string().trim().nullable().optional(),
  need_summary: z.string().trim().nullable().optional(),
});

async function authorize(request: Request) {
  const context = getRuntimeContext(request);
  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));
  if (!sessionUser && !context.user.isLocalAdminBypass) {
    return { context, user: null };
  }
  return { context, user: { email: sessionUser?.email || context.user.email } as { email: string } };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { context, user } = await authorize(request);
  if (!user) return errorJson("Unauthorized", 401);

  const db = context.env.DB;
  if (!db) return errorJson("Database not configured", 503);

  try {
    const contact = await db
      .prepare("SELECT * FROM contacts WHERE id = ? AND organization_id = ? LIMIT 1")
      .bind(id, ORG_ID)
      .first<Record<string, unknown>>();
    if (!contact) return errorJson("Not found", 404);
    const payload = await readJsonPayload<Record<string, unknown>>(context.env, String(contact.payload_r2_key || ""));
    const mergedContact = payload ? { ...contact, ...payload, id: contact.id, organization_id: contact.organization_id } : contact;

    const events = await db
      .prepare(
        `SELECT id, event_type, actor_type, actor_id, payload_json, created_at
         FROM events
         WHERE resource_type = 'contact' AND resource_id = ?
         ORDER BY created_at DESC
         LIMIT 50`,
      )
      .bind(id)
      .all<Record<string, unknown>>();

    return json({ ok: true, contact: mergedContact, events: events.results || [] });
  } catch (error) {
    return errorJson(error instanceof Error ? error.message : "Failed to load contact", 500);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { context, user } = await authorize(request);
  if (!user) return errorJson("Unauthorized", 401);

  const db = context.env.DB;
  if (!db) return errorJson("Database not configured", 503);

  const body = await readJson<Record<string, unknown>>(request);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson("Validation failed", 400, parsed.error.flatten());
  }

  if (!Object.keys(parsed.data).length) return errorJson("No changes provided", 400);

  const timestamp = nowIso();

  try {
    const existing = await db
      .prepare("SELECT * FROM contacts WHERE id = ? AND organization_id = ? LIMIT 1")
      .bind(id, ORG_ID)
      .first<Record<string, unknown>>();
    if (!existing) return errorJson("Not found", 404);
    const existingPayload = await readJsonPayload<Record<string, unknown>>(context.env, String(existing.payload_r2_key || ""));
    const nextPayload = {
      ...(existingPayload || existing),
      ...parsed.data,
      id,
      organization_id: ORG_ID,
      full_name: `${parsed.data.first_name ?? existingPayload?.first_name ?? existing.first_name ?? ""} ${parsed.data.last_name ?? existingPayload?.last_name ?? existing.last_name ?? ""}`.trim(),
      updated_at: timestamp,
    };
    const stored = await storeJsonPayload({
      env: context.env,
      db,
      organization_id: ORG_ID,
      resource_type: "contact",
      resource_id: id,
      payload: nextPayload,
      created_by: user.email,
    });

    const result = await db
      .prepare(
        `UPDATE contacts
         SET status = ?, source = ?, payload_r2_key = ?, storage_object_id = ?, updated_at = ?
         WHERE id = ? AND organization_id = ?`,
      )
      .bind(
        parsed.data.status || existing.status || "lead",
        parsed.data.source || existing.source || null,
        stored.r2_key,
        stored.storage_object_id,
        timestamp,
        id,
        ORG_ID,
      )
      .run();

    if (!result.success) return errorJson("Update failed", 500);

    await createEvent(db, {
      organization_id: ORG_ID,
      event_type: "contact.updated",
      actor_type: "user",
      actor_id: user.email,
      resource_type: "contact",
      resource_id: id,
      payload: { contact_id: id, fields: Object.keys(parsed.data), payload_r2_key: stored.r2_key, storage_object_id: stored.storage_object_id },
    });

    const contact = await db
      .prepare("SELECT * FROM contacts WHERE id = ? LIMIT 1")
      .bind(id)
      .first<Record<string, unknown>>();

    return json({ ok: true, contact: { ...contact, ...nextPayload, id } });
  } catch (error) {
    return errorJson(error instanceof Error ? error.message : "Failed to update contact", 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { context, user } = await authorize(request);
  if (!user) return errorJson("Unauthorized", 401);

  const db = context.env.DB;
  if (!db) return errorJson("Database not configured", 503);

  const timestamp = nowIso();
  try {
    const result = await db
      .prepare("UPDATE contacts SET archived_at = ?, updated_at = ? WHERE id = ? AND organization_id = ?")
      .bind(timestamp, timestamp, id, ORG_ID)
      .run();

    if (!result.success) return errorJson("Delete failed", 500);

    await createEvent(db, {
      organization_id: ORG_ID,
      event_type: "contact.archived",
      actor_type: "user",
      actor_id: user.email,
      resource_type: "contact",
      resource_id: id,
      payload: {},
    });

    return json({ ok: true });
  } catch (error) {
    return errorJson(error instanceof Error ? error.message : "Failed to delete contact", 500);
  }
}
