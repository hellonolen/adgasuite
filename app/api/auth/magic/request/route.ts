import { errorJson, json, readJson } from "@/lib/server/http";
import { sendPostmarkEmail } from "@/lib/integrations/postmark";
import { getRuntimeContext } from "@/lib/server/runtime";
import {
  MAGIC_TOKEN_TTL_MINUTES,
  isoMinutesFromNow,
  normalizeEmail,
  randomToken,
  sha256,
} from "@/lib/server/magic-auth";

interface MagicRequestBody {
  email?: string;
  plan?: string;
  redirect?: string;
}

function safeRedirect(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/suite";
  return value;
}

function magicEmailHtml(link: string, email: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f6f3fb;font-family:Inter,Arial,sans-serif;color:#18151f;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f3fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e8e0f4;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:28px 30px 18px;border-bottom:1px solid #eee7f7;">
                <div style="font-size:26px;font-weight:800;letter-spacing:-0.02em;color:#5b21b6;">ADGA</div>
                <div style="margin-top:10px;font-size:13px;color:#6f687c;">Secure sign-in link for ${email}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;">
                <h1 style="margin:0 0 12px;font-size:28px;line-height:1.12;letter-spacing:-0.03em;">Open your deal workspace.</h1>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.55;color:#4f485d;">This link signs you into ADGA and expires in ${MAGIC_TOKEN_TTL_MINUTES} minutes. If you did not request access, you can ignore this email.</p>
                <a href="${link}" style="display:inline-block;background:#5b21b6;color:#ffffff;text-decoration:none;border-radius:12px;padding:13px 18px;font-size:14px;font-weight:700;">Open ADGA Suite</a>
                <p style="margin:22px 0 0;font-size:12px;line-height:1.5;color:#7b7287;">Pretty link:<br><a href="${link}" style="color:#5b21b6;text-decoration:underline;">${link}</a></p>
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
  const body = await readJson<MagicRequestBody>(request);
  const email = normalizeEmail(body.email || "");

  if (!email || !email.includes("@")) {
    return errorJson("Enter a valid work email.", 400);
  }

  if (!context.env.DB) {
    if (process.env.NODE_ENV !== "production") {
      return json({ ok: true, skipped: true, previewUrl: "/suite", message: "Local DB is not configured. Use the preview link." });
    }
    return errorJson("Authentication storage is not configured.", 503);
  }

  const token = randomToken();
  const tokenHash = await sha256(token);
  const redirectPath = safeRedirect(body.redirect);
  const verifyUrl = new URL("/auth/verify", request.url);
  verifyUrl.searchParams.set("token", token);
  if (body.plan) verifyUrl.searchParams.set("plan", body.plan);
  if (redirectPath !== "/suite") verifyUrl.searchParams.set("redirect", redirectPath);

  await context.env.DB.prepare(
    `INSERT OR REPLACE INTO magic_tokens (token_hash, email, plan, redirect_path, expires_at, used_at, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, datetime('now'))`
  ).bind(tokenHash, email, body.plan || null, redirectPath, isoMinutesFromNow(MAGIC_TOKEN_TTL_MINUTES)).run();

  const result = await sendPostmarkEmail({
    to: email,
    subject: "Your ADGA sign-in link",
    htmlBody: magicEmailHtml(verifyUrl.toString(), email),
    textBody: `Open ADGA Suite: ${verifyUrl.toString()}\n\nThis link expires in ${MAGIC_TOKEN_TTL_MINUTES} minutes.`,
  }, context.env);
  const skipped = "skipped" in result ? Boolean(result.skipped) : false;

  if (!result.ok && !skipped) {
    return errorJson("Could not send the sign-in email.", 502, result);
  }

  return json({
    ok: true,
    sent: result.ok,
    skipped,
    previewUrl: skipped ? verifyUrl.toString() : undefined,
  });
}
