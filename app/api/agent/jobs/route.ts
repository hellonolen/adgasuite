import { runAgentJob } from "@/lib/agents/engine";
import { errorJson, json, readJson } from "@/lib/server/http";
import { completeAgentJob, createAgentJob, listAgentJobs, type AgentName } from "@/lib/server/repository";
import { getRuntimeContext, requireAdmin } from "@/lib/server/runtime";
import { publish } from "@/lib/events/bus";

const agents = new Set(["conductor", "sales", "intelligence", "documents", "operations", "communication", "payments"]);

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  requireAdmin(context);
  return json({ ok: true, jobs: await listAgentJobs(context.env.DB) });
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  requireAdmin(context);

  const body = await readJson<{
    agent?: string;
    job_type?: string;
    prompt?: string;
    message?: string;
    context?: Record<string, unknown>;
    run_now?: boolean;
  }>(request);

  const agent = agents.has(body.agent || "") ? (body.agent as AgentName) : "conductor";
  const prompt = String(body.prompt || body.message || "").trim();
  if (!prompt) return errorJson("Agent job requires a prompt or message.");

  const job = await createAgentJob(context.env.DB, {
    agent,
    job_type: body.job_type || "suite.command",
    input: {
      prompt,
      context: body.context || {},
      requested_by: context.user.email,
    },
  });

  // Every job creation fans through the bus so subscribers (Conductor, Intelligence) react.
  await publish(context.env.DB, {
    organization_id: job.organization_id || "org_adga_primary",
    event_type: "agent_job.started",
    actor_type: "user",
    actor_id: context.user.email || "anonymous",
    resource_type: "agent_job",
    resource_id: job.id,
    payload: { job_id: job.id, agent, job_type: job.job_type },
  });

  if (body.run_now === false) return json({ ok: true, job });

  try {
    const output = await runAgentJob(context.env, job);
    const completed = await completeAgentJob(context.env.DB, job, output);
    await publish(context.env.DB, {
      organization_id: job.organization_id || "org_adga_primary",
      event_type: "agent_job.completed",
      actor_type: "agent",
      actor_id: agent,
      resource_type: "agent_job",
      resource_id: job.id,
      payload: { job_id: job.id, agent, summary: (output as any)?.summary },
    });
    return json({ ok: true, job: completed, output });
  } catch (err) {
    await publish(context.env.DB, {
      organization_id: job.organization_id || "org_adga_primary",
      event_type: "agent_job.failed",
      actor_type: "agent",
      actor_id: agent,
      resource_type: "agent_job",
      resource_id: job.id,
      payload: { job_id: job.id, agent, error: err instanceof Error ? err.message : String(err) },
    });
    throw err;
  }
}
