import { errorJson, json, readJson } from "@/lib/server/http";
import { createEvent } from "@/lib/server/repository";
import { getRuntimeContext, requireUser } from "@/lib/server/runtime";
import { newId, nowIso } from "@/lib/server/id";
import { readStoredJsonPayload, storeJsonPayload } from "@/lib/server/payload-storage";

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  requireUser(context);

  if (!context.env.DB) return json({ ok: true, messages: [] });

  try {
    const result = await context.env.DB.prepare(
      "SELECT * FROM sms_messages WHERE organization_id = ? ORDER BY created_at DESC LIMIT 100",
    )
      .bind("org_adga_primary")
      .all();
    const messages = await Promise.all((result.results || []).map(async (row: Record<string, unknown>) => {
      const payload = await readStoredJsonPayload<Record<string, unknown>>(
        context.env,
        context.env.DB,
        row.payload_r2_key ? String(row.payload_r2_key) : null,
        row.storage_object_id ? String(row.storage_object_id) : null,
      );
      return payload ? { ...row, ...payload, id: row.id, organization_id: row.organization_id } : row;
    }));
    return json({ ok: true, messages });
  } catch {
    return json({ ok: true, messages: [] });
  }
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  requireUser(context);
  const body = await readJson<{ to?: string; message?: string; resource_type?: string; resource_id?: string }>(request);

  if (!body.to || !body.message) return errorJson("to and message are required.");

  const timestamp = nowIso();
  const provider = context.env.SMS_GATEWAY_PROVIDER || "self_hosted_android_gateway";
  const gatewayUrl = context.env.SMS_GATEWAY_URL || process.env.SMS_GATEWAY_URL;
  const gatewayKey = context.env.SMS_GATEWAY_API_KEY || process.env.SMS_GATEWAY_API_KEY;
  let status = "skipped";
  let providerResponse = "SMS gateway is not configured.";
  let providerMessageId: string | null = null;

  if (gatewayUrl && gatewayKey) {
    try {
      const response = await fetch(gatewayUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${gatewayKey}`,
          "x-api-key": gatewayKey,
        },
        body: JSON.stringify({
          to: body.to,
          recipients: [body.to],
          message: body.message,
          body: body.message,
        }),
      });
      const text = await response.text();
      status = response.ok ? "sent" : "failed";
      providerResponse = text;
      try {
        const parsed = JSON.parse(text);
        providerMessageId = parsed.message_id || parsed.message_ids?.[0] || parsed.id || null;
      } catch {}
    } catch (error) {
      status = "failed";
      providerResponse = error instanceof Error ? error.message : "SMS gateway request failed.";
    }
  }

  const sms = {
    id: newId("sms"),
    organization_id: "org_adga_primary",
    provider,
    direction: "outbound",
    to_number: body.to,
    body: body.message,
    status,
    provider_message_id: providerMessageId,
    provider_response: providerResponse,
    resource_type: body.resource_type || null,
    resource_id: body.resource_id || null,
    created_by: context.user.email,
    sent_at: status === "sent" ? timestamp : null,
    created_at: timestamp,
    updated_at: timestamp,
  };
  const stored = context.env.DB
    ? await storeJsonPayload({
        env: context.env,
        db: context.env.DB,
        organization_id: sms.organization_id,
        resource_type: "sms",
        resource_id: sms.id,
        payload: sms,
        created_by: context.user.email,
      })
    : null;

  if (context.env.DB) try {
    await context.env.DB.prepare(
      `INSERT INTO sms_messages
        (id, organization_id, provider, direction, to_number, body, status, provider_message_id, provider_response, payload_r2_key, storage_object_id,
         resource_type, resource_id, created_by, sent_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        sms.id, sms.organization_id, sms.provider, sms.direction, "sms-recipient-in-r2", "SMS payload in R2",
        sms.status, sms.provider_message_id, null, stored?.r2_key || null, stored?.storage_object_id || null,
        sms.resource_type, sms.resource_id, sms.created_by, sms.sent_at, sms.created_at, sms.updated_at,
      )
      .run();
  } catch {}

  await createEvent(context.env.DB, {
    organization_id: sms.organization_id,
    event_type: status === "sent" ? "sms.sent" : "sms.not_sent",
    actor_type: "user",
    actor_id: context.user.email,
    resource_type: "sms",
    resource_id: sms.id,
    payload: { sms_id: sms.id, payload_r2_key: stored?.r2_key || null, storage_object_id: stored?.storage_object_id || null, status },
  });

  return json({ ok: status === "sent", sms }, { status: status === "failed" ? 502 : 200 });
}
