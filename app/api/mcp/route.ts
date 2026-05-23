import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext, requireAdmin } from "@/lib/server/runtime";
import { listMcpTools } from "@/mcp-server";
import { SUITE_ROUTES } from "@/app/suite/routes";
import { WORKSPACES, listAllActions } from "@/app/suite/workspaces";
import { inspectHandlers, publish } from "@/lib/events/bus";

/**
 * MCP transport — HTTP-based discovery and dispatch surface.
 *
 *   GET  /api/mcp                       → full capability inventory + bus handler stats
 *   POST /api/mcp  { tool, arguments }  → discover/dispatch a tool call (admin-gated)
 *
 * The inventory is generated from the contracts — no hand-maintained tool list. External
 * orchestrators (Claude Code, OpenAI assistants, custom agents) call GET to learn what the
 * suite exposes; POST is the dispatch path. Dispatch today is intentionally minimal —
 * known tools resolve to bus event publication so the platform's own agents react. Direct
 * action handlers (e.g. "deal.update_stage" wired to the deal mutation API) land in a
 * follow-up once each WorkspaceAction has its handler reference.
 */

interface McpToolCallBody {
  tool?: string;
  arguments?: Record<string, unknown>;
}

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  try {
    requireAdmin(context);
  } catch (response) {
    if (response instanceof Response) return response;
    return errorJson("Forbidden", 403);
  }

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

  const body = await readJson<McpToolCallBody>(request);
  if (!body.tool) return errorJson("`tool` is required.");

  // Look up the action by qualified id ("<workspace>.<action_id>" or "skill.<id>").
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

  // Auto-dispatch path: emit a domain event so any subscribed agent reacts.
  await publish(context.env.DB, {
    organization_id: "org_adga_primary",
    event_type: "agent_job.started",
    actor_type: "agent",
    actor_id: "mcp",
    resource_type: "workspace_action",
    resource_id: `${action.workspace}.${action.id}`,
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
    action,
    note: "Action emitted as an agent_job.started event. Subscribers will handle it.",
  });
}
