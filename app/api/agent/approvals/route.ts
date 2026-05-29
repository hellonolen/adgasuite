import { errorJson, json, readJson } from "@/lib/server/http";
import { createAgentApproval, listAgentApprovals, type AgentName } from "@/lib/server/repository";
import { getRuntimeContext, requireAdmin } from "@/lib/server/runtime";
import { publish } from "@/lib/events/bus";
import { normalizePreparedAction } from "@/lib/agents/prepared-actions";
import { notifyApprovalRequested } from "@/lib/server/approval-notify";

const agents = new Set(["conductor", "sales", "intelligence", "documents", "operations", "communication", "payments"]);

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  requireAdmin(context);
  return json({ ok: true, approvals: await listAgentApprovals(context.env.DB) });
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  requireAdmin(context);
  const body = await readJson<{
    agent?: string;
    title?: string;
    proposed_action?: string;
    risk?: "low" | "medium" | "high";
    resource_type?: string;
    resource_id?: string;
    payload?: Record<string, unknown>;
    prepared_action?: Record<string, unknown>;
  }>(request);

  if (!body.title || !body.proposed_action) {
    return errorJson("title and proposed_action are required.");
  }

  const agent = agents.has(body.agent || "") ? (body.agent as AgentName) : "conductor";
  const preparedActionInput = body.prepared_action || body.payload?.prepared_action;
  const preparedAction = preparedActionInput ? normalizePreparedAction(preparedActionInput) : null;
  if (preparedActionInput && !preparedAction) {
    return errorJson("prepared_action is invalid or missing required fields.");
  }

  const approval = await createAgentApproval(context.env.DB, {
    agent,
    title: body.title,
    proposed_action: body.proposed_action,
    risk: body.risk || "medium",
    resource_type: body.resource_type || null,
    resource_id: body.resource_id || null,
    payload: preparedAction ? { ...(body.payload || {}), prepared_action: preparedAction } : body.payload || {},
  });

  await publish(context.env.DB, {
    organization_id: approval.organization_id,
    event_type: "agent_approval.requested",
    actor_type: "user",
    actor_id: context.user.email,
    resource_type: "agent_approval",
    resource_id: approval.id,
    payload: {
      approval_id: approval.id,
      agent: approval.agent,
      title: approval.title,
      risk: approval.risk,
    },
  });

  // GAP #7 — fire-and-forget notification. Postmark failures don't block the
  // approval. The audit trail already records the request; the email is a
  // delivery layer on top.
  await notifyApprovalRequested(context.env.DB, {
    env: context.env,
    organizationId: approval.organization_id,
    payload: {
      approval_id: approval.id,
      agent: approval.agent,
      title: approval.title,
      risk: approval.risk as "low" | "medium" | "high",
    },
  }).catch(() => null);

  return json({ ok: true, approval });
}
