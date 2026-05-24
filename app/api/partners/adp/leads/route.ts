import { errorJson, json, readJson } from "@/lib/server/http";
import { sendPostmarkEmail } from "@/lib/integrations/postmark";
import { createEvent, createStorageObject } from "@/lib/server/repository";
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

type StoredAdpLead = {
  id: string;
  organization_id: string;
  partner_slug: "adp";
  partner_name: "ADP";
  referral_number: string;
  affiliate_code: string;
  affiliate_url: string;
  full_name: string;
  email: string;
  phone: string;
  company: string;
  job_title: string;
  company_size: string | null;
  state: string | null;
  payroll_timing: string;
  current_payroll_provider: string | null;
  needs: string[];
  notes: string;
  consent_to_contact: boolean;
  source_path: string;
  submitted_at: string;
};

const ADP_AFFILIATE_CODE = "PW56143";
const ADP_REFERRAL_LINK = "https://info.adp.com/referral-hub?loid=&adp_pc=PW56143";
const ORGANIZATION_ID = "org_adga_primary";
const REFERRAL_NUMBER_MIN = 438217;
const REFERRAL_NUMBER_MAX = 986742;

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  if (!context.env.DB) return json({ ok: true, leads: [], reason: "no-db" });

  try {
    const result = await context.env.DB.prepare(
      `SELECT
         l.id, l.partner_slug, l.partner_name, l.referral_number, l.lead_data_r2_key, l.storage_object_id,
         l.affiliate_code, l.affiliate_url,
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
      .bind(ORGANIZATION_ID, "adp")
      .all();

    const leads = result.results || [];

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

function randomReferralNumber() {
  const range = REFERRAL_NUMBER_MAX - REFERRAL_NUMBER_MIN + 1;
  const random = Math.floor(Math.random() * range);
  return String(REFERRAL_NUMBER_MIN + random);
}

async function createPartnerReferralNumber(db: D1Database, organizationId: string) {
  const range = REFERRAL_NUMBER_MAX - REFERRAL_NUMBER_MIN + 1;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate =
      attempt < 10
        ? randomReferralNumber()
        : String(REFERRAL_NUMBER_MIN + ((Date.now() + attempt) % range));
    const existing = await db
      .prepare(
        `SELECT id
         FROM partner_referral_leads
         WHERE organization_id = ? AND referral_number = ?
         LIMIT 1`,
      )
      .bind(organizationId, candidate)
      .first<{ id: string }>()
      .catch(() => null);

    if (!existing) return candidate;
  }

  throw new Error("Unable to allocate an ADP partner referral number.");
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function formatValue(value: unknown) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "Not provided";
  if (value === true) return "Yes";
  if (value === false) return "No";
  return String(value || "Not provided");
}

function detailCell(label: string, value: unknown) {
  return `<td style="padding:14px 16px;border:1px solid #e4d8ff;background:#ffffff;border-radius:14px;vertical-align:top;">
    <div style="font-size:10px;line-height:1.2;color:#6e5c90;font-weight:800;text-transform:uppercase;letter-spacing:.12em;">${escapeHtml(label)}</div>
    <div style="margin-top:7px;font-size:15px;line-height:1.45;color:#18151f;font-weight:700;">${escapeHtml(formatValue(value))}</div>
  </td>`;
}

function detailRow(label: string, value: unknown) {
  return `<tr>
    <td style="padding:13px 0;border-bottom:1px solid #ece5ff;vertical-align:top;width:210px;">
      <div style="font-size:11px;line-height:1.2;color:#6e5c90;font-weight:800;text-transform:uppercase;letter-spacing:.1em;">${escapeHtml(label)}</div>
    </td>
    <td style="padding:13px 0 13px 18px;border-bottom:1px solid #ece5ff;vertical-align:top;">
      <div style="font-size:14px;line-height:1.55;color:#18151f;font-weight:650;">${escapeHtml(formatValue(value))}</div>
    </td>
  </tr>`;
}

function needsListHtml(needs: string[]) {
  return needs
    .map(
      (need) =>
        `<span style="display:inline-block;margin:0 7px 7px 0;padding:8px 11px;border-radius:999px;background:#f3edff;border:1px solid #dfd0ff;color:#5b21b6;font-size:12px;line-height:1;font-weight:800;">${escapeHtml(need)}</span>`,
    )
    .join("");
}

function buildAdpLeadEmailHtml(lead: StoredAdpLead, timestamp: string, trackingPixelUrl: string) {
  const detailRows = [
    ["ADGA lead ID", lead.id],
    ["Organization ID", lead.organization_id],
    ["Partner", `${lead.partner_name} (${lead.partner_slug})`],
    ["ADGA partner lead #", lead.referral_number],
    ["ADP affiliate code", lead.affiliate_code],
    ["Affiliate URL", lead.affiliate_url],
    ["Full name", lead.full_name],
    ["Email", lead.email],
    ["Phone", lead.phone],
    ["Company", lead.company],
    ["Position / role", lead.job_title],
    ["Company size", lead.company_size],
    ["State", lead.state],
    ["Payroll timing", lead.payroll_timing],
    ["Current payroll provider", lead.current_payroll_provider],
    ["What they need", lead.needs],
    ["Purpose / conversation context", lead.notes],
    ["Consent to contact", lead.consent_to_contact],
    ["Source path", lead.source_path],
    ["Submitted at", lead.submitted_at],
    ["Notification created at", timestamp],
  ]
    .map(([label, value]) => detailRow(String(label), value))
    .join("");

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f7f3ff;font-family:Inter,Arial,Helvetica,sans-serif;color:#18151f;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f3ff;padding:34px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:760px;background:#ffffff;border:1px solid #e4d8ff;border-radius:22px;overflow:hidden;box-shadow:0 24px 70px rgba(91,33,182,0.14);">
            <tr>
              <td style="padding:30px 36px 26px;background:#fbf9ff;border-bottom:1px solid #ece5ff;color:#18151f;">
                <div style="font-size:11px;line-height:1;color:#5b21b6;font-weight:900;text-transform:uppercase;letter-spacing:.16em;">ADGA partner referral</div>
                <h1 style="margin:14px 0 0;font-size:32px;line-height:1.06;letter-spacing:-.025em;font-weight:900;color:#18151f;">New ADP payroll lead ready for follow-up</h1>
                <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#5f5570;">Lead #${escapeHtml(lead.referral_number)} was stored by ADGA before this notification was sent.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 36px 8px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:0 0 22px;">
                      <div style="font-size:11px;line-height:1;color:#6e5c90;font-weight:900;text-transform:uppercase;letter-spacing:.14em;">Primary contact</div>
                      <div style="margin-top:9px;font-size:28px;line-height:1.15;letter-spacing:-.015em;font-weight:900;color:#18151f;">${escapeHtml(lead.full_name)}</div>
                      <div style="margin-top:7px;font-size:15px;line-height:1.45;color:#5f5570;">${escapeHtml(lead.job_title)} · ${escapeHtml(lead.company)}</div>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0 12px;">
                  <tr>
                    ${detailCell("Email", lead.email)}
                    <td style="width:12px;"></td>
                    ${detailCell("Phone", lead.phone)}
                  </tr>
                  <tr>
                    ${detailCell("Company size", lead.company_size)}
                    <td style="width:12px;"></td>
                    ${detailCell("State", lead.state)}
                  </tr>
                  <tr>
                    ${detailCell("Payroll timing", lead.payroll_timing)}
                    <td style="width:12px;"></td>
                    ${detailCell("Current provider", lead.current_payroll_provider)}
                  </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:10px;background:#faf7ff;border:1px solid #e4d8ff;border-radius:18px;">
                  <tr>
                    <td style="padding:22px;">
                      <div style="font-size:11px;line-height:1;color:#5b21b6;font-weight:900;text-transform:uppercase;letter-spacing:.14em;">What they are looking for</div>
                      <div style="margin-top:13px;">${needsListHtml(lead.needs)}</div>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px;background:#ffffff;border:1px solid #e4d8ff;border-radius:18px;">
                  <tr>
                    <td style="padding:22px;">
                      <div style="font-size:11px;line-height:1;color:#6e5c90;font-weight:900;text-transform:uppercase;letter-spacing:.14em;">Purpose and conversation context</div>
                      <p style="margin:12px 0 0;font-size:16px;line-height:1.62;color:#18151f;">${escapeHtml(lead.notes)}</p>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px;background:#fbf9ff;border:1px solid #e4d8ff;border-radius:18px;">
                  <tr>
                    <td style="padding:22px;">
                      <div style="font-size:11px;line-height:1;color:#5b21b6;font-weight:900;text-transform:uppercase;letter-spacing:.14em;">Referral record</div>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px;border-collapse:collapse;">
                        ${detailRows}
                      </table>
                    </td>
                  </tr>
                </table>

                <p style="margin:18px 0 22px;font-size:12px;line-height:1.5;color:#766b88;">This message contains the full lead details submitted through the ADGA ADP form. No call-to-action links are included in the email body.</p>
              </td>
            </tr>
          </table>
          <img src="${trackingPixelUrl.replace(/&/g, "&amp;")}" width="1" height="1" alt="" style="display:none;border:0;height:1px;width:1px;" />
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildAdpLeadTextBody(lead: StoredAdpLead, timestamp: string) {
  return [
    "New ADP payroll lead ready for follow-up",
    `ADGA lead ID: ${lead.id}`,
    `Organization ID: ${lead.organization_id}`,
    `Partner: ${lead.partner_name} (${lead.partner_slug})`,
    `ADGA partner lead #: ${lead.referral_number}`,
    `ADP affiliate code: ${lead.affiliate_code}`,
    `Affiliate URL: ${lead.affiliate_url}`,
    `Submitted at: ${lead.submitted_at}`,
    `Notification created at: ${timestamp}`,
    `Full name: ${lead.full_name}`,
    `Email: ${lead.email}`,
    `Phone: ${lead.phone}`,
    `Company: ${lead.company}`,
    `Position / role: ${lead.job_title}`,
    `Company size: ${lead.company_size || "Not provided"}`,
    `State: ${lead.state || "Not provided"}`,
    `Payroll timing: ${lead.payroll_timing || "Not provided"}`,
    `Current payroll provider: ${lead.current_payroll_provider || "Not provided"}`,
    `What they need: ${lead.needs.join(", ") || "Not provided"}`,
    `Purpose / conversation context: ${lead.notes || "Not provided"}`,
    `Consent to contact: ${lead.consent_to_contact ? "Yes" : "No"}`,
    `Source path: ${lead.source_path}`,
  ].join("\n");
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
  const leadBucket = context.env.UPLOADS_BUCKET || context.env.DOCUMENTS_BUCKET;
  if (!leadBucket) return errorJson("Lead payload storage is not configured. ADP routing was not attempted.", 503);

  const timestamp = nowIso();
  const leadId = newId("adp");
  const deliveryId = newId("eml");
  let referralNumber: string;
  try {
    referralNumber = await createPartnerReferralNumber(context.env.DB, ORGANIZATION_ID);
  } catch (error) {
    return errorJson("Lead reference could not be allocated. ADP routing was not attempted.", 502, { error: String(error) });
  }
  const toEmail =
    context.env.ADP_REFERRAL_TO_EMAIL ||
    context.env.ADGA_ADMIN_EMAIL ||
    "matt.ganton@adp.com";

  const lead: StoredAdpLead = {
    id: leadId,
    organization_id: ORGANIZATION_ID,
    partner_slug: "adp",
    partner_name: "ADP",
    referral_number: referralNumber,
    affiliate_code: ADP_AFFILIATE_CODE,
    affiliate_url: ADP_REFERRAL_LINK,
    full_name: body.full_name,
    email: body.email,
    phone: body.phone,
    company: body.company,
    job_title: body.job_title,
    company_size: body.company_size || null,
    state: body.state || null,
    payroll_timing: body.payroll_timing,
    current_payroll_provider: body.current_payroll_provider || null,
    needs,
    notes: body.notes,
    consent_to_contact: true,
    source_path: body.source_path || "/adp",
    submitted_at: timestamp,
  };
  const leadDataR2Key = `partner-referrals/adp/${lead.referral_number}/${lead.id}.json`;
  const leadDataJson = JSON.stringify({
    ...lead,
    request_metadata: {
      user_agent: request.headers.get("user-agent") || null,
    },
  });
  const leadDataHash = await sha256Hex(leadDataJson);

  await leadBucket.put(leadDataR2Key, leadDataJson, {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
    customMetadata: {
      organization_id: ORGANIZATION_ID,
      partner_slug: "adp",
      referral_number: lead.referral_number,
      lead_id: lead.id,
      sha256: leadDataHash,
    },
  });

  const storageObject = await createStorageObject(context.env.DB, {
    organization_id: ORGANIZATION_ID,
    bucket: context.env.UPLOADS_BUCKET ? "uploads" : "documents",
    r2_key: leadDataR2Key,
    file_name: `adp-partner-referral-${lead.referral_number}.json`,
    mime_type: "application/json",
    size_bytes: new TextEncoder().encode(leadDataJson).byteLength,
    sha256: leadDataHash,
    category: "upload",
    resource_type: "partner_referral_lead",
    resource_id: lead.id,
    visibility: "workspace",
    created_by: "adp-page",
  });

  const trackingPixelUrl = `${origin}/api/partners/adp/email-open?lead=${encodeURIComponent(lead.id)}&partner=${encodeURIComponent(ADP_AFFILIATE_CODE)}`;
  const htmlBody = buildAdpLeadEmailHtml(lead, timestamp, trackingPixelUrl);

  try {
    await context.env.DB.prepare(
      `INSERT INTO partner_referral_leads
        (id, organization_id, partner_slug, partner_name, referral_number, lead_data_r2_key, storage_object_id, affiliate_code, affiliate_url, full_name, email, phone, company, job_title, company_size, state,
         payroll_timing, current_payroll_provider, needs_json, notes, consent_to_contact, source_path, user_agent, status,
         email_sent_count, last_email_sent_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        lead.id, lead.organization_id, lead.partner_slug, lead.partner_name, lead.referral_number, leadDataR2Key, storageObject.id, lead.affiliate_code, lead.affiliate_url,
        `ADP partner referral #${lead.referral_number}`, `partner-referral-${lead.id}@metadata.adga.internal`,
        null, null, null, null, null, null, null, "[]", null, 1, lead.source_path,
        null, "new", 0, null, timestamp, timestamp,
      )
      .run();
  } catch (error) {
    return errorJson("Lead could not be saved. ADP routing was not attempted.", 502, { error: String(error) });
  }

  const emailResult = await sendPostmarkEmail(
    {
      to: toEmail,
      subject: `ADP affiliate payroll referral #${lead.referral_number}: ${lead.full_name}`,
      htmlBody,
      textBody: buildAdpLeadTextBody(lead, timestamp),
    },
    context.env,
  );

  const emailSent = Boolean(emailResult.ok);
  const emailSentCount = emailSent ? 1 : 0;
  const lastEmailSentAt = emailSent ? timestamp : null;

  try {
    await context.env.DB.prepare(
      `UPDATE partner_referral_leads
       SET email_sent_count = ?, last_email_sent_at = ?, updated_at = ?
       WHERE id = ? AND organization_id = ?`,
    )
      .bind(emailSentCount, lastEmailSentAt, timestamp, lead.id, lead.organization_id)
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
    payload: {
      lead_id: lead.id,
      referral_number: lead.referral_number,
      partner_slug: lead.partner_slug,
      lead_data_r2_key: leadDataR2Key,
      storage_object_id: storageObject.id,
      email: { sent: emailSent, to: toEmail, result: emailResult },
    },
  });

  if (!emailSent) {
    return errorJson("Postmark did not send the ADP notification email.", 502, {
      lead: {
        id: lead.id,
        referral_number: lead.referral_number,
        partner_slug: lead.partner_slug,
        lead_data_r2_key: leadDataR2Key,
        storage_object_id: storageObject.id,
      },
      email: { sent: false, to: toEmail, result: emailResult },
    });
  }

  return json({
    ok: true,
    lead: {
      id: lead.id,
      referral_number: lead.referral_number,
      partner_slug: lead.partner_slug,
      lead_data_r2_key: leadDataR2Key,
      storage_object_id: storageObject.id,
    },
    email: { sent: emailSent, to: toEmail },
  });
}
