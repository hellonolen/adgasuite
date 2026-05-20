import { runAgentModel } from "@/lib/ai/cloudflare-worker-ai";
import type { AgentJob, AgentName } from "@/lib/server/repository";

const agentSystems: Record<AgentName, string> = {
  conductor: "You are ADGA Suite Conductor. Route work, identify the next best workflow step, and return JSON only.",
  sales: "You are ADGA Suite Sales Agent. Score leads, identify pipeline risk, and recommend concise next actions. Return JSON only.",
  intelligence: "You are ADGA Suite Intelligence Agent. Produce sourced business intelligence and mark assumptions. Return JSON only.",
  documents: "You are ADGA Suite Documents Agent. Draft and summarize business documents without inventing commitments. Return JSON only.",
  operations: "You are ADGA Suite Operations Agent. Handle onboarding, reminders, setup gaps, and workflow hygiene. Return JSON only.",
};

function localAgentOutput(job: AgentJob) {
  const prompt = String(job.input.prompt || job.input.message || "");
  const lower = prompt.toLowerCase();
  const route =
    lower.includes("pipeline") ? "pipeline" :
    lower.includes("lead") ? "leads" :
    lower.includes("document") || lower.includes("proposal") ? "documents" :
    lower.includes("admin") ? "admin" :
    lower.includes("billing") ? "billing" :
    lower.includes("story") || lower.includes("timeline") ? "story" :
    null;

  return {
    summary: route
      ? `Routing this to ${route} and preparing the next action.`
      : "I created an agent job and prepared the next action for review.",
    route,
    recommendation: {
      label: route ? `Open ${route}` : "Review recommendation",
      risk: "requires_review",
      human_approval_required: true,
    },
    actions: route ? [{ type: "route", route }] : [],
    source: "local-deterministic-agent",
  };
}

export async function runAgentJob(env: CloudflareEnv, job: AgentJob) {
  if (!env.AI) return localAgentOutput(job);

  try {
    const result = await runAgentModel<Record<string, unknown>>(
      { AI: env.AI, ADGA_AI_MODEL: env.ADGA_AI_MODEL },
      {
        system: agentSystems[job.agent],
        user: JSON.stringify({
          job_type: job.job_type,
          input: job.input,
          output_contract: {
            summary: "short user-facing agent result",
            route: "optional suite route",
            recommendation: "object with label, risk, human_approval_required",
            actions: "array of proposed actions",
          },
        }),
        json: true,
      },
    );

    return {
      ...normalizeModelOutput(result.output),
      model: result.model,
      source: "cloudflare-worker-ai",
    };
  } catch (error) {
    return {
      ...localAgentOutput(job),
      source: "local-fallback-after-ai-error",
      error: error instanceof Error ? error.message : "Unknown AI runtime error",
    };
  }
}

function normalizeModelOutput(output: unknown) {
  const content = extractMessageContent(output);
  if (content) {
    try {
      return JSON.parse(content) as Record<string, unknown>;
    } catch {
      return { summary: content };
    }
  }

  if (output && typeof output === "object") return output as Record<string, unknown>;
  return { summary: String(output || "Agent completed.") };
}

function extractMessageContent(output: unknown) {
  if (!output || typeof output !== "object") return null;
  const choices = (output as { choices?: Array<{ message?: { content?: string } }> }).choices;
  const content = choices?.[0]?.message?.content;
  return typeof content === "string" && content.trim() ? content.trim() : null;
}
