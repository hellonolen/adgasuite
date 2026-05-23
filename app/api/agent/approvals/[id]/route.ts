import { errorJson, json, readJson } from "@/lib/server/http";
import { decideAgentApproval } from "@/lib/server/repository";
import { getRuntimeContext, requireAdmin } from "@/lib/server/runtime";
import { publish } from "@/lib/events/bus";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = getRuntimeContext(request);
  requireAdmin(context);
  const routeParams = await params;
  const body = await readJson<{
    status?: "approved" | "rejected" | "edited";
    proposed_action?: string;
    payload?: Record<string, unknown>;
  }>(request);

  if (!body.status || !["approved", "rejected", "edited"].includes(body.status)) {
    return errorJson("status must be approved, rejected, or edited.");
  }

  const approval = await decideAgentApproval(context.env.DB, routeParams.id, {
    status: body.status,
    proposed_action: body.proposed_action,
    payload: body.payload,
    decided_by: context.user.email,
  });

  if (!approval) return errorJson("approval not found.", 404);

  await publish(context.env.DB, {
    organization_id: approval.organization_id,
    event_type: `agent_approval.${approval.status}`,
    actor_type: "user",
    actor_id: context.user.email,
    resource_type: "agent_approval",
    resource_id: approval.id,
    payload: {
      approval_id: approval.id,
      agent: approval.agent,
      title: approval.title,
      resource_type: approval.resource_type,
      resource_id: approval.resource_id,
    },
  });

  return json({ ok: true, approval });
}
