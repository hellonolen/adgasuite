import { isoDaysFromNow, normalizeEmail, randomToken, sha256, userIdForEmail } from "@/lib/server/magic-auth";
import { orgIdForEmail, orgNameForEmail, orgSlugForEmail, OWNER_EMAIL } from "@/lib/server/tenant";

export interface ProvisionedSession {
  email: string;
  organizationId: string;
  sessionToken: string;
}

export async function provisionUserSession(
  db: D1Database,
  input: {
    email: string;
    name?: string | null;
    plan?: string | null;
    subscriptionStatus?: string | null;
  },
): Promise<ProvisionedSession> {
  const email = normalizeEmail(input.email);
  const userId = userIdForEmail(email);
  const organizationId = orgIdForEmail(email);
  const organizationName = orgNameForEmail(email);
  const organizationSlug = orgSlugForEmail(email);
  const role = email === OWNER_EMAIL ? "owner" : "owner";
  const now = new Date().toISOString();
  const sessionToken = randomToken();
  const sessionHash = await sha256(sessionToken);
  const sessionId = crypto.randomUUID();
  const displayName = input.name?.trim() || email.split("@")[0];

  await db
    .prepare(
      `INSERT OR IGNORE INTO organizations (id, name, slug, plan, subscription_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(organizationId, organizationName, organizationSlug, input.plan || "team", "trialing", now, now)
    .run();

  if (input.plan || input.subscriptionStatus) {
    await db
      .prepare(
        `UPDATE organizations
         SET plan = COALESCE(NULLIF(?, ''), plan),
             subscription_status = COALESCE(NULLIF(?, ''), subscription_status),
             updated_at = ?
         WHERE id = ?`,
      )
      .bind(input.plan || "", input.subscriptionStatus || "", now, organizationId)
      .run();
  }

  await db
    .prepare(
      `INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(userId, email, displayName, role, now, now)
    .run();

  // Look up the actual user_id by email — INSERT OR IGNORE may have skipped due to
  // an existing row with a legacy id, in which case the email-derived userId won't
  // match what's in the DB and downstream FK inserts would fail.
  const userRow = await db
    .prepare("SELECT id FROM users WHERE email = ? LIMIT 1")
    .bind(email)
    .first<{ id: string }>();
  const resolvedUserId = userRow?.id || userId;

  await db
    .prepare("UPDATE users SET name = COALESCE(NULLIF(?, ''), name), updated_at = ? WHERE id = ?")
    .bind(displayName, now, resolvedUserId)
    .run();

  // Same defensive lookup for organizations — there may be an existing row with
  // a legacy id that the slug UNIQUE constraint collides with.
  const orgRow = await db
    .prepare("SELECT id FROM organizations WHERE id = ? OR slug = ? LIMIT 1")
    .bind(organizationId, organizationSlug)
    .first<{ id: string }>();
  const resolvedOrgId = orgRow?.id || organizationId;

  await db
    .prepare(
      `INSERT OR IGNORE INTO organization_members (organization_id, user_id, role, created_at)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(resolvedOrgId, resolvedUserId, role, now)
    .run();

  await db
    .prepare(
      `INSERT INTO sessions (id, user_id, organization_id, token_hash, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(sessionId, resolvedUserId, resolvedOrgId, sessionHash, isoDaysFromNow(30), now)
    .run();

  return { email, organizationId: resolvedOrgId, sessionToken };
}
