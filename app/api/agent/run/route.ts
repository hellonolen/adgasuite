import { runAgentJob } from "@/lib/agents/engine";
import { json } from "@/lib/server/http";
import {
  completeAgentJob,
  failAgentJob,
  listQueuedAgentJobs,
  markAgentJobRunning,
} from "@/lib/server/repository";
import { getRuntimeContext, requireAdmin } from "@/lib/server/runtime";

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  requireAdmin(context);

  const jobs = await listQueuedAgentJobs(context.env.DB, 5);
  const processed = [];

  for (const queued of jobs) {
    const running = await markAgentJobRunning(context.env.DB, queued);
    try {
      const output = await runAgentJob(context.env, running);
      processed.push(await completeAgentJob(context.env.DB, running, output));
    } catch (error) {
      processed.push(
        await failAgentJob(
          context.env.DB,
          running,
          error instanceof Error ? error.message : "Unknown agent runner error",
        ),
      );
    }
  }

  return json({ ok: true, processed });
}
