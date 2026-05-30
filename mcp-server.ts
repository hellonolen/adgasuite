/**
 * MCP surface — exposes the suite's agentic capabilities as MCP tools.
 *
 * Capabilities are sourced from `app/suite/routes.ts` (per-route capability declarations) and
 * the `skills/` directory (one tool per skill). The naming convention is
 *   <route-id>.<capability>   (e.g. "pipeline.deal.update_stage")
 *   skill.<skill-id>          (e.g. "skill.lead-scoring")
 *
 * This file is intentionally lightweight — runtime mounting happens in the Worker entry point
 * (managed by `@opennextjs/cloudflare`). The tool definitions below are the discovery surface;
 * the actual handlers live in the agent modules under `agents/<name>/`.
 */

import { SUITE_ROUTES } from "@/app/suite/routes";

export interface McpToolDefinition {
  name: string;
  description: string;
  source: "route" | "skill";
  sourceId: string;
}

export function listMcpTools(): McpToolDefinition[] {
  const tools: McpToolDefinition[] = [];

  for (const route of SUITE_ROUTES) {
    for (const cap of route.capabilities ?? []) {
      tools.push({
        name: `${route.id}.${cap}`,
        description: `Capability "${cap}" exposed by the ${route.label} surface.`,
        source: "route",
        sourceId: route.id,
      });
    }
  }

  // Skills inventory — keep in sync with skills/<id>.skill.md files. Any skill
  // with a registered handler in lib/agents/handlers/ is callable from the MCP
  // POST surface via skill.<id> tool name (dispatches through callSkill).
  const SKILLS = [
    // Original suite skills
    "lead-scoring",
    "pipeline-risk",
    "proposal-generation",
    "battlecard-generation",
    "knowledge-summary",
    // Workspace lifecycle + brief composition
    "workspace-activation",
    "dealflow-template-materialization",
    "daily-brief",
    "team-invite",
    "team-invite.accept",
    // Import wedge — CSV/paste in v1, third-party adapters land later
    "csv-import",
    "import-hubspot",
    "import-pipedrive",
    "import-salesforce",
    "import-notion",
    "import-airtable",
    "import-enrichment",
    // Record-graph capability surface (lists / timelines / inbox sync / custom objects / comments)
    "list-segment",
    "activity-timeline",
    "inbox-sync",
    "custom-object",
    "record-comment",
  ];
  for (const skillId of SKILLS) {
    tools.push({
      name: `skill.${skillId}`,
      description: `Skill ${skillId} (see skills/${skillId}.skill.md).`,
      source: "skill",
      sourceId: skillId,
    });
  }

  return tools;
}

// Future: MCP server bootstrap (stdio / HTTP transport) wired here. For now the inventory is
// queryable and the agent modules consume the same `routes.ts` contract so capability drift
// can be detected at build time.
