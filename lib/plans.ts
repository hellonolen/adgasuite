export type AdgaPlanId = "pro" | "team" | "enterprise";

export const adgaPlans = {
  pro: {
    id: "pro",
    name: "Pro",
    audience: "For the operator running deals on their own.",
    price: "$97",
    unit: "per month",
    seats: "1 user",
    storage: "Unlimited deals, contacts, documents",
  },
  team: {
    id: "team",
    name: "Team",
    audience: "Built for closing teams working the same deals.",
    price: "$297",
    unit: "per month",
    seats: "5 seats included, +$30/seat up to 12",
    storage: "Shared deals, calendar, invoicing",
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    audience: "Brokerages and firms running real deal volume.",
    price: "$597",
    unit: "per month",
    seats: "12 seats included, +$20/seat unlimited",
    storage: "SSO, audit logs, branded client portal",
  },
} as const;

export function normalizePlan(plan?: string): AdgaPlanId {
  if (plan === "pro" || plan === "team" || plan === "enterprise") return plan;
  if (plan === "individual" || plan === "solo" || plan === "essential") return "pro";
  if (plan === "teams" || plan === "professional" || plan === "suite") return "team";
  return "team";
}
