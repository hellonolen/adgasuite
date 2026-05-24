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
  current_period_end: string | null;
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
          `SELECT plan, status, provider_customer_id, current_period_end
           FROM subscriptions
           WHERE organization_id = ? AND provider = 'stripe'
           ORDER BY updated_at DESC
           LIMIT 1`,
        )
        .bind(organizationId)
        .first<SubscriptionRow>()
        .catch(() => null)
    : null;

  return (
    <BillingSettingsClient
      subscription={{
        plan: subscription?.plan || "team",
        status: subscription?.status || "trialing",
        hasStripeCustomer: Boolean(subscription?.provider_customer_id),
        currentPeriodEnd: subscription?.current_period_end || null,
      }}
    />
  );
}
