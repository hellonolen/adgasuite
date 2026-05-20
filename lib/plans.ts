export type AdgaPlanId = "individual" | "teams" | "enterprise";

export const adgaPlans = {
  individual: {
    id: "individual",
    name: "Individual",
    audience: "For one closer running their own deal flow.",
    price: "$99",
    unit: "per month",
    seats: "1 seat",
    storage: "10 GB",
  },
  teams: {
    id: "teams",
    name: "Teams",
    audience: "For deal teams working across shared rooms.",
    price: "$249",
    unit: "per seat / month",
    seats: "2-25 seats",
    storage: "30 GB per seat",
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    audience: "For larger firms that need more users, stronger security, and AI-run workflows.",
    price: "Custom",
    unit: "annual agreement",
    seats: "Custom seats",
    storage: "Custom R2 allocation",
  },
} as const;

export function normalizePlan(plan?: string): AdgaPlanId {
  if (plan === "individual" || plan === "teams" || plan === "enterprise") return plan;
  if (plan === "essential") return "individual";
  if (plan === "professional" || plan === "pro" || plan === "suite") return "teams";
  return "teams";
}
