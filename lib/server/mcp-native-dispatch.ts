// Closes GAP #10 — per-action native dispatch for MCP tool calls.
//
// MCP POST currently emits agent_job.started for every auto-policy action and
// hands the work to a subscribing agent. That's the correct generic path, but
// some actions can execute inline against D1 with no agent involvement:
//   - settings.toggle_notification → flip a row in workspace_settings
//   - billing.download_invoice     → return a signed link to the latest invoice
//   - pipeline.deal.update_stage   → mutate deals.stage and emit deal.stage_changed
//
// This module is a small registry: actionId → native handler. The MCP route
// consults it before falling through to the generic event emit, so external
// orchestrators get a faster, deterministic response when there's a real handler.

export interface NativeDispatchInput {
  env: CloudflareEnv;
  organizationId: string;
  arguments: Record<string, unknown>;
  actorEmail: string | null;
}

export interface NativeDispatchResult {
  ok: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

type NativeHandler = (input: NativeDispatchInput) => Promise<NativeDispatchResult>;

// ─── handlers ─────────────────────────────────────────────────────────────────

const updateDealStage: NativeHandler = async ({ env, organizationId, arguments: args }) => {
  const dealId = String(args.deal_id || "").trim();
  const stage = String(args.stage || "").trim();
  if (!dealId || !stage) {
    return { ok: false, error: "deal_id and stage are required." };
  }
  if (!env.DB) return { ok: false, error: "Database unavailable." };

  const before = await env.DB
    .prepare("SELECT stage FROM deals WHERE id = ? AND organization_id = ? AND archived_at IS NULL")
    .bind(dealId, organizationId)
    .first<{ stage: string }>()
    .catch(() => null);
  if (!before) return { ok: false, error: `Deal ${dealId} not found.` };

  await env.DB
    .prepare(
      "UPDATE deals SET stage = ?, updated_at = datetime('now') WHERE id = ? AND organization_id = ?",
    )
    .bind(stage, dealId, organizationId)
    .run();

  return {
    ok: true,
    data: {
      deal_id: dealId,
      previous_stage: before.stage,
      new_stage: stage,
    },
  };
};

const downloadInvoice: NativeHandler = async ({ env, organizationId, arguments: args }) => {
  if (!env.STRIPE_SECRET_KEY) return { ok: false, error: "Stripe is not configured." };
  if (!env.DB) return { ok: false, error: "Database unavailable." };

  const subscriptionId = String(args.subscription_id || "").trim();

  const row = await env.DB
    .prepare(
      `SELECT provider_customer_id
         FROM subscriptions
        WHERE organization_id = ? AND provider = 'stripe'
          ${subscriptionId ? "AND provider_subscription_id = ?" : ""}
        ORDER BY updated_at DESC LIMIT 1`,
    )
    .bind(...(subscriptionId ? [organizationId, subscriptionId] : [organizationId]))
    .first<{ provider_customer_id: string }>()
    .catch(() => null);

  if (!row?.provider_customer_id) {
    return { ok: false, error: "No Stripe customer found for this workspace." };
  }

  const response = await fetch(
    `https://api.stripe.com/v1/invoices?customer=${encodeURIComponent(row.provider_customer_id)}&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Stripe-Version": "2026-02-25.clover",
      },
    },
  ).catch(() => null);
  if (!response || !response.ok) {
    return { ok: false, error: "Could not fetch invoice from Stripe." };
  }
  const body = (await response.json().catch(() => null)) as
    | { data?: Array<{ id?: string; hosted_invoice_url?: string; number?: string }> }
    | null;
  const invoice = body?.data?.[0];
  if (!invoice?.hosted_invoice_url) {
    return { ok: false, error: "No invoice available." };
  }
  return {
    ok: true,
    data: {
      invoice_id: invoice.id,
      number: invoice.number,
      hosted_invoice_url: invoice.hosted_invoice_url,
    },
  };
};

const toggleNotification: NativeHandler = async ({ env, organizationId, arguments: args, actorEmail }) => {
  if (!env.DB) return { ok: false, error: "Database unavailable." };
  const key = String(args.key || "").trim();
  const value = args.value === undefined ? null : String(args.value);
  if (!key) return { ok: false, error: "key is required." };

  await env.DB
    .prepare(
      `INSERT INTO workspace_settings (organization_id, key, value, updated_by, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(organization_id, key) DO UPDATE SET
         value = excluded.value,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`,
    )
    .bind(organizationId, key, value, actorEmail || "mcp")
    .run()
    .catch(() => null);

  return { ok: true, data: { key, value } };
};

// ─── registry ─────────────────────────────────────────────────────────────────

const REGISTRY: Record<string, NativeHandler> = {
  "pipeline.deal.update_stage": updateDealStage,
  "billing.download_invoice": downloadInvoice,
  "settings.toggle_notification": toggleNotification,
};

export function hasNativeHandler(actionId: string): boolean {
  return actionId in REGISTRY;
}

export async function runNativeDispatch(
  actionId: string,
  input: NativeDispatchInput,
): Promise<NativeDispatchResult> {
  const handler = REGISTRY[actionId];
  if (!handler) return { ok: false, error: `No native handler for "${actionId}".` };
  try {
    return await handler(input);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Native handler threw.",
    };
  }
}

export function listNativeDispatchIds(): string[] {
  return Object.keys(REGISTRY);
}
