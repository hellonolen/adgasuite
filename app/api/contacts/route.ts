import { z } from "zod";
import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { newId, nowIso } from "@/lib/server/id";
import { createEvent } from "@/lib/server/repository";

const ORG_ID = "org_adga_primary";

const createSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required"),
  last_name: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  title: z.string().trim().optional().or(z.literal("")),
  company: z.string().trim().optional().or(z.literal("")),
  linkedin_url: z.string().trim().url().optional().or(z.literal("")),
  role_authority: z.string().trim().optional().or(z.literal("")),
  source: z.string().trim().optional().or(z.literal("")),
  status: z.string().trim().optional().or(z.literal("")),
});

async function authorize(request: Request) {
  const context = getRuntimeContext(request);
  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));
  if (!sessionUser && !context.user.isLocalAdminBypass) {
    return { context, user: null };
  }
  const userEmail = sessionUser?.email || context.user.email;
  return { context, user: { email: userEmail } as { email: string } };
}

export async function GET(request: Request) {
  const { context, user } = await authorize(request);
  if (!user) return errorJson("Unauthorized", 401);

  const db = context.env.DB;
  if (!db) return json({ ok: true, contacts: [], total: 0 });

  const url = new URL(request.url);
  const search = (url.searchParams.get("search") || "").trim().toLowerCase();
  const statusFilter = (url.searchParams.get("status") || "").trim();
  const ownerFilter = (url.searchParams.get("owner") || "").trim();
  const cityFilter = (url.searchParams.get("city") || "").trim();
  const sectorFilter = (url.searchParams.get("sector") || "").trim();
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 100);
  const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);

  const clauses: string[] = ["organization_id = ?", "archived_at IS NULL"];
  const binds: (string | number)[] = [ORG_ID];

  if (search) {
    clauses.push("(LOWER(COALESCE(full_name, '')) LIKE ? OR LOWER(COALESCE(email, '')) LIKE ? OR LOWER(COALESCE(company, '')) LIKE ?)");
    const term = `%${search}%`;
    binds.push(term, term, term);
  }
  if (statusFilter) {
    clauses.push("status = ?");
    binds.push(statusFilter);
  }
  if (ownerFilter) {
    clauses.push("owner_user_id = ?");
    binds.push(ownerFilter);
  }
  if (cityFilter) {
    clauses.push("LOWER(COALESCE(city, '')) = ?");
    binds.push(cityFilter.toLowerCase());
  }
  if (sectorFilter) {
    clauses.push("LOWER(COALESCE(industry, '')) = ?");
    binds.push(sectorFilter.toLowerCase());
  }

  const where = clauses.join(" AND ");

  try {
    const [rows, totalRow, facetRows] = await Promise.all([
      db
        .prepare(
          `SELECT id, full_name, first_name, last_name, email, phone, company, title,
                  industry, city, state_region, country, status, owner_user_id,
                  linkedin_url, x_url, instagram_url, facebook_url,
                  last_contacted_at, received_at, created_at, updated_at
           FROM contacts
           WHERE ${where}
           ORDER BY COALESCE(updated_at, created_at) DESC
           LIMIT ? OFFSET ?`,
        )
        .bind(...binds, limit, offset)
        .all<Record<string, unknown>>(),
      db
        .prepare(`SELECT COUNT(*) AS total FROM contacts WHERE ${where}`)
        .bind(...binds)
        .first<{ total: number }>(),
      db
        .prepare(
          `SELECT
              GROUP_CONCAT(DISTINCT status) AS statuses,
              GROUP_CONCAT(DISTINCT owner_user_id) AS owners,
              GROUP_CONCAT(DISTINCT city) AS cities,
              GROUP_CONCAT(DISTINCT industry) AS sectors
           FROM contacts
           WHERE organization_id = ? AND archived_at IS NULL`,
        )
        .bind(ORG_ID)
        .first<{ statuses: string | null; owners: string | null; cities: string | null; sectors: string | null }>(),
    ]);

    const split = (value: string | null | undefined) =>
      (value || "")
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .sort();

    return json({
      ok: true,
      contacts: rows.results || [],
      total: Number(totalRow?.total || 0),
      limit,
      offset,
      facets: {
        statuses: split(facetRows?.statuses),
        owners: split(facetRows?.owners),
        cities: split(facetRows?.cities),
        sectors: split(facetRows?.sectors),
      },
    });
  } catch (error) {
    return errorJson(error instanceof Error ? error.message : "Failed to load contacts", 500);
  }
}

export async function POST(request: Request) {
  const { context, user } = await authorize(request);
  if (!user) return errorJson("Unauthorized", 401);

  const db = context.env.DB;
  if (!db) return errorJson("Database not configured", 503);

  const body = await readJson<Record<string, unknown>>(request);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson("Validation failed", 400, parsed.error.flatten());
  }

  const { data } = parsed;
  const id = newId("con");
  const timestamp = nowIso();
  const fullName = `${data.first_name} ${data.last_name}`.trim();

  try {
    await db
      .prepare(
        `INSERT INTO contacts
          (id, organization_id, first_name, last_name, full_name, email, phone, company, title,
           linkedin_url, role_authority, source, owner_user_id, status, received_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        ORG_ID,
        data.first_name,
        data.last_name,
        fullName,
        data.email || null,
        data.phone || null,
        data.company || null,
        data.title || null,
        data.linkedin_url || null,
        data.role_authority || null,
        data.source || null,
        user.email,
        data.status || "lead",
        timestamp,
        timestamp,
        timestamp,
      )
      .run();

    await createEvent(db, {
      organization_id: ORG_ID,
      event_type: "contact.created",
      actor_type: "user",
      actor_id: user.email,
      resource_type: "contact",
      resource_id: id,
      payload: { full_name: fullName, company: data.company || null, source: data.source || null },
    });

    return json({ ok: true, contact: { id, full_name: fullName } });
  } catch (error) {
    return errorJson(error instanceof Error ? error.message : "Failed to create contact", 500);
  }
}
