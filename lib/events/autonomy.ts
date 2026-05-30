/**
 * Autonomy gate — every customer-facing agent action passes through here before execution.
 *
 * Three modes:
 *   - hands_off : agent proposes, human approves every action. Used during onboarding +
 *                 first 7 days of a workspace, and for any "high" risk action.
 *   - medium    : agent executes routine actions (sequence drafts, follow-up tasks, internal
 *                 notes) without approval, but escalates anything new or risky.
 *   - hands_on  : agent operates autonomously within explicit guardrails (spend caps,
 *                 daily action quotas, escalation triggers). Default for trusted workspaces.
 */

export type AutonomyMode = "hands_off" | "medium" | "hands_on";
export type RiskLevel = "low" | "medium" | "high";

export interface AutonomyDecision {
  execute: boolean;
  reason: string;
  requireApproval: boolean;
}

export function decide(mode: AutonomyMode, risk: RiskLevel): AutonomyDecision {
  if (mode === "hands_off") {
    return { execute: false, reason: "autonomy=hands_off — every action requires approval.", requireApproval: true };
  }
  if (mode === "medium") {
    if (risk === "low") return { execute: true, reason: "autonomy=medium + risk=low — auto-execute.", requireApproval: false };
    return { execute: false, reason: `autonomy=medium + risk=${risk} — escalate.`, requireApproval: true };
  }
  // hands_on
  if (risk === "high") return { execute: false, reason: "autonomy=hands_on but risk=high — escalate.", requireApproval: true };
  return { execute: true, reason: `autonomy=hands_on + risk=${risk} — auto-execute.`, requireApproval: false };
}

export const DEFAULT_AUTONOMY: AutonomyMode = "medium";

/**
 * Per-skill default risk classification — what risk band a skill's primary
 * action falls into when the workspace doesn't override. Handlers read this
 * to call `decide(mode, risk)` consistently.
 *
 * Conservative bias: read-only skills are "low", anything that writes records
 * is "medium", anything that touches private data or external systems on
 * behalf of the user is "high".
 */
export const SKILL_DEFAULT_RISK: Record<string, RiskLevel> = {
  // Read-only — never need approval
  "activity-timeline":            "low",
  "list-segment":                 "low",
  "knowledge-summary":            "low",
  "daily-brief":                  "low",
  "pipeline-risk":                "low",

  // Routine write — auto in medium/hands_on, escalate in hands_off
  "lead-scoring":                 "low",
  "proposal-generation":          "medium",
  "battlecard-generation":        "medium",
  "team-invite":                  "medium",
  "team-invite.accept":           "low",
  "record-comment":               "low",
  "import-enrichment":            "medium",

  // Bulk write — always at least medium; UI surfaces approval-required policy
  "csv-import":                   "medium",
  "import-hubspot":               "medium",
  "import-pipedrive":             "medium",
  "import-salesforce":            "medium",
  "import-notion":                "medium",
  "import-airtable":              "medium",

  // Private data / external system access — high; always escalates in
  // hands_off + medium, only auto-executes in hands_on with explicit consent
  "inbox-sync":                   "high",

  // Schema change — owner-gated separately; risk classified high so even
  // hands_on still escalates without explicit consent
  "custom-object":                "high",

  // Workspace lifecycle / billing-adjacent
  "workspace-activation":         "low",
  "dealflow-template-materialization": "low",
};

/** Resolve a skill's default risk band; returns "medium" when unspecified. */
export function riskForSkill(skillId: string): RiskLevel {
  return SKILL_DEFAULT_RISK[skillId] ?? "medium";
}
