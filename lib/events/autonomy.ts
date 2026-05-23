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
