// Skill handler registry.
//
// The agentic backbone says agents must communicate via events, never via
// direct imports. That holds for the AUDIT path — every cross-agent call
// emits an event so the trail is replayable.
//
// But synchronous workflows ("Conductor composing the daily brief needs the
// Intelligence agent's pipeline-risk read RIGHT NOW") need a request/response
// shape. This module is that shape:
//
//   callSkill(context, "pipeline-risk", { organization_id, ... })
//
// resolves to the skill's typed output. The call publishes an
// `agent_job.started` event before invocation and `agent_job.completed` or
// `agent_job.failed` after, so the bus still has the trail.
//
// The handler is a pure function — same input, same output. The handler is
// the executable counterpart to the `skills/<id>.skill.md` markdown contract.

import { publish } from "@/lib/events/bus";
import type { AgentName } from "@/lib/server/repository";
import { newId } from "@/lib/server/id";

export interface SkillContext {
  env: CloudflareEnv;
  organization_id: string;
  actor_type: "user" | "agent" | "system" | "webhook" | "cron";
  actor_id: string | null;
  /**
   * If this call was made by another skill, who is calling. Lets the audit
   * trail reconstruct the agent-to-agent chain.
   */
  calling_skill?: string | null;
}

export type SkillHandler<I = Record<string, unknown>, O = Record<string, unknown>> = (
  context: SkillContext,
  input: I,
) => Promise<O>;

interface RegisteredSkill {
  id: string;
  owner: AgentName;
  handler: SkillHandler;
}

const REGISTRY: Map<string, RegisteredSkill> = new Map();

export function registerSkill<I, O>(
  id: string,
  owner: AgentName,
  handler: SkillHandler<I, O>,
): void {
  REGISTRY.set(id, { id, owner, handler: handler as SkillHandler });
}

export function getRegisteredSkill(id: string): RegisteredSkill | null {
  return REGISTRY.get(id) || null;
}

export function listRegisteredSkills(): Array<{ id: string; owner: AgentName }> {
  return Array.from(REGISTRY.values()).map((s) => ({ id: s.id, owner: s.owner }));
}

/**
 * callSkill — the "agents talk to each other" primitive.
 *
 * Conductor's composer can:
 *
 *   const risk = await callSkill(ctx, "pipeline-risk", { organization_id });
 *
 * and get a typed result while the bus records start + completion.
 */
export async function callSkill<I = Record<string, unknown>, O = Record<string, unknown>>(
  context: SkillContext,
  skillId: string,
  input: I,
): Promise<{ ok: boolean; data?: O; error?: string }> {
  const skill = getRegisteredSkill(skillId);
  if (!skill) {
    return { ok: false, error: `No skill handler registered for "${skillId}"` };
  }
  const jobId = newId("call");
  await publish(context.env.DB, {
    organization_id: context.organization_id,
    event_type: "agent_job.started",
    actor_type: context.actor_type,
    actor_id: context.actor_id,
    resource_type: "skill_call",
    resource_id: jobId,
    payload: {
      job_id: jobId,
      agent: skill.owner,
      job_type: skillId,
      dispatch: "skill_call",
      calling_skill: context.calling_skill || null,
    },
  }).catch(() => null);

  try {
    const data = (await skill.handler(
      { ...context, calling_skill: context.calling_skill || skillId },
      input as Record<string, unknown>,
    )) as O;
    await publish(context.env.DB, {
      organization_id: context.organization_id,
      event_type: "agent_job.completed",
      actor_type: context.actor_type,
      actor_id: context.actor_id,
      resource_type: "skill_call",
      resource_id: jobId,
      payload: { job_id: jobId, agent: skill.owner, job_type: skillId, ok: true },
    }).catch(() => null);
    return { ok: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Skill handler threw";
    await publish(context.env.DB, {
      organization_id: context.organization_id,
      event_type: "agent_job.failed",
      actor_type: context.actor_type,
      actor_id: context.actor_id,
      resource_type: "skill_call",
      resource_id: jobId,
      payload: { job_id: jobId, agent: skill.owner, job_type: skillId, error: message },
    }).catch(() => null);
    return { ok: false, error: message };
  }
}
