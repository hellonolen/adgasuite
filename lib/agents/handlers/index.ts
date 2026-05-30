// Skill handler registration entrypoint. Importing this module wires every
// handler into the registry so callSkill() can dispatch them.
//
// Each handler:
//   - has a matching skills/<id>.skill.md markdown contract
//   - is owned by one of the 7 agents
//   - publishes its own telemetry events on completion
//   - is idempotent so bus replay is safe

import { registerSkill } from "@/lib/agents/skill-registry";
import {
  workspaceActivation,
  type WorkspaceActivationInput,
  type WorkspaceActivationOutput,
} from "./workspace-activation";
import {
  dealflowTemplateMaterialization,
  type DealflowMaterializationInput,
  type DealflowMaterializationOutput,
} from "./dealflow-template-materialization";

let registered = false;

export function ensureSkillHandlersRegistered(): void {
  if (registered) return;
  registered = true;

  registerSkill<WorkspaceActivationInput, WorkspaceActivationOutput>(
    "workspace-activation",
    "conductor",
    workspaceActivation,
  );
  registerSkill<DealflowMaterializationInput, DealflowMaterializationOutput>(
    "dealflow-template-materialization",
    "conductor",
    dealflowTemplateMaterialization,
  );
}

// Auto-register on import for routes that bring this module in.
ensureSkillHandlersRegistered();
