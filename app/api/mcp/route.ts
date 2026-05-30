import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext, hydrateUserFromSession, requireAdmin } from "@/lib/server/runtime";
import { listMcpTools } from "@/mcp-server";
import { SUITE_ROUTES } from "@/app/suite/routes";
import { WORKSPACES, listAllActions } from "@/app/suite/workspaces";
import { inspectHandlers, publish } from "@/lib/events/bus";
import { hasNativeHandler, listNativeDispatchIds, runNativeDispatch } from "@/lib/server/mcp-native-dispatch";
import { callSkill, getRegisteredSkill, listRegisteredSkills } from "@/lib/agents/skill-registry";
import "@/lib/agents/handlers"; // side-effect: registers all skill handlers

/**
 * MCP transport — HTTP-based discovery and dispatch surface.
 *
 *   GET  /api/mcp                       → PUBLIC capability inventory (contracts only)
 *   POST /api/mcp  { tool, arguments }  → ADMIN-GATED dispatch
 *
 * Security model: GET is public by design. The inventory is contracts — route capabilities,
 * workspace actions, skills — same shape published in code. External orchestrators (Claude
 * Code, OpenAI assistants, custom agents) need to discover this without auth. No customer
 * data, no PII, no event payloads exposed by GET.
 *
 * POST is admin-gated because it can fire actions. Actions with approval_required policy
 * return 202 and direct the caller through /api/agent/approvals. owner_only returns 403.
 * auto policy fans through the bus so internal agents handle the work.
 */

interface McpToolCallBody {
  tool?: string;
  arguments?: Record<string, unknown>;
}

// Bus handler stats include only counts (handlers per event_type), no payloads. Safe to
// expose so external orchestration can verify subscribers are attached before dispatching.
export async function GET(_request: Request) {
  const tools = listMcpTools();
  const actions = listAllActions();

  return json({
    ok: true,
    server: {
      name: "adga-suite",
      version: "0.1.0",
      description: "ADGA Suite agentic surface — workspace, action, and skill capabilities.",
    },
    contracts: {
      routes: SUITE_ROUTES.map((r) => ({
        id: r.id,
        path: r.path,
        label: r.label,
        capabilities: r.capabilities ?? [],
      })),
      workspaces: WORKSPACES.map((w) => ({
        id: w.id,
        rendererPath: w.rendererPath,
        requiredAgents: w.requiredAgents,
        requiredSkills: w.requiredSkills,
        emitsEvents: w.emitsEvents,
        reactsToEvents: w.reactsToEvents,
        capabilityVisibility: w.capabilityVisibility,
        approvalPolicy: w.approvalPolicy,
      })),
      actions,
    },
    tools,
    bus: {
      handlers: inspectHandlers(),
    },
    native_dispatch: listNativeDispatchIds(),
    registered_skills: listRegisteredSkills(),
  });
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  try {
    requireAdmin(context);
  } catch (response) {
    if (response instanceof Response) return response;
    return errorJson("Forbidden", 403);
  }

  await hydrateUserFromSession(context, request);

  const body = await readJson<McpToolCallBody>(request);
  if (!body.tool) return errorJson("`tool` is required.");

  // skill.<id> tool name → dispatch directly to the registered skill handler.
  // This makes every executable skill callable through MCP without needing a
  // route capability declaration.
  if (body.tool.startsWith("skill.")) {
    const skillId = body.tool.slice("skill.".length);
    if (!getRegisteredSkill(skillId)) {
      return errorJson(`Unknown skill "${skillId}". GET /api/mcp to discover the current inventory.`, 404);
    }
    const result = await callSkill(
      {
        env: context.env,
        organization_id: "org_adga_primary",
        actor_type: "agent",
        actor_id: "mcp",
        calling_skill: `mcp:${body.tool}`,
      },
      skillId,
      (body.arguments ?? {}) as Record<string, unknown>,
    );
    return json(
      { ok: result.ok, dispatched: true, dispatch: "skill", skill: skillId, result: result.data, error: result.error },
      { status: result.ok ? 200 : 502 },
    );
  }

  // Look up the action by qualified id ("<workspace>.<action_id>").
  const all = listAllActions();
  const action = all.find((a) => `${a.workspace}.${a.id}` === body.tool);

  if (!action) {
    return errorJson(
      `Unknown tool "${body.tool}". GET /api/mcp to discover the current inventory.`,
      404,
    );
  }

  // Approval gate: actions with non-auto policy can't fire from MCP without an approval flow.
  if (action.policy.mode === "approval_required") {
    return json(
      {
        ok: false,
        reason: "approval_required",
        action,
        next_step:
          "POST /api/agent/approvals with the action payload, then call this tool again with the approval id.",
      },
      { status: 202 },
    );
  }
  if (action.policy.mode === "owner_only") {
    return errorJson("This tool is owner-only and cannot be invoked through MCP.", 403);
  }

  const actionId = `${action.workspace}.${action.id}`;

  // GAP #10 — native handler dispatch. If this specific action has a native
  // handler registered, run it inline and return the result deterministically.
  // Otherwise fall through to the generic event-emit path so a subscribing
  // agent picks it up.
  if (hasNativeHandler(actionId)) {
    const result = await runNativeDispatch(actionId, {
      env: context.env,
      organizationId: "org_adga_primary",
      arguments: body.arguments ?? {},
      actorEmail: context.user.email || null,
    });
    await publish(context.env.DB, {
      organization_id: "org_adga_primary",
      event_type: "agent_job.completed",
      actor_type: "agent",
      actor_id: "mcp",
      resource_type: "workspace_action",
      resource_id: actionId,
      payload: {
        job_id: `mcp-${Date.now()}`,
        agent: "mcp",
        job_type: action.id,
        dispatch: "native",
        ok: result.ok,
        error: result.error || null,
        data: result.data || null,
      },
    });
    return json({
      ok: result.ok,
      dispatched: true,
      dispatch: "native",
      action,
      result: result.data,
      error: result.error,
    }, { status: result.ok ? 200 : 502 });
  }

  // Auto-dispatch path: emit a domain event so any subscribed agent reacts.
  await publish(context.env.DB, {
    organization_id: "org_adga_primary",
    event_type: "agent_job.started",
    actor_type: "agent",
    actor_id: "mcp",
    resource_type: "workspace_action",
    resource_id: actionId,
    payload: {
      job_id: `mcp-${Date.now()}`,
      agent: "mcp",
      job_type: action.id,
      arguments: body.arguments ?? {},
    },
  });

  return json({
    ok: true,
    dispatched: true,
    dispatch: "event",
    action,
    note: "Action emitted as an agent_job.started event. Subscribers will handle it.",
  });
}
