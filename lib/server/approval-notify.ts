// Closes GAP #7 — approval queue notification path.
// When `agent_approval.requested` fires, this handler emails the org's owner
// (and any admin emails configured via ADGA_ADMIN_EMAILS) with a deep link
// to the approval. Failures are swallowed and logged via the bus's existing
// retry/dead-letter mechanism — they never block the request that created
// the approval.

import { sendPostmarkEmail } from "@/lib/integrations/postmark";
import { OWNER_EMAIL } from "@/lib/server/tenant";

interface ApprovalRequestedPayload {
  approval_id?: string;
  agent?: string;
  title?: string;
  risk?: "low" | "medium" | "high";
}

interface ApprovalNotifyInput {
  env: CloudflareEnv;
  organizationId: string;
  payload: ApprovalRequestedPayload;
}

function adminEmails(env: CloudflareEnv): string[] {
  const list = (env.ADGA_ADMIN_EMAILS || OWNER_EMAIL)
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!list.includes(OWNER_EMAIL)) list.unshift(OWNER_EMAIL);
  return Array.from(new Set(list));
}

async function loadOrgOwners(
  db: D1Database | undefined,
  organizationId: string,
): Promise<string[]> {
  if (!db) return [];
  const result = await db
    .prepare(
      `SELECT u.email
         FROM organization_members om
         JOIN users u ON u.id = om.user_id
        WHERE om.organization_id = ?
          AND om.role IN ('owner','admin')`,
    )
    .bind(organizationId)
    .all<{ email: string }>()
    .catch(() => ({ results: [] as { email: string }[] }));
  return (result.results || []).map((row) => row.email).filter(Boolean);
}

function bodyHtml(payload: ApprovalRequestedPayload, link: string) {
  const title = payload.title || "Pending approval";
  const agent = payload.agent || "agent";
  const risk = (payload.risk || "medium").toUpperCase();
  return `<!doctype html>
<html><body style="margin:0;background:#f6f3fb;font-family:Inter,Arial,sans-serif;color:#18151f;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f3fb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e8e0f4;border-radius:20px;overflow:hidden;">
        <tr><td style="padding:28px 30px 18px;border-bottom:1px solid #eee7f7;">
          <div style="font-size:26px;font-weight:800;letter-spacing:-0.02em;color:#5b21b6;">ADGA</div>
          <div style="margin-top:10px;font-size:13px;color:#6f687c;">Approval needed · risk ${risk}</div>
        </td></tr>
        <tr><td style="padding:30px;">
          <h1 style="margin:0 0 12px;font-size:22px;line-height:1.2;letter-spacing:-0.02em;">${title}</h1>
          <p style="margin:0 0 22px;font-size:15px;line-height:1.55;color:#4f485d;">
            ${agent} has prepared an action that needs your approval before it can run.
          </p>
          <a href="${link}" style="display:inline-block;background:#5b21b6;color:#ffffff;text-decoration:none;border-radius:12px;padding:13px 18px;font-size:14px;font-weight:700;">Review approval</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function notifyApprovalRequested(
  db: D1Database | undefined,
  input: ApprovalNotifyInput,
): Promise<{ ok: boolean; sent: number; skipped?: boolean; reason?: string }> {
  const { env, organizationId, payload } = input;
  const link = `https://adga.ai/suite/admin/audit?approval_id=${encodeURIComponent(payload.approval_id || "")}`;

  // Owners of the org from D1 + statically configured admins from env.
  const dbOwners = await loadOrgOwners(db, organizationId);
  const envAdmins = adminEmails(env);
  const recipients = Array.from(new Set([...dbOwners, ...envAdmins]));

  if (recipients.length === 0) {
    return { ok: true, sent: 0, skipped: true, reason: "no recipients resolved" };
  }

  let sent = 0;
  for (const email of recipients) {
    const result = await sendPostmarkEmail(
      {
        to: email,
        subject: `Approval needed · ${payload.title || "Pending action"}`,
        htmlBody: bodyHtml(payload, link),
        textBody: `Approval needed.\n\n${payload.title || ""}\n\nReview: ${link}`,
      },
      env,
    ).catch(() => ({ ok: false }));
    if ("ok" in result && result.ok) sent += 1;
  }
  return { ok: sent > 0, sent };
}
