// Conductor handler: skills/workspace-activation.skill.md
//
// Triggered by the `subscription.activated` event. Idempotently turns a paid
// checkout into a ready-to-use workspace: org + user + session + starter
// dealflow + welcome email + `workspace.activated` telemetry.

import { provisionUserSession } from "@/lib/server/auth-provision";
import { publish } from "@/lib/events/bus";
import { sendPostmarkEmail } from "@/lib/integrations/postmark";
import { OWNER_EMAIL, orgIdForEmail, orgNameForEmail, orgSlugForEmail } from "@/lib/server/tenant";
import { nowIso, newId } from "@/lib/server/id";
import { normalizePlan } from "@/lib/plans";
import { callSkill, type SkillContext } from "@/lib/agents/skill-registry";

export interface WorkspaceActivationInput {
  email: string;
  plan?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  cadence?: "month" | "year";
  /** When provided, becomes the organization_id; otherwise derived from email. */
  organization_id?: string | null;
}

export interface WorkspaceActivationOutput {
  organization_id: string;
  email: string;
  plan: string;
  session_token: string;
  starter_dealflow_id: string | null;
  welcome_email_sent: boolean;
  autonomy_mode: "hands_off";
  activated_at: string;
}

const WELCOME_AUTONOMY: WorkspaceActivationOutput["autonomy_mode"] = "hands_off";

function welcomeEmailHtml(magicLink: string, plan: string) {
  return `<!doctype html>
<html><body style="margin:0;background:#f6f3fb;font-family:Inter,Arial,sans-serif;color:#18151f;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f3fb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e8e0f4;border-radius:20px;overflow:hidden;">
        <tr><td style="padding:28px 30px 18px;border-bottom:1px solid #eee7f7;">
          <div style="font-size:26px;font-weight:800;letter-spacing:-0.02em;color:#5b21b6;">ADGA</div>
          <div style="margin-top:10px;font-size:13px;color:#6f687c;">Welcome aboard · ${plan} plan</div>
        </td></tr>
        <tr><td style="padding:30px;">
          <h1 style="margin:0 0 12px;font-size:26px;line-height:1.15;letter-spacing:-0.02em;">Your ADGA workspace is live.</h1>
          <p style="margin:0 0 22px;font-size:15px;line-height:1.55;color:#4f485d;">Sign in to start working your first deal. Your workspace is pre-seeded so you land on a populated canvas, not an empty page.</p>
          <a href="${magicLink}" style="display:inline-block;background:#5b21b6;color:#ffffff;text-decoration:none;border-radius:12px;padding:13px 18px;font-size:14px;font-weight:700;">Sign in to ADGA</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function ensureSubscriptionRow(
  env: CloudflareEnv,
  organizationId: string,
  input: WorkspaceActivationInput,
  plan: string,
  now: string,
) {
  if (!env.DB) return;
  const id = input.stripe_subscription_id
    ? `stripe_${input.stripe_subscription_id}`
    : input.stripe_customer_id
      ? `stripe_${input.stripe_customer_id}`
      : `stripe_${newId("activation")}`;
  await env.DB
    .prepare(
      `INSERT INTO subscriptions
         (id, organization_id, provider, provider_customer_id, provider_subscription_id,
          status, plan, current_period_end, created_at, updated_at)
       VALUES (?, ?, 'stripe', ?, ?, 'active', ?, NULL, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         organization_id = excluded.organization_id,
         provider_customer_id = COALESCE(excluded.provider_customer_id, provider_customer_id),
         provider_subscription_id = COALESCE(excluded.provider_subscription_id, provider_subscription_id),
         status = 'active',
         plan = excluded.plan,
         updated_at = excluded.updated_at`,
    )
    .bind(
      id,
      organizationId,
      input.stripe_customer_id || null,
      input.stripe_subscription_id || null,
      plan,
      now,
      now,
    )
    .run();
}

async function ensureOrganization(
  env: CloudflareEnv,
  organizationId: string,
  email: string,
  plan: string,
  now: string,
) {
  if (!env.DB) return;
  await env.DB
    .prepare(
      `INSERT OR IGNORE INTO organizations (id, name, slug, plan, subscription_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(organizationId, orgNameForEmail(email), orgSlugForEmail(email), plan, "active", now, now)
    .run();
  await env.DB
    .prepare(
      `UPDATE organizations SET plan = ?, subscription_status = 'active', updated_at = ? WHERE id = ?`,
    )
    .bind(plan, now, organizationId)
    .run();
}

async function ensureWorkspaceActivationRow(
  env: CloudflareEnv,
  organizationId: string,
  email: string,
  plan: string,
  input: WorkspaceActivationInput,
  now: string,
) {
  if (!env.DB) return;
  await env.DB
    .prepare(
      `CREATE TABLE IF NOT EXISTS workspace_activations (
         organization_id TEXT PRIMARY KEY,
         activated_at TEXT NOT NULL,
         status TEXT NOT NULL,
         plan TEXT NOT NULL,
         stripe_subscription_id TEXT,
         operator_email TEXT NOT NULL,
         autonomy_mode TEXT NOT NULL,
         updated_at TEXT NOT NULL,
         FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
       )`,
    )
    .run();
  await env.DB
    .prepare(
      `INSERT INTO workspace_activations
         (organization_id, activated_at, status, plan, stripe_subscription_id, operator_email, autonomy_mode, updated_at)
       VALUES (?, ?, 'activated', ?, ?, ?, ?, ?)
       ON CONFLICT(organization_id) DO UPDATE SET
         status = 'activated',
         plan = excluded.plan,
         stripe_subscription_id = COALESCE(excluded.stripe_subscription_id, stripe_subscription_id),
         operator_email = excluded.operator_email,
         autonomy_mode = excluded.autonomy_mode,
         updated_at = excluded.updated_at`,
    )
    .bind(organizationId, now, plan, input.stripe_subscription_id || null, email, WELCOME_AUTONOMY, now)
    .run();
}

export async function workspaceActivation(
  context: SkillContext,
  input: WorkspaceActivationInput,
): Promise<WorkspaceActivationOutput> {
  const email = (input.email || "").trim().toLowerCase();
  if (!email) throw new Error("workspace-activation requires `email`.");
  if (!context.env.DB) throw new Error("workspace-activation requires D1.");

  const plan = normalizePlan(input.plan || "team");
  const organizationId = input.organization_id || orgIdForEmail(email) || context.organization_id;
  const now = nowIso();

  // Step 1-3: org row → subscription row → user + session
  await ensureOrganization(context.env, organizationId, email, plan, now);
  await ensureSubscriptionRow(context.env, organizationId, input, plan, now);
  const session = await provisionUserSession(context.env.DB, {
    email,
    plan,
    subscriptionStatus: "active",
  });

  // Step 4: workspace_activations row
  await ensureWorkspaceActivationRow(context.env, organizationId, email, plan, input, now);

  // Step 5: starter dealflow via the materialization skill (agent-to-agent through registry)
  const seedResult = await callSkill<{ organization_id: string; template_id: string; name: string; actor_email: string }, { map_id: string }>(
    { ...context, calling_skill: "workspace-activation" },
    "dealflow-template-materialization",
    {
      organization_id: organizationId,
      template_id: "starter",
      name: "Your first deal",
      actor_email: email,
    },
  );
  const starterDealflowId = seedResult.ok ? seedResult.data?.map_id || null : null;

  // Step 6: welcome magic link
  const magicLink = `https://adga.ai/auth/verify?token=${encodeURIComponent(session.sessionToken)}`;
  const emailResult = await sendPostmarkEmail(
    {
      to: email,
      subject: "Your ADGA workspace is live",
      htmlBody: welcomeEmailHtml(magicLink, plan),
      textBody: `Welcome to ADGA. Sign in: ${magicLink}\n\nYour workspace is pre-seeded with a starter deal so you land on a populated canvas.`,
    },
    context.env,
  ).catch(() => ({ ok: false }));
  const welcomeSent = "ok" in emailResult && Boolean(emailResult.ok);

  // Step 7: emit workspace.activated for downstream agents (Intelligence MRR rollup, Sales nurture)
  await publish(context.env.DB, {
    organization_id: organizationId,
    event_type: "workspace.activated",
    actor_type: context.actor_type,
    actor_id: context.actor_id || email,
    resource_type: "organization",
    resource_id: organizationId,
    payload: {
      email,
      plan,
      activated_at: now,
      autonomy_mode: WELCOME_AUTONOMY,
    },
  }).catch(() => null);

  return {
    organization_id: organizationId,
    email,
    plan,
    session_token: session.sessionToken,
    starter_dealflow_id: starterDealflowId,
    welcome_email_sent: welcomeSent,
    autonomy_mode: WELCOME_AUTONOMY,
    activated_at: now,
  };
}
