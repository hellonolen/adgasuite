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

function emailHtml(link: string, email: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f7f4ee;font-family:Inter,Arial,sans-serif;color:#171412;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f4ee;padding:34px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#fffdf8;border:1px solid #e7dfd2;border-radius:18px;overflow:hidden;box-shadow:0 18px 50px rgba(43,34,24,0.10);">
            <tr>
              <td style="padding:26px 30px 18px;border-bottom:1px solid #eee5d8;">
                <div style="font-size:25px;font-weight:800;color:#171412;">ADGA</div>
                <div style="margin-top:8px;font-size:13px;line-height:1.5;color:#776d60;">Five Secrets access for ${email}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;">
                <h1 style="margin:0 0 12px;font-size:28px;line-height:1.12;letter-spacing:-0.02em;color:#171412;">Five Secrets to Not Losing Million-Dollar Deals</h1>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#4f463c;">Use this private link to open the Five Secrets access page. This is not an ADGA Suite sign-in link and it will not log you into a customer workspace.</p>
                <a href="${link}" style="display:inline-block;background:#171412;color:#fffdf8;text-decoration:none;border-radius:12px;padding:13px 18px;font-size:14px;font-weight:800;">Open Five Secrets</a>
                <p style="margin:22px 0 0;font-size:12px;line-height:1.5;color:#7b7167;">This link expires in ${FIVE_SECRETS_MAGIC_TTL_MINUTES} minutes. If the button does not work, open this link:<br><a href="${link}" style="color:#171412;text-decoration:underline;">${link}</a></p>
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
  const verifyUrl = new URL("/api/lead-magnets/five-secrets/verify", request.url);
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
