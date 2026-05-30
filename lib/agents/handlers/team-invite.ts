// Sales handler: skills/team-invite.skill.md
//
// Replaces the SQL-only path for adding teammates. Two paths in one module:
//   - team-invite (send)    : creates the invite row + emails the invitee
//   - team-invite.accept    : verifies token + joins the inviter's org
//
// Both are registered as separate skill ids so the bus audit + callSkill
// signatures are clean.

import { publish } from "@/lib/events/bus";
import { sendPostmarkEmail } from "@/lib/integrations/postmark";
import { provisionUserSession } from "@/lib/server/auth-provision";
import { newId, nowIso } from "@/lib/server/id";
import { randomToken, sha256 } from "@/lib/server/magic-auth";
import type { SkillContext } from "@/lib/agents/skill-registry";

const INVITE_TTL_DAYS = 14;

export interface TeamInviteSendInput {
  organization_id: string;
  inviter_user_id: string;
  inviter_email: string;
  invitee_email: string;
  invitee_role: "admin" | "member";
  message?: string | null;
}

export interface TeamInviteSendOutput {
  invite_id: string;
  status: "pending" | "pending_email_retry";
  expires_at: string;
  email_sent: boolean;
}

export interface TeamInviteAcceptInput {
  token: string;
}

export interface TeamInviteAcceptOutput {
  ok: boolean;
  organization_id: string;
  user_id: string;
  session_token: string;
  invite_id: string;
  invitee_email: string;
}

async function ensureInviteTable(env: CloudflareEnv): Promise<void> {
  if (!env.DB) return;
  await env.DB
    .prepare(
      `CREATE TABLE IF NOT EXISTS team_invites (
         id TEXT PRIMARY KEY,
         organization_id TEXT NOT NULL,
         inviter_user_id TEXT NOT NULL,
         invitee_email TEXT NOT NULL,
         invitee_role TEXT NOT NULL,
         token_hash TEXT NOT NULL UNIQUE,
         status TEXT NOT NULL,
         expires_at TEXT NOT NULL,
         accepted_at TEXT,
         revoked_at TEXT,
         archived_at TEXT,
         created_at TEXT NOT NULL,
         accepted_user_id TEXT,
         metadata_json TEXT NOT NULL DEFAULT '{}',
         FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
       )`,
    )
    .run();
}

function inviteEmailHtml(invitationLink: string, inviterEmail: string, role: string, message: string | null) {
  return `<!doctype html>
<html><body style="margin:0;background:#f6f3fb;font-family:Inter,Arial,sans-serif;color:#18151f;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f3fb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e8e0f4;border-radius:20px;overflow:hidden;">
        <tr><td style="padding:28px 30px 18px;border-bottom:1px solid #eee7f7;">
          <div style="font-size:26px;font-weight:800;letter-spacing:-0.02em;color:#5b21b6;">ADGA</div>
          <div style="margin-top:10px;font-size:13px;color:#6f687c;">You've been invited to a workspace</div>
        </td></tr>
        <tr><td style="padding:30px;">
          <h1 style="margin:0 0 12px;font-size:24px;line-height:1.18;letter-spacing:-0.02em;">${escapeHtml(inviterEmail)} invited you to ADGA.</h1>
          <p style="margin:0 0 22px;font-size:15px;line-height:1.55;color:#4f485d;">Role: <strong>${escapeHtml(role)}</strong>. This link is single-use and expires in ${INVITE_TTL_DAYS} days.</p>
          ${message ? `<p style="margin:0 0 22px;font-size:14px;line-height:1.55;color:#4f485d;border-left:3px solid #e8e0f4;padding:8px 12px;">${escapeHtml(message)}</p>` : ""}
          <a href="${invitationLink}" style="display:inline-block;background:#5b21b6;color:#ffffff;text-decoration:none;border-radius:12px;padding:13px 18px;font-size:14px;font-weight:700;">Accept invite</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function teamInviteSend(
  context: SkillContext,
  input: TeamInviteSendInput,
): Promise<TeamInviteSendOutput> {
  if (!context.env.DB) throw new Error("team-invite requires D1.");
  if (input.invitee_role !== "admin" && input.invitee_role !== "member") {
    throw new Error("invitee_role must be 'admin' or 'member'.");
  }
  const email = (input.invitee_email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) throw new Error("invitee_email is invalid.");

  await ensureInviteTable(context.env);

  const inviteId = newId("inv");
  const token = randomToken(32);
  const tokenHash = await sha256(token);
  const now = nowIso();
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000).toISOString();
  const metadata = JSON.stringify({
    source: "ui",
    inviter_email: input.inviter_email,
    message: input.message || null,
  });

  await context.env.DB
    .prepare(
      `INSERT INTO team_invites
         (id, organization_id, inviter_user_id, invitee_email, invitee_role,
          token_hash, status, expires_at, created_at, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    )
    .bind(
      inviteId,
      input.organization_id,
      input.inviter_user_id,
      email,
      input.invitee_role,
      tokenHash,
      expiresAt,
      now,
      metadata,
    )
    .run();

  const acceptLink = `https://adga.ai/auth/accept-invite?token=${encodeURIComponent(token)}`;
  const sendResult = await sendPostmarkEmail(
    {
      to: email,
      subject: `${input.inviter_email} invited you to ADGA`,
      htmlBody: inviteEmailHtml(acceptLink, input.inviter_email, input.invitee_role, input.message || null),
      textBody: `${input.inviter_email} invited you to join their ADGA workspace as ${input.invitee_role}. Accept: ${acceptLink}\n\nThis link expires in ${INVITE_TTL_DAYS} days.`,
    },
    context.env,
  ).catch(() => ({ ok: false }));
  const emailSent = "ok" in sendResult && Boolean(sendResult.ok);

  if (!emailSent) {
    await context.env.DB
      .prepare(`UPDATE team_invites SET status = 'pending_email_retry' WHERE id = ?`)
      .bind(inviteId)
      .run()
      .catch(() => null);
  }

  await publish(context.env.DB, {
    organization_id: input.organization_id,
    event_type: "team.invite.sent",
    actor_type: context.actor_type,
    actor_id: context.actor_id || input.inviter_email,
    resource_type: "team_invite",
    resource_id: inviteId,
    payload: { invite_id: inviteId, invitee_email: email, invitee_role: input.invitee_role, expires_at: expiresAt },
  }).catch(() => null);

  return {
    invite_id: inviteId,
    status: emailSent ? "pending" : "pending_email_retry",
    expires_at: expiresAt,
    email_sent: emailSent,
  };
}

export async function teamInviteAccept(
  context: SkillContext,
  input: TeamInviteAcceptInput,
): Promise<TeamInviteAcceptOutput> {
  if (!context.env.DB) throw new Error("team-invite.accept requires D1.");
  if (!input.token) throw new Error("token required.");

  await ensureInviteTable(context.env);

  const tokenHash = await sha256(input.token);
  const invite = await context.env.DB
    .prepare(
      `SELECT id, organization_id, inviter_user_id, invitee_email, invitee_role,
              status, expires_at, accepted_at, revoked_at
         FROM team_invites
        WHERE token_hash = ?`,
    )
    .bind(tokenHash)
    .first<{
      id: string;
      organization_id: string;
      inviter_user_id: string;
      invitee_email: string;
      invitee_role: "admin" | "member";
      status: string;
      expires_at: string;
      accepted_at: string | null;
      revoked_at: string | null;
    }>()
    .catch(() => null);

  if (!invite) throw new Error("Invite not found.");
  if (invite.revoked_at) throw new Error("This invite has been revoked.");
  if (invite.accepted_at) throw new Error("This invite has already been accepted.");
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    await context.env.DB
      .prepare(`UPDATE team_invites SET status = 'expired' WHERE id = ?`)
      .bind(invite.id)
      .run()
      .catch(() => null);
    await publish(context.env.DB, {
      organization_id: invite.organization_id,
      event_type: "team.invite.expired",
      actor_type: context.actor_type,
      actor_id: context.actor_id,
      resource_type: "team_invite",
      resource_id: invite.id,
      payload: { invite_id: invite.id, invitee_email: invite.invitee_email },
    }).catch(() => null);
    throw new Error("This invite has expired.");
  }

  // Provision the user under the inviter's org (NOT their own personal org).
  // provisionUserSession will INSERT OR IGNORE user; we then write the
  // organization_members row so they join THIS org with the granted role.
  const session = await provisionUserSession(context.env.DB, {
    email: invite.invitee_email,
    plan: null,
    subscriptionStatus: null,
  });

  // Look up the real user_id by email since INSERT OR IGNORE may have skipped.
  const userRow = await context.env.DB
    .prepare(`SELECT id FROM users WHERE email = ? LIMIT 1`)
    .bind(invite.invitee_email)
    .first<{ id: string }>()
    .catch(() => null);
  const userId = userRow?.id || invite.invitee_email;

  // Join the org with the invite's role.
  await context.env.DB
    .prepare(
      `INSERT OR IGNORE INTO organization_members (organization_id, user_id, role, created_at)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(invite.organization_id, userId, invite.invitee_role, nowIso())
    .run();

  // Mark invite accepted.
  const now = nowIso();
  await context.env.DB
    .prepare(
      `UPDATE team_invites
          SET status = 'accepted', accepted_at = ?, accepted_user_id = ?
        WHERE id = ?`,
    )
    .bind(now, userId, invite.id)
    .run();

  await publish(context.env.DB, {
    organization_id: invite.organization_id,
    event_type: "team.invite.accepted",
    actor_type: context.actor_type,
    actor_id: context.actor_id || invite.invitee_email,
    resource_type: "team_invite",
    resource_id: invite.id,
    payload: { invite_id: invite.id, invitee_email: invite.invitee_email, user_id: userId },
  }).catch(() => null);

  return {
    ok: true,
    organization_id: invite.organization_id,
    user_id: userId,
    session_token: session.sessionToken,
    invite_id: invite.id,
    invitee_email: invite.invitee_email,
  };
}
