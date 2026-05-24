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

const ADP_AFFILIATE_CODE = "PW56143";
const ADP_REFERRAL_LINK = "https://info.adp.com/referral-hub?loid=&adp_pc=PW56143";

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  if (!context.env.DB) return json({ ok: true, leads: [], reason: "no-db" });

  try {
    const result = await context.env.DB.prepare(
      `SELECT
         l.id, l.partner_slug, l.partner_name, l.full_name, l.email, l.phone, l.company, l.job_title,
         l.affiliate_code, l.affiliate_url, l.company_size, l.state, l.payroll_timing, l.current_payroll_provider, l.needs_json, l.notes,
         l.consent_to_contact, l.source_path, l.status, l.email_sent_count, l.last_email_sent_at,
         l.created_at, l.updated_at,
         d.to_email AS last_to_email,
         d.status AS last_delivery_status,
         d.sent_at AS last_delivery_sent_at
       FROM partner_referral_leads l
       LEFT JOIN partner_referral_email_deliveries d
         ON d.id = (
           SELECT id
           FROM partner_referral_email_deliveries
           WHERE referral_lead_id = l.id
           ORDER BY created_at DESC
           LIMIT 1
         )
       WHERE l.organization_id = ? AND l.partner_slug = ?
       ORDER BY l.created_at DESC
       LIMIT 250`,
    )
      .bind("org_adga_primary", "adp")
      .all();

    const leads = (result.results || []).map((lead: Record<string, unknown>) => ({
      ...lead,
      needs: JSON.parse(String(lead.needs_json || "[]")),
    }));

    return json({ ok: true, leads });
  } catch (error) {
    return json({ ok: true, leads: [], reason: "query-failed", error: String(error) });
  }
}

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
  const origin = new URL(request.url).origin;

  if (!body.full_name || !body.email) return errorJson("full_name and email are required.");
  if (!body.consent_to_contact) return errorJson("consent_to_contact is required before routing to ADP.", 400);

  const timestamp = nowIso();
  const leadId = newId("adp");
  const deliveryId = newId("eml");
  const needs = Array.isArray(body.needs) ? body.needs.filter(Boolean) : [];
  const toEmail =
    context.env.ADP_REFERRAL_TO_EMAIL ||
    context.env.ADGA_ADMIN_EMAIL ||
    "matt.ganton@adp.com";

  const lead = {
    id: leadId,
    organization_id: "org_adga_primary",
    partner_slug: "adp",
    partner_name: "ADP",
    affiliate_code: ADP_AFFILIATE_CODE,
    affiliate_url: ADP_REFERRAL_LINK,
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

  const trackingPixelUrl = `${origin}/api/partners/adp/email-open?lead=${encodeURIComponent(lead.id)}&partner=${encodeURIComponent(ADP_AFFILIATE_CODE)}`;
  const htmlBody = `
    <h2>New ADP affiliate payroll referral</h2>
    <p><strong>ADGA PIC code:</strong> ${ADP_AFFILIATE_CODE}</p>
    <p><strong>ADP contact:</strong> Matthew Ganton &lt;matt.ganton@adp.com&gt;</p>
    <p><strong>Referral hub:</strong> ${ADP_REFERRAL_LINK.replace(/&/g, "&amp;")}</p>
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
    <img src="${trackingPixelUrl.replace(/&/g, "&amp;")}" width="1" height="1" alt="" style="display:none;border:0;height:1px;width:1px;" />
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
        subject: `ADP affiliate payroll referral ${ADP_AFFILIATE_CODE}: ${lead.full_name}`,
        htmlBody,
        textBody: [
          "New ADP affiliate payroll referral",
          `ADGA PIC code: ${ADP_AFFILIATE_CODE}`,
          "ADP contact: Matthew Ganton <matt.ganton@adp.com>",
          `Referral hub: ${ADP_REFERRAL_LINK}`,
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
          (id, organization_id, partner_slug, partner_name, affiliate_code, affiliate_url, full_name, email, phone, company, job_title, company_size, state,
           payroll_timing, current_payroll_provider, needs_json, notes, consent_to_contact, source_path, user_agent, status,
           email_sent_count, last_email_sent_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          lead.id, lead.organization_id, lead.partner_slug, lead.partner_name, lead.affiliate_code, lead.affiliate_url, lead.full_name, lead.email,
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

  if (!emailSent) {
    return errorJson("Postmark did not send the ADP notification email.", 502, {
      lead: { ...lead, needs },
      email: { sent: false, to: toEmail, result: emailResult },
    });
  }

  return json({ ok: true, lead: { ...lead, needs }, email: { sent: emailSent, to: toEmail } });
}
