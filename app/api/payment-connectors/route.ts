import { errorJson, json, readJson } from "@/lib/server/http";
import { createEvent } from "@/lib/server/repository";
import { newId, nowIso } from "@/lib/server/id";
import { getRuntimeContext } from "@/lib/server/runtime";
import { resolveTenantSession } from "@/lib/server/tenant";

const CONNECTOR_CAPABILITIES: Record<string, string[]> = {
  bank_account: ["payout_destination"],
  stripe: ["payment_links", "card_payments", "payouts"],
  paypal: ["payment_links", "paypal_payments", "payouts"],
  quickbooks: ["accounting_sync", "invoice_payment_routing", "payment_status"],
  other: ["custom_connector"],
};

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  const session = await resolveTenantSession(context, request);
  if (!session) return errorJson("Authentication required.", 401);
  if (!context.env.DB) return json({ ok: true, connectors: [] });

  try {
    const result = await context.env.DB.prepare(
      "SELECT * FROM tenant_payment_connectors WHERE organization_id = ? ORDER BY created_at DESC LIMIT 100",
    ).bind(session.organizationId).all();
    return json({ ok: true, connectors: result.results || [] });
  } catch {
    return json({ ok: true, connectors: [] });
  }
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  const session = await resolveTenantSession(context, request);
  if (!session) return errorJson("Authentication required.", 401);
  const body = await readJson<{
    connector_type?: string;
    display_name?: string;
    tenant_type?: "company" | "individual";
    connection_url?: string;
    external_account_ref?: string;
    metadata?: Record<string, unknown>;
  }>(request);

  const connectorType = body.connector_type || "bank_account";
  if (!CONNECTOR_CAPABILITIES[connectorType]) return errorJson("unsupported connector_type.");

  const timestamp = nowIso();
  const connector = {
    id: newId("conn"),
    organization_id: session.organizationId,
    owner_user_id: session.email,
    tenant_type: body.tenant_type || "company",
    connector_type: connectorType,
    display_name: body.display_name || connectorType.replace(/_/g, " "),
    status: body.connection_url || body.external_account_ref ? "pending" : "not_connected",
    capabilities_json: JSON.stringify(CONNECTOR_CAPABILITIES[connectorType]),
    connection_url: body.connection_url || null,
    external_account_ref: body.external_account_ref || null,
    metadata_json: JSON.stringify(body.metadata || {}),
    last_checked_at: null,
    created_at: timestamp,
    updated_at: timestamp,
  };

  if (context.env.DB) {
    try {
      await context.env.DB.prepare(
        `INSERT INTO tenant_payment_connectors
          (id, organization_id, owner_user_id, tenant_type, connector_type, display_name, status, capabilities_json,
           connection_url, external_account_ref, metadata_json, last_checked_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          connector.id, connector.organization_id, connector.owner_user_id, connector.tenant_type,
          connector.connector_type, connector.display_name, connector.status, connector.capabilities_json,
          connector.connection_url, connector.external_account_ref, connector.metadata_json,
          connector.last_checked_at, connector.created_at, connector.updated_at,
        )
        .run();
    } catch {}
  }

  await createEvent(context.env.DB, {
    organization_id: connector.organization_id,
    event_type: "payment_connector.created",
    actor_type: "user",
    actor_id: session.email,
    resource_type: "tenant_payment_connector",
    resource_id: connector.id,
    payload: { connector },
  });

  return json({ ok: true, connector });
}
