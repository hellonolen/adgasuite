import { sendPostmarkEmail } from "@/lib/integrations/postmark";
import {
  FIVE_SECRETS_MAGIC_TTL_MINUTES,
  createFiveSecretsMagicToken,
} from "@/lib/server/five-secrets-access";
import { errorJson, json, readJson } from "@/lib/server/http";
import { newId } from "@/lib/server/id";
import { normalizeEmail } from "@/lib/server/magic-auth";
import { storeJsonPayload } from "@/lib/server/payload-storage";
import { createAgentJob, createEvent } from "@/lib/server/repository";
import { getRuntimeContext } from "@/lib/server/runtime";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FiveSecretsRequestBody {
  email?: string;
  source?: string;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailHtml(link: string, email: string) {
  const safeEmail = escapeHtml(email);
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f7f3ff;font-family:Inter,Arial,sans-serif;color:#18151f;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f3ff;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e4d8ff;border-radius:22px;overflow:hidden;box-shadow:0 26px 70px rgba(91,33,182,0.14);">
            <tr>
              <td style="padding:34px 38px 24px;border-bottom:1px solid #eee7ff;background:#fbf9ff;">
                <div style="font-size:13px;line-height:1;color:#5b21b6;text-transform:uppercase;letter-spacing:0.16em;font-weight:900;">ADGA</div>
                <div style="margin-top:14px;font-size:15px;line-height:1.5;color:#5f5570;">Your private Five Secrets access link is ready.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:38px;">
                <h1 style="margin:0 0 16px;font-size:34px;line-height:1.04;letter-spacing:-0.03em;color:#18151f;">Five Secrets to Not Losing Million-Dollar Deals</h1>
                <p style="margin:0 0 28px;font-size:17px;line-height:1.62;color:#504861;">Open the private guide and review the five checks before your next high-stakes deal conversation.</p>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 28px;">
                  <tr>
                    <td style="background:#5b21b6;border-radius:14px;box-shadow:0 12px 26px rgba(91,33,182,0.24);">
                      <a href="${link}" style="display:inline-block;color:#ffffff;text-decoration:none;padding:15px 22px;font-size:15px;line-height:1;font-weight:800;">Open Five Secrets</a>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#faf7ff;border:1px solid #e7ddff;border-radius:16px;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0;font-size:13px;line-height:1.55;color:#5f5570;">This link expires in ${FIVE_SECRETS_MAGIC_TTL_MINUTES} minutes and is only for Five Secrets access. It will not sign ${safeEmail} into ADGA Suite.</p>
                    </td>
                  </tr>
                </table>
                <p style="margin:22px 0 0;font-size:12px;line-height:1.55;color:#766b88;">Button not working? Use this access link: <a href="${link}" style="color:#5b21b6;text-decoration:underline;font-weight:800;">Open Five Secrets</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  const body = await readJson<FiveSecretsRequestBody>(request);
  const email = normalizeEmail(body.email || "");

  if (!EMAIL_PATTERN.test(email)) return errorJson("valid email is required.", 400);

  const optinId = newId("five_secrets");
  const payload = {
    id: optinId,
    email,
    source: body.source || "five-secrets",
    lead_magnet: "five-secrets",
    title: "Five Secrets to Not Losing Million-Dollar Deals",
    requested_at: new Date().toISOString(),
  };

  const stored = context.env.DB
    ? await storeJsonPayload({
        env: context.env,
        db: context.env.DB,
        organization_id: "org_adga_primary",
        resource_type: "lead_magnet_optin",
        resource_id: optinId,
        payload,
        created_by: "five-secrets-optin",
      })
    : null;

  const event = await createEvent(context.env.DB, {
    organization_id: "org_adga_primary",
    event_type: "lead_magnet.five_secrets.optin_requested",
    actor_type: "system",
    actor_id: "five-secrets-optin",
    resource_type: "lead_magnet_optin",
    resource_id: optinId,
    payload: {
      optin_id: optinId,
      payload_r2_key: stored?.r2_key || null,
      storage_object_id: stored?.storage_object_id || null,
    },
  });

  await createAgentJob(context.env.DB, {
    agent: "operations",
    job_type: "lead_magnet.five_secrets.review",
    input: {
      optin_id: optinId,
      payload_r2_key: stored?.r2_key || null,
      storage_object_id: stored?.storage_object_id || null,
      requested_at: event.created_at,
    },
  });

  const token = await createFiveSecretsMagicToken(email, context.env);
  const verifyUrl = new URL("/5-secrets/open", request.url);
  verifyUrl.searchParams.set("token", token);

  const result = await sendPostmarkEmail({
    to: email,
    subject: "Access the Five Secrets",
    htmlBody: emailHtml(verifyUrl.toString(), email),
    textBody: `Open Five Secrets: ${verifyUrl.toString()}\n\nThis is not an ADGA Suite sign-in link. It expires in ${FIVE_SECRETS_MAGIC_TTL_MINUTES} minutes.`,
  }, context.env);
  const skipped = "skipped" in result ? Boolean(result.skipped) : false;

  await createEvent(context.env.DB, {
    organization_id: "org_adga_primary",
    event_type: "lead_magnet.five_secrets.magic_link_sent",
    actor_type: "system",
    actor_id: "five-secrets-optin",
    resource_type: "lead_magnet_optin",
    resource_id: optinId,
    payload: {
      sent: result.ok,
      skipped,
      provider: "provider" in result ? result.provider : "postmark",
    },
  });

  if (skipped && process.env.NODE_ENV === "production") {
    return errorJson("Outbound email is not configured.", 503, result);
  }

  if (!result.ok && !skipped) {
    return errorJson("Could not send the access link.", 502, result);
  }

  return json({
    ok: true,
    sent: result.ok,
    skipped,
    previewUrl: skipped && process.env.NODE_ENV !== "production" ? verifyUrl.toString() : undefined,
  });
}
