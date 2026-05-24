import { headers } from "next/headers";
import BillingSettingsClient from "./billing-settings-client";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { getRuntimeContext } from "@/lib/server/runtime";
import { organizationIdForSession } from "@/lib/server/tenant";

export const dynamic = "force-dynamic";

type SubscriptionRow = {
  plan: string | null;
  status: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  current_period_end: string | null;
};

type BillingSnapshot = {
  billingEmail: string | null;
  defaultPaymentMethod: string | null;
  invoices: Array<{
    id: string;
    number: string | null;
    status: string | null;
    amountDue: number | null;
    currency: string | null;
    hostedInvoiceUrl: string | null;
    created: string | null;
  }>;
};

export default async function SuiteSettingsBillingPage() {
  const headerList = await headers();
  const cookieHeader = headerList.get("cookie");
  const request = new Request("https://internal.local/suite/settings/billing", {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
  const context = getRuntimeContext(request);
  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));
  const organizationId = organizationIdForSession(sessionUser);

  const subscription = context.env.DB
    ? await context.env.DB
        .prepare(
          `SELECT plan, status, provider_customer_id, provider_subscription_id, current_period_end
           FROM subscriptions
           WHERE organization_id = ? AND provider = 'stripe'
           ORDER BY updated_at DESC
           LIMIT 1`,
        )
        .bind(organizationId)
        .first<SubscriptionRow>()
        .catch(() => null)
    : null;

  const stripeSnapshot = subscription?.provider_customer_id
    ? await loadStripeBillingSnapshot(context.env, subscription.provider_customer_id)
    : null;

  return (
    <BillingSettingsClient
      subscription={{
        plan: subscription?.plan || "team",
        status: subscription?.status || "trialing",
        hasStripeCustomer: Boolean(subscription?.provider_customer_id),
        stripeCustomerId: subscription?.provider_customer_id || null,
        stripeSubscriptionId: subscription?.provider_subscription_id || null,
        currentPeriodEnd: subscription?.current_period_end || null,
      }}
      billing={stripeSnapshot}
    />
  );
}

async function loadStripeBillingSnapshot(env: CloudflareEnv, customerId: string): Promise<BillingSnapshot | null> {
  if (!env.STRIPE_SECRET_KEY) return null;
  const headers = {
    Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
    "Stripe-Version": "2026-02-25.clover",
  };

  const [customerResponse, paymentResponse, invoiceResponse] = await Promise.all([
    fetch(`https://api.stripe.com/v1/customers/${encodeURIComponent(customerId)}`, { headers }).catch(() => null),
    fetch(`https://api.stripe.com/v1/payment_methods?customer=${encodeURIComponent(customerId)}&type=card&limit=3`, { headers }).catch(() => null),
    fetch(`https://api.stripe.com/v1/invoices?customer=${encodeURIComponent(customerId)}&limit=5`, { headers }).catch(() => null),
  ]);

  const customer = customerResponse?.ok ? await customerResponse.json().catch(() => ({})) : {};
  const payments = paymentResponse?.ok ? await paymentResponse.json().catch(() => ({ data: [] })) : { data: [] };
  const invoices = invoiceResponse?.ok ? await invoiceResponse.json().catch(() => ({ data: [] })) : { data: [] };
  const card = Array.isArray(payments.data) ? payments.data[0]?.card : null;

  return {
    billingEmail: typeof customer.email === "string" ? customer.email : null,
    defaultPaymentMethod: card?.brand && card?.last4 ? `${title(String(card.brand))} ending ${card.last4}` : null,
    invoices: Array.isArray(invoices.data)
      ? invoices.data.map((invoice: Record<string, unknown>) => ({
          id: String(invoice.id || ""),
          number: typeof invoice.number === "string" ? invoice.number : null,
          status: typeof invoice.status === "string" ? invoice.status : null,
          amountDue: typeof invoice.amount_due === "number" ? invoice.amount_due : null,
          currency: typeof invoice.currency === "string" ? invoice.currency : null,
          hostedInvoiceUrl: typeof invoice.hosted_invoice_url === "string" ? invoice.hosted_invoice_url : null,
          created: typeof invoice.created === "number" ? new Date(invoice.created * 1000).toISOString() : null,
        }))
      : [],
  };
}

function title(value: string) {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
