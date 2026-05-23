import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { randomToken } from "@/lib/server/magic-auth";
import { nowIso } from "@/lib/server/id";

type Permission = "view" | "comment" | "edit";

const ALLOWED_PERMISSIONS: Permission[] = ["view", "comment", "edit"];
const DEFAULT_PERMISSION: Permission = "view";

interface ShareRow {
  token: string;
  map_id: string;
  permission: string;
  created_by_user_id: string | null;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
}

interface ShareBody {
  permission?: string;
  rotate?: boolean;
  expires_at?: string | null;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

function publicShareUrl(request: Request, token: string): string {
  const url = new URL(`/share/map/${encodeURIComponent(token)}`, request.url);
  return url.toString();
}

function normalizePermission(value: unknown): Permission {
  if (typeof value !== "string") return DEFAULT_PERMISSION;
  return (ALLOWED_PERMISSIONS as string[]).includes(value)
    ? (value as Permission)
    : DEFAULT_PERMISSION;
}

function serializeShare(row: ShareRow, request: Request) {
  return {
    token: row.token,
    map_id: row.map_id,
    permission: row.permission,
    url: publicShareUrl(request, row.token),
    created_at: row.created_at,
    created_by_user_id: row.created_by_user_id,
    expires_at: row.expires_at,
    revoked_at: row.revoked_at,
  };
}

async function loadActiveShare(db: D1Database, mapId: string): Promise<ShareRow | null> {
  return db
    .prepare(
      `SELECT token, map_id, permission, created_by_user_id, created_at, expires_at, revoked_at
       FROM map_shares
       WHERE map_id = ? AND revoked_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .bind(mapId)
    .first<ShareRow>();
}

async function ensureMapExists(db: D1Database, mapId: string): Promise<boolean> {
  try {
    const row = await db
      .prepare("SELECT id FROM maps WHERE id = ? LIMIT 1")
      .bind(mapId)
      .first<{ id: string }>();
    return Boolean(row);
  } catch {
    // maps table may not exist yet during phased rollout — treat as missing.
    return false;
  }
}

export async function GET(request: Request, ctx: RouteContext) {
  const { id: mapId } = await ctx.params;
  const context = getRuntimeContext(request);
  const db = context.env.DB;

  if (!db) return errorJson("Database is not configured.", 503);

  const sessionUser = await validateSession(db, readSessionCookie(request));
  if (!sessionUser && !context.user.isLocalAdminBypass) {
    return errorJson("Authentication required.", 401);
  }

  if (!(await ensureMapExists(db, mapId))) {
    return errorJson("Map not found.", 404);
  }

  try {
    const row = await loadActiveShare(db, mapId);
    return json({ ok: true, share: row ? serializeShare(row, request) : null });
  } catch {
    return errorJson("Share storage is not configured.", 503);
  }
}

export async function POST(request: Request, ctx: RouteContext) {
  const { id: mapId } = await ctx.params;
  const context = getRuntimeContext(request);
  const db = context.env.DB;

  if (!db) return errorJson("Database is not configured.", 503);

  const sessionUser = await validateSession(db, readSessionCookie(request));
  if (!sessionUser && !context.user.isLocalAdminBypass) {
    return errorJson("Authentication required.", 401);
  }

  if (!(await ensureMapExists(db, mapId))) {
    return errorJson("Map not found.", 404);
  }

  const body = await readJson<ShareBody>(request);
  const permission = normalizePermission(body.permission);
  const expiresAt = typeof body.expires_at === "string" && body.expires_at ? body.expires_at : null;

  try {
    const existing = await loadActiveShare(db, mapId);
    // POST creates OR rotates: any existing live token is revoked first.
    if (existing) {
      await db
        .prepare("UPDATE map_shares SET revoked_at = ? WHERE token = ?")
        .bind(nowIso(), existing.token)
        .run();
    }

    const token = randomToken(32);
    const createdBy = sessionUser?.user_id || sessionUser?.email || context.user.email || null;
    const createdAt = nowIso();

    await db
      .prepare(
        `INSERT INTO map_shares (token, map_id, permission, created_by_user_id, created_at, expires_at, revoked_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL)`,
      )
      .bind(token, mapId, permission, createdBy, createdAt, expiresAt)
      .run();

    const row: ShareRow = {
      token,
      map_id: mapId,
      permission,
      created_by_user_id: createdBy,
      created_at: createdAt,
      expires_at: expiresAt,
      revoked_at: null,
    };

    return json({ ok: true, share: serializeShare(row, request) });
  } catch {
    return errorJson("Could not create the share link.", 500);
  }
}

export async function DELETE(request: Request, ctx: RouteContext) {
  const { id: mapId } = await ctx.params;
  const context = getRuntimeContext(request);
  const db = context.env.DB;

  if (!db) return errorJson("Database is not configured.", 503);

  const sessionUser = await validateSession(db, readSessionCookie(request));
  if (!sessionUser && !context.user.isLocalAdminBypass) {
    return errorJson("Authentication required.", 401);
  }

  if (!(await ensureMapExists(db, mapId))) {
    return errorJson("Map not found.", 404);
  }

  try {
    // Hard delete every share for this map. Revocation already prevents access,
    // but DELETE is the explicit "wipe the share footprint" operation.
    await db.prepare("DELETE FROM map_shares WHERE map_id = ?").bind(mapId).run();
    return json({ ok: true, share: null });
  } catch {
    return errorJson("Could not revoke share links.", 500);
  }
}
