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

  const needs = Array.isArray(body.needs) ? body.needs.filter(Boolean) : [];

  if (
    !body.full_name ||
    !body.email ||
    !body.phone ||
    !body.company ||
    !body.job_title ||
    !body.payroll_timing ||
    !needs.length ||
    !body.notes
  ) {
    return errorJson(
      "full_name, email, phone, company, job_title, payroll_timing, needs, and notes are required before routing to ADP.",
      400,
    );
  }
  if (!body.consent_to_contact) return errorJson("consent_to_contact is required before routing to ADP.", 400);
  if (!context.env.DB) return errorJson("Lead database is not configured. ADP routing was not attempted.", 503);

  const timestamp = nowIso();
  const leadId = newId("adp");
  const deliveryId = newId("eml");
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
  const needsHtml = needs
    .map((need) => `<span style="display:inline-block;margin:0 6px 6px 0;padding:7px 10px;border-radius:999px;background:#eef7f1;color:#176339;font-size:12px;font-weight:700;">${escapeHtml(need)}</span>`)
    .join("");
  const htmlBody = `<!doctype html>
<html>
  <body style="margin:0;background:#f5f6f4;font-family:Arial,Helvetica,sans-serif;color:#171a1f;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f6f4;padding:28px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:1px solid #e3e6df;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:26px 30px;background:#15221a;color:#ffffff;">
                <div style="font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#9be7b4;">ADGA affiliate referral</div>
                <h1 style="margin:10px 0 0;font-size:28px;line-height:1.15;font-weight:800;">New payroll conversation ready for follow-up</h1>
                <p style="margin:10px 0 0;color:#dce9de;font-size:14px;">Lead saved in ADGA before this notification was sent.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 30px 10px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:0 0 14px;">
                      <div style="font-size:12px;color:#6f756d;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Primary contact</div>
                      <div style="margin-top:6px;font-size:24px;line-height:1.2;font-weight:800;color:#171a1f;">${escapeHtml(lead.full_name)}</div>
                      <div style="margin-top:4px;font-size:14px;color:#4f574f;">${escapeHtml(lead.job_title || "Position not provided")} at ${escapeHtml(lead.company)}</div>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px;border-collapse:separate;border-spacing:0 10px;">
                  <tr>
                    <td style="width:50%;padding:14px;border:1px solid #e6e9e3;border-radius:12px;background:#fafbf8;">
                      <div style="font-size:11px;color:#7a8178;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">Email</div>
                      <div style="margin-top:5px;font-size:15px;font-weight:700;color:#171a1f;">${escapeHtml(lead.email)}</div>
                    </td>
                    <td style="width:12px;"></td>
                    <td style="width:50%;padding:14px;border:1px solid #e6e9e3;border-radius:12px;background:#fafbf8;">
                      <div style="font-size:11px;color:#7a8178;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">Phone</div>
                      <div style="margin-top:5px;font-size:15px;font-weight:700;color:#171a1f;">${escapeHtml(lead.phone)}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="width:50%;padding:14px;border:1px solid #e6e9e3;border-radius:12px;background:#fafbf8;">
                      <div style="font-size:11px;color:#7a8178;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">Company size</div>
                      <div style="margin-top:5px;font-size:15px;font-weight:700;color:#171a1f;">${escapeHtml(lead.company_size || "Not provided")}</div>
                    </td>
                    <td style="width:12px;"></td>
                    <td style="width:50%;padding:14px;border:1px solid #e6e9e3;border-radius:12px;background:#fafbf8;">
                      <div style="font-size:11px;color:#7a8178;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">State</div>
                      <div style="margin-top:5px;font-size:15px;font-weight:700;color:#171a1f;">${escapeHtml(lead.state || "Not provided")}</div>
                    </td>
                  </tr>
                </table>

                <div style="margin-top:18px;padding:18px;border:1px solid #dce7dd;border-radius:14px;background:#f3faf5;">
                  <div style="font-size:12px;color:#176339;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">What they are looking for</div>
                  <div style="margin-top:10px;">${needsHtml}</div>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:12px;">
                    <tr>
                      <td style="padding:10px 0;border-top:1px solid #dce7dd;">
                        <div style="font-size:12px;color:#586157;font-weight:800;">Timing</div>
                        <div style="margin-top:4px;font-size:15px;color:#171a1f;">${escapeHtml(lead.payroll_timing)}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0;border-top:1px solid #dce7dd;">
                        <div style="font-size:12px;color:#586157;font-weight:800;">Current provider</div>
                        <div style="margin-top:4px;font-size:15px;color:#171a1f;">${escapeHtml(lead.current_payroll_provider || "Not provided")}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0 0;border-top:1px solid #dce7dd;">
                        <div style="font-size:12px;color:#586157;font-weight:800;">Purpose and conversation context</div>
                        <div style="margin-top:6px;font-size:15px;line-height:1.55;color:#171a1f;">${escapeHtml(lead.notes)}</div>
                      </td>
                    </tr>
                  </table>
                </div>

                <div style="margin-top:18px;padding:16px;border-radius:12px;background:#f8f4ea;border:1px solid #eadfca;">
                  <div style="font-size:12px;color:#7b5b13;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">Referral details</div>
                  <p style="margin:8px 0 0;font-size:14px;color:#332b1c;"><strong>ADGA PIC code:</strong> ${ADP_AFFILIATE_CODE}</p>
                  <p style="margin:5px 0 0;font-size:14px;color:#332b1c;"><strong>Referral hub:</strong> ${ADP_REFERRAL_LINK.replace(/&/g, "&amp;")}</p>
                  <p style="margin:5px 0 0;font-size:14px;color:#332b1c;"><strong>Submitted:</strong> ${escapeHtml(timestamp)}</p>
                  <p style="margin:5px 0 0;font-size:14px;color:#332b1c;"><strong>Consent to contact:</strong> Yes</p>
                </div>

                <p style="margin:18px 0 0;font-size:12px;line-height:1.45;color:#747a73;">This notification is sent only after ADGA stores the lead record with full contact information and consent.</p>
              </td>
            </tr>
          </table>
          <img src="${trackingPixelUrl.replace(/&/g, "&amp;")}" width="1" height="1" alt="" style="display:none;border:0;height:1px;width:1px;" />
        </td>
      </tr>
    </table>
  </body>
</html>`;

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
  } catch (error) {
    return errorJson("Lead could not be saved. ADP routing was not attempted.", 502, { error: String(error) });
  }

  const emailResult = await sendPostmarkEmail(
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
        `Phone: ${lead.phone}`,
        `Company: ${lead.company}`,
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

  const emailSent = Boolean(emailResult.ok);
  lead.email_sent_count = emailSent ? 1 : 0;
  lead.last_email_sent_at = emailSent ? timestamp : null;

  try {
    await context.env.DB.prepare(
      `UPDATE partner_referral_leads
       SET email_sent_count = ?, last_email_sent_at = ?, updated_at = ?
       WHERE id = ? AND organization_id = ?`,
    )
      .bind(lead.email_sent_count, lead.last_email_sent_at, timestamp, lead.id, lead.organization_id)
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
