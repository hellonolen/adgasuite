import { errorJson, json, readJson } from "@/lib/server/http";
import { createAgentJob, createEvent, createWorkflowState } from "@/lib/server/repository";
import { getRuntimeContext, requireAdmin } from "@/lib/server/runtime";

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  requireAdmin(context);
  const body = await readJson<{
    workflow_type?: string;
    resource_type?: string;
    resource_id?: string;
    state?: Record<string, unknown>;
  }>(request);

  if (!body.workflow_type) return errorJson("workflow_type is required.");

  const workflow = await createWorkflowState(context.env.DB, {
    workflow_type: body.workflow_type,
    resource_type: body.resource_type,
    resource_id: body.resource_id,
    state: body.state || {},
  });

  const event = await createEvent(context.env.DB, {
    organization_id: "org_adga_primary",
    event_type: `workflow.${body.workflow_type}.started`,
    actor_type: "user",
    actor_id: context.user.email,
    resource_type: body.resource_type || "workflow",
    resource_id: workflow.id,
    payload: { workflow_id: workflow.id, state: body.state || {} },
  });

  const job = await createAgentJob(context.env.DB, {
    agent: "conductor",
    job_type: "workflow.orchestration",
    input: {
      workflow_type: body.workflow_type,
      resource_type: body.resource_type,
      resource_id: body.resource_id,
      state: body.state || {},
      workflow_id: workflow.id,
      event_id: event.id,
    },
  });

  return json({ ok: true, workflow, event, job });
}
