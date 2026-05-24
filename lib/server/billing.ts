import type { RuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { DEFAULT_ORG_ID, organizationIdForSession } from "@/lib/server/tenant";

export const BILLING_ALLOWED_STATUSES = new Set(["active", "trialing"]);
export const BILLING_RECOVERY_STATUSES = new Set([
  "past_due",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "canceled",
  "paused",
]);

export interface WorkspaceBillingState {
  organizationId: string;
  plan: string;
  status: string;
  hasStripeCustomer: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  accessAllowed: boolean;
}

type BillingRow = {
  plan: string | null;
  status: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  current_period_end: string | null;
};

export function normalizeBillingStatus(status: string | null | undefined) {
  return String(status || "trialing").toLowerCase();
}

export function isSubscriptionAccessAllowed(status: string | null | undefined) {
  return BILLING_ALLOWED_STATUSES.has(normalizeBillingStatus(status));
}

export async function loadWorkspaceBillingState(
  context: RuntimeContext,
  request: Request,
): Promise<WorkspaceBillingState> {
  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));
  const organizationId = context.user.isLocalAdminBypass
    ? DEFAULT_ORG_ID
    : organizationIdForSession(sessionUser);

  const row = context.env.DB
    ? await context.env.DB
        .prepare(
          `SELECT plan, status, provider_customer_id, provider_subscription_id, current_period_end
           FROM subscriptions
           WHERE organization_id = ? AND provider = 'stripe'
           ORDER BY updated_at DESC
           LIMIT 1`,
        )
        .bind(organizationId)
        .first<BillingRow>()
        .catch(() => null)
    : null;

  const status = normalizeBillingStatus(row?.status);
  return {
    organizationId,
    plan: row?.plan || "team",
    status,
    hasStripeCustomer: Boolean(row?.provider_customer_id),
    stripeCustomerId: row?.provider_customer_id || null,
    stripeSubscriptionId: row?.provider_subscription_id || null,
    currentPeriodEnd: row?.current_period_end || null,
    accessAllowed: isSubscriptionAccessAllowed(status),
  };
}
