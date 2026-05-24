import { errorJson, json, readJson } from "@/lib/server/http";
import { sendPostmarkEmail } from "@/lib/integrations/postmark";
import { createEvent } from "@/lib/server/repository";
import { getRuntimeContext, requireAdmin } from "@/lib/server/runtime";
import { protectedTestRecipientError } from "@/lib/server/email-safety";

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  requireAdmin(context);
  const body = await readJson<{ to?: string; subject?: string; htmlBody?: string; textBody?: string }>(request);

  if (!body.to || !body.subject || !body.htmlBody) {
    return errorJson("to, subject, and htmlBody are required.");
  }
  const protectedRecipientError = protectedTestRecipientError(body.to);
  if (protectedRecipientError) return errorJson(protectedRecipientError, 403);

  const result = await sendPostmarkEmail(
    { to: body.to, subject: body.subject, htmlBody: body.htmlBody, textBody: body.textBody },
    context.env,
  );

  const event = await createEvent(context.env.DB, {
    organization_id: "org_adga_primary",
    event_type: result.ok ? "email.sent" : "email.failed",
    actor_type: "user",
    actor_id: context.user.email,
    resource_type: "email",
    resource_id: body.to,
    payload: { provider: "postmark", result },
  });

  return json({ ok: result.ok, result, event }, { status: result.ok ? 200 : 503 });
}
