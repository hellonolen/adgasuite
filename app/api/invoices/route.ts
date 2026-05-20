import { errorJson, json, readJson } from "@/lib/server/http";
import { createEvent } from "@/lib/server/repository";
import { newId, nowIso } from "@/lib/server/id";
import { getRuntimeContext, requireAdmin } from "@/lib/server/runtime";

const MAX_PLATFORM_FEE_BPS = 500;

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  requireAdmin(context);
  if (!context.env.DB) return json({ ok: true, invoices: [] });

  try {
    const result = await context.env.DB.prepare(
      "SELECT * FROM client_invoices WHERE organization_id = ? ORDER BY created_at DESC LIMIT 250",
    ).bind("org_adga_primary").all();
    return json({ ok: true, invoices: result.results || [] });
  } catch {
    return json({ ok: true, invoices: [] });
  }
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  requireAdmin(context);
  const body = await readJson<{
    client_name?: string;
    client_email?: string;
    client_company?: string;
    currency?: string;
    line_items?: Array<{ description: string; quantity?: number; unit_amount_cents?: number }>;
    discount_cents?: number;
    tax_cents?: number;
    platform_fee_bps?: number;
    due_at?: string;
    notes?: string;
    document_links?: string[];
  }>(request);

  if (!body.client_name) return errorJson("client_name is required.");

  const timestamp = nowIso();
  const lineItems = body.line_items?.length ? body.line_items : [{ description: "Service", quantity: 1, unit_amount_cents: 0 }];
  const subtotal = lineItems.reduce((sum, item) => sum + Math.max(0, Number(item.quantity || 1)) * Math.max(0, Number(item.unit_amount_cents || 0)), 0);
  const discount = Math.max(0, Number(body.discount_cents || 0));
  const tax = Math.max(0, Number(body.tax_cents || 0));
  const total = Math.max(0, subtotal - discount + tax);
  const platformFeeBps = Math.min(MAX_PLATFORM_FEE_BPS, Math.max(0, Number(body.platform_fee_bps ?? MAX_PLATFORM_FEE_BPS)));
  const platformFee = Math.round(total * platformFeeBps / 10000);
  const invoice = {
    id: newId("inv"),
    organization_id: "org_adga_primary",
    invoice_number: `ADGA-${Date.now()}`,
    owner_user_id: context.user.email,
    client_name: body.client_name,
    client_email: body.client_email || null,
    client_company: body.client_company || null,
    status: "draft",
    currency: body.currency || "USD",
    subtotal_cents: subtotal,
    discount_cents: discount,
    tax_cents: tax,
    total_cents: total,
    platform_fee_bps: platformFeeBps,
    platform_fee_cents: platformFee,
    net_to_user_cents: total - platformFee,
    fee_collection_status: "pending",
    payment_status: "unpaid",
    payment_link: null,
    due_at: body.due_at || null,
    notes: body.notes || null,
    line_items_json: JSON.stringify(lineItems),
    document_links_json: JSON.stringify(body.document_links || []),
    activity_history_json: JSON.stringify([{ type: "invoice.created", at: timestamp, actor: context.user.email }]),
    created_at: timestamp,
    updated_at: timestamp,
  };

  if (context.env.DB) try {
    await context.env.DB.prepare(
      `INSERT INTO client_invoices
        (id, organization_id, invoice_number, owner_user_id, client_name, client_email, client_company, status, currency,
         subtotal_cents, discount_cents, tax_cents, total_cents, platform_fee_bps, platform_fee_cents, net_to_user_cents,
         fee_collection_status, payment_status, payment_link, due_at, notes, line_items_json, document_links_json,
         activity_history_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        invoice.id, invoice.organization_id, invoice.invoice_number, invoice.owner_user_id, invoice.client_name,
        invoice.client_email, invoice.client_company, invoice.status, invoice.currency, invoice.subtotal_cents,
        invoice.discount_cents, invoice.tax_cents, invoice.total_cents, invoice.platform_fee_bps, invoice.platform_fee_cents,
        invoice.net_to_user_cents, invoice.fee_collection_status, invoice.payment_status, invoice.payment_link,
        invoice.due_at, invoice.notes, invoice.line_items_json, invoice.document_links_json, invoice.activity_history_json,
        invoice.created_at, invoice.updated_at,
      )
      .run();
  } catch {}

  await createEvent(context.env.DB, {
    organization_id: invoice.organization_id,
    event_type: "client_invoice.created",
    actor_type: "user",
    actor_id: context.user.email,
    resource_type: "client_invoice",
    resource_id: invoice.id,
    payload: { invoice },
  });

  return json({ ok: true, invoice });
}
