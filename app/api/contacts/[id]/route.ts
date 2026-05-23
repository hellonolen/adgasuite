import { z } from "zod";
import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { nowIso } from "@/lib/server/id";
import { createEvent } from "@/lib/server/repository";

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

    return json({ ok: true, contact, events: events.results || [] });
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

  const fields: string[] = [];
  const binds: (string | null)[] = [];
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value === undefined) continue;
    fields.push(`${key} = ?`);
    binds.push(value === "" ? null : (value as string | null));
  }

  if (!fields.length) return errorJson("No changes provided", 400);

  if (parsed.data.first_name || parsed.data.last_name) {
    const existing = await db
      .prepare("SELECT first_name, last_name FROM contacts WHERE id = ? AND organization_id = ?")
      .bind(id, ORG_ID)
      .first<{ first_name: string; last_name: string }>();
    if (existing) {
      const first = parsed.data.first_name ?? existing.first_name;
      const last = parsed.data.last_name ?? existing.last_name;
      fields.push("full_name = ?");
      binds.push(`${first} ${last}`.trim());
    }
  }

  const timestamp = nowIso();
  fields.push("updated_at = ?");
  binds.push(timestamp);

  try {
    const result = await db
      .prepare(`UPDATE contacts SET ${fields.join(", ")} WHERE id = ? AND organization_id = ?`)
      .bind(...binds, id, ORG_ID)
      .run();

    if (!result.success) return errorJson("Update failed", 500);

    await createEvent(db, {
      organization_id: ORG_ID,
      event_type: "contact.updated",
      actor_type: "user",
      actor_id: user.email,
      resource_type: "contact",
      resource_id: id,
      payload: { fields: Object.keys(parsed.data) },
    });

    const contact = await db
      .prepare("SELECT * FROM contacts WHERE id = ? LIMIT 1")
      .bind(id)
      .first<Record<string, unknown>>();

    return json({ ok: true, contact });
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
