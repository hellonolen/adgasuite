import { errorJson, json, readJson } from "@/lib/server/http";
import { sendPostmarkEmail } from "@/lib/integrations/postmark";
import { createEvent } from "@/lib/server/repository";
import { getRuntimeContext } from "@/lib/server/runtime";
import { newId, nowIso } from "@/lib/server/id";

type AdpLeadBody = {
  full_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  company_size?: string;
  state?: string;
  payroll_timing?: string;
  current_payroll_provider?: string;
  needs?: string[];
  notes?: string;
  consent_to_contact?: boolean;
  source_path?: string;
};

function escapeHtml(value: unknown) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  const body = await readJson<AdpLeadBody>(request);

  if (!body.full_name || !body.email) return errorJson("full_name and email are required.");

  const timestamp = nowIso();
  const leadId = newId("adp");
  const deliveryId = newId("eml");
  const needs = Array.isArray(body.needs) ? body.needs.filter(Boolean) : [];
  const toEmail =
    context.env.ADP_REFERRAL_TO_EMAIL ||
    context.env.ADGA_ADMIN_EMAIL ||
    "hellonolen@gmail.com";

  const lead = {
    id: leadId,
    organization_id: "org_adga_primary",
    partner_slug: "adp",
    partner_name: "ADP",
    full_name: body.full_name,
    email: body.email,
    phone: body.phone || null,
    company: body.company || null,
    job_title: body.job_title || null,
    company_size: body.company_size || null,
    state: body.state || null,
    payroll_timing: body.payroll_timing || null,
    current_payroll_provider: body.current_payroll_provider || null,
    needs_json: JSON.stringify(needs),
    notes: body.notes || null,
    consent_to_contact: body.consent_to_contact ? 1 : 0,
    source_path: body.source_path || "/adp",
    user_agent: request.headers.get("user-agent") || null,
    status: "new",
    email_sent_count: 0,
    last_email_sent_at: null as string | null,
    created_at: timestamp,
    updated_at: timestamp,
  };

  const htmlBody = `
    <h2>New ADP payroll lead</h2>
    <p><strong>Submitted:</strong> ${escapeHtml(timestamp)}</p>
    <p><strong>Name:</strong> ${escapeHtml(lead.full_name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(lead.email)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(lead.phone || "Not provided")}</p>
    <p><strong>Company:</strong> ${escapeHtml(lead.company || "Not provided")}</p>
    <p><strong>Role:</strong> ${escapeHtml(lead.job_title || "Not provided")}</p>
    <p><strong>Company size:</strong> ${escapeHtml(lead.company_size || "Not provided")}</p>
    <p><strong>State:</strong> ${escapeHtml(lead.state || "Not provided")}</p>
    <p><strong>Payroll timing:</strong> ${escapeHtml(lead.payroll_timing || "Not provided")}</p>
    <p><strong>Current provider:</strong> ${escapeHtml(lead.current_payroll_provider || "Not provided")}</p>
    <p><strong>Needs:</strong> ${escapeHtml(needs.join(", ") || "Payroll setup")}</p>
    <p><strong>Notes:</strong><br/>${escapeHtml(lead.notes || "None")}</p>
    <p><strong>Consent to contact:</strong> ${lead.consent_to_contact ? "Yes" : "No"}</p>
  `;

  let emailResult: Awaited<ReturnType<typeof sendPostmarkEmail>> = {
    ok: false,
    skipped: true,
    reason: "Email not attempted.",
  };

  if (lead.consent_to_contact) {
    emailResult = await sendPostmarkEmail(
      {
        to: toEmail,
        subject: `ADP payroll lead: ${lead.full_name}`,
        htmlBody,
        textBody: [
          "New ADP payroll lead",
          `Submitted: ${timestamp}`,
          `Name: ${lead.full_name}`,
          `Email: ${lead.email}`,
          `Phone: ${lead.phone || "Not provided"}`,
          `Company: ${lead.company || "Not provided"}`,
          `Company size: ${lead.company_size || "Not provided"}`,
          `State: ${lead.state || "Not provided"}`,
          `Payroll timing: ${lead.payroll_timing || "Not provided"}`,
          `Current provider: ${lead.current_payroll_provider || "Not provided"}`,
          `Needs: ${needs.join(", ") || "Payroll setup"}`,
          `Notes: ${lead.notes || "None"}`,
        ].join("\n"),
      },
      context.env,
    );
  }

  const emailSent = Boolean(emailResult.ok);
  lead.email_sent_count = emailSent ? 1 : 0;
  lead.last_email_sent_at = emailSent ? timestamp : null;

  if (context.env.DB) {
    try {
      await context.env.DB.prepare(
        `INSERT INTO partner_referral_leads
          (id, organization_id, partner_slug, partner_name, full_name, email, phone, company, job_title, company_size, state,
           payroll_timing, current_payroll_provider, needs_json, notes, consent_to_contact, source_path, user_agent, status,
           email_sent_count, last_email_sent_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          lead.id, lead.organization_id, lead.partner_slug, lead.partner_name, lead.full_name, lead.email,
          lead.phone, lead.company, lead.job_title, lead.company_size, lead.state, lead.payroll_timing,
          lead.current_payroll_provider, lead.needs_json, lead.notes, lead.consent_to_contact, lead.source_path,
          lead.user_agent, lead.status, lead.email_sent_count, lead.last_email_sent_at, lead.created_at, lead.updated_at,
        )
        .run();

      await context.env.DB.prepare(
        `INSERT INTO partner_referral_email_deliveries
          (id, organization_id, referral_lead_id, partner_slug, to_email, provider, status, provider_status, provider_response, sent_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          deliveryId, lead.organization_id, lead.id, lead.partner_slug, toEmail, "postmark",
          emailSent ? "sent" : "skipped_or_failed",
          "status" in emailResult ? emailResult.status || null : null,
          "body" in emailResult ? emailResult.body || null : JSON.stringify(emailResult),
          emailSent ? timestamp : null,
          timestamp,
          timestamp,
        )
        .run();
    } catch {}
  }

  await createEvent(context.env.DB, {
    organization_id: lead.organization_id,
    event_type: emailSent ? "partner_referral.email_sent" : "partner_referral.created",
    actor_type: "system",
    actor_id: "adp-page",
    resource_type: "partner_referral_lead",
    resource_id: lead.id,
    payload: { lead, email: { to: toEmail, result: emailResult } },
  });

  return json({ ok: true, lead: { ...lead, needs }, email: { sent: emailSent, to: toEmail } });
}
