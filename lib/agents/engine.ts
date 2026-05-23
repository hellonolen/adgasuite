import fs from 'fs';
import path from 'path';
import { runAgentModel, type CloudflareAI } from "@/lib/ai/cloudflare-worker-ai";
import type { AgentJob, AgentName } from "@/lib/server/repository";

const AGENTS_DIR = path.join(process.cwd(), 'agents');

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatAction {
  type: string;
  [key: string]: unknown;
}

export interface ChatRunInput {
  systemPrompt: string;
  messages: ChatMessage[];
}

export interface ChatRunResult {
  message: ChatMessage;
  actions: ChatAction[];
  model: string;
  source: "cloudflare-worker-ai" | "local-fallback";
}

export async function runChatTurn(
  env: { AI?: CloudflareAI; ADGA_AI_MODEL?: string },
  input: ChatRunInput,
): Promise<ChatRunResult> {
  if (!env.AI) {
    return {
      message: {
        role: "assistant",
        content:
          "AI is unavailable in local dev. The Cloudflare Worker AI binding is only attached in deployed environments. Once shipped, Kimi 2.6 will respond here with full context awareness.",
      },
      actions: [],
      model: env.ADGA_AI_MODEL || "@cf/moonshotai/kimi-k2.6",
      source: "local-fallback",
    };
  }

  const model = env.ADGA_AI_MODEL || "@cf/moonshotai/kimi-k2.6";
  const messages: ChatMessage[] = [
    { role: "system", content: input.systemPrompt },
    ...input.messages,
  ];

  try {
    const raw = (await env.AI.run(model, { messages })) as unknown;
    const content = extractAssistantContent(raw);
    const { reply, actions } = splitReplyAndActions(content);

    return {
      message: { role: "assistant", content: reply },
      actions,
      model,
      source: "cloudflare-worker-ai",
    };
  } catch (error) {
    return {
      message: {
        role: "assistant",
        content:
          error instanceof Error
            ? `I hit an AI runtime error: ${error.message}. Please retry in a moment.`
            : "I hit an unknown AI runtime error. Please retry in a moment.",
      },
      actions: [],
      model,
      source: "local-fallback",
    };
  }
}

function extractAssistantContent(output: unknown): string {
  if (typeof output === "string") return output.trim();
  if (!output || typeof output !== "object") return "";

  const direct = (output as { response?: string }).response;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const choices = (output as { choices?: Array<{ message?: { content?: string } }> }).choices;
  const choiceContent = choices?.[0]?.message?.content;
  if (typeof choiceContent === "string" && choiceContent.trim()) return choiceContent.trim();

  const message = (output as { message?: { content?: string } }).message;
  if (typeof message?.content === "string" && message.content.trim()) return message.content.trim();

  return "";
}

function splitReplyAndActions(content: string): { reply: string; actions: ChatAction[] } {
  if (!content) return { reply: "I did not produce a response. Please retry.", actions: [] };

  // Look for a fenced ```json ACTIONS block or a trailing JSON line with {"actions":[...]}.
  const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    const parsed = tryParseActions(fenceMatch[1]);
    if (parsed) {
      const reply = content.replace(fenceMatch[0], "").trim();
      return { reply: reply || "Done.", actions: parsed };
    }
  }

  const jsonLineMatch = content.match(/\{\s*"actions"\s*:\s*\[[\s\S]*?\]\s*\}\s*$/);
  if (jsonLineMatch) {
    const parsed = tryParseActions(jsonLineMatch[0]);
    if (parsed) {
      const reply = content.replace(jsonLineMatch[0], "").trim();
      return { reply: reply || "Done.", actions: parsed };
    }
  }

  return { reply: content, actions: [] };
}

function tryParseActions(raw: string): ChatAction[] | null {
  try {
    const parsed = JSON.parse(raw.trim());
    if (Array.isArray(parsed?.actions)) {
      return parsed.actions.filter(
        (a: unknown): a is ChatAction => Boolean(a) && typeof a === "object" && typeof (a as { type?: unknown }).type === "string",
      );
    }
  } catch {
    return null;
  }
  return null;
}

function getAgentSystemPrompt(agent: AgentName): string {
  try {
    const skillPath = path.join(AGENTS_DIR, agent, 'SKILL.md');
    if (fs.existsSync(skillPath)) {
      const content = fs.readFileSync(skillPath, 'utf8');
      return `You are an ADGA Suite agent. Your instructions and mandates follow:\n\n${content}\n\nReturn JSON only.`;
    }
  } catch (e) {
    console.error(`Failed to read SKILL.md for ${agent}`, e);
  }

  // Fallback if file read fails or doesn't exist
  const fallbacks: Record<AgentName, string> = {
    conductor: "You are ADGA Suite Conductor. Route work, identify the next best workflow step, and return JSON only.",
    sales: "You are ADGA Suite Sales Agent. Score leads, identify pipeline risk, and recommend concise next actions. Return JSON only.",
    intelligence: "You are ADGA Suite Intelligence Agent. Produce sourced business intelligence and mark assumptions. Return JSON only.",
    documents: "You are ADGA Suite Documents Agent. Draft and summarize business documents without inventing commitments. Return JSON only.",
    operations: "You are ADGA Suite Operations Agent. Handle onboarding, reminders, setup gaps, and workflow hygiene. Return JSON only.",
    communication: "You are ADGA Suite Communication Agent. Coordinate email, SMS, calls, voice notes, meeting invites, and internal/client updates with resource traceability. Return JSON only.",
    payments: "You are ADGA Suite Payments Agent. Coordinate invoices, payment connectors, payout setup, fee tracking, and billing workflow recommendations. Return JSON only.",
  };
  return fallbacks[agent];
}

function localAgentOutput(job: AgentJob) {
  const prompt = String(job.input.prompt || job.input.message || "");
  const lower = prompt.toLowerCase();
  const route =
    lower.includes("pipeline") ? "pipeline" :
    lower.includes("lead") ? "leads" :
    lower.includes("document") || lower.includes("proposal") ? "documents" :
    lower.includes("invoice") || lower.includes("payment") || lower.includes("bank") ? "invoicing" :
    lower.includes("sms") || lower.includes("email") || lower.includes("message") || lower.includes("voice") ? "messaging" :
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
    const system = getAgentSystemPrompt(job.agent);
    const result = await runAgentModel<Record<string, unknown>>(
      { AI: env.AI, ADGA_AI_MODEL: env.ADGA_AI_MODEL },
      {
        system,
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
