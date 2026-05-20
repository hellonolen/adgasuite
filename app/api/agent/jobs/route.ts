import { runAgentJob } from "@/lib/agents/engine";
import { errorJson, json, readJson } from "@/lib/server/http";
import { completeAgentJob, createAgentJob, listAgentJobs, type AgentName } from "@/lib/server/repository";
import { getRuntimeContext, requireAdmin } from "@/lib/server/runtime";

const agents = new Set(["conductor", "sales", "intelligence", "documents", "operations"]);

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

  if (body.run_now === false) return json({ ok: true, job });

  const output = await runAgentJob(context.env, job);
  const completed = await completeAgentJob(context.env.DB, job, output);

  return json({
    ok: true,
    job: completed,
    output,
  });
}
