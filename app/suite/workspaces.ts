/**
 * Workspace contract — declares everything the shell needs to compose a /suite/* surface
 * dynamically. Goes one level deeper than the URL contract in `routes.ts`:
 *
 *   routes.ts    answers "what URLs exist and what label does each carry."
 *   workspaces.ts answers "what AGENT-FACING shape does each surface have."
 *
 * The shell composes from this contract — there are no hand-written switch statements that
 * map route ids to render branches. To onboard a new workspace:
 *
 *   1. Add a row to SUITE_ROUTES in routes.ts (URL + label + sidebar group).
 *   2. Add a matching entry in WORKSPACES below (renderer + capabilities + policy).
 *   3. Create the renderer file under components/suite/workspaces/<Name>.tsx.
 *
 * Nothing in AdgaSuite.tsx changes when you add a workspace.
 */

import type { DomainEventType } from "@/lib/events/types";

export type CapabilityVisibility = "owner" | "team" | "member" | "public";
export type ApprovalPolicy =
  | { mode: "auto" }
  | { mode: "approval_required"; risk: "low" | "medium" | "high" }
  | { mode: "owner_only" };

/** Identifiers of the canonical 7 agents per AGENTIC_BACKBONE.md. */
export type AgentId =
  | "conductor"
  | "research"
  | "creative"
  | "production"
  | "distribution"
  | "sales"
  | "intelligence";

/** A registered action a workspace exposes to its users (and to the agent fleet via MCP). */
export interface WorkspaceAction {
  id: string;
  label: string;
  /** Required role / scope to invoke this action. */
  visibility: CapabilityVisibility;
  /** Whether this action passes through the autonomy gate before execution. */
  policy: ApprovalPolicy;
  /** Events the action emits when it fires. Drives event-driven UI updates elsewhere. */
  emits?: DomainEventType[];
}

export interface WorkspaceContract {
  /** Matches the route id in routes.ts. */
  id: string;
  /**
   * Renderer reference. The shell lazy-imports this path. Pointer (string) instead of a direct
   * import so we don't pull the entire workspace tree into the bundle just to render the sidebar.
   */
  rendererPath: string;
  /** Agents that must be online for this workspace to function fully. */
  requiredAgents: AgentId[];
  /** Skill ids (matching skills/<name>.skill.md) the renderer uses. */
  requiredSkills: string[];
  /** Domain events this workspace may emit (used as the agent-facing surface contract). */
  emitsEvents: DomainEventType[];
  /** Domain events this workspace reacts to (rendered UI updates). */
  reactsToEvents: DomainEventType[];
  /** User-facing actions the workspace exposes. */
  allowedActions: WorkspaceAction[];
  /** Sidebar-level visibility — does the surface even show up for this role? */
  capabilityVisibility: CapabilityVisibility;
  /** Default approval policy when the workspace itself initiates actions. */
  approvalPolicy: ApprovalPolicy;
}

/**
 * Workspace registry. Empty entries are valid — they say "we're aware of this surface but
 * haven't yet declared its agentic shape." Surfaces without an entry fall back to the
 * legacy in-AdgaSuite renderer (during the migration window).
 */
export const WORKSPACES: WorkspaceContract[] = [
  {
    id: "billing",
    rendererPath: "components/suite/workspaces/BillingWorkspace",
    requiredAgents: ["intelligence", "conductor"],
    requiredSkills: [],
    emitsEvents: ["revenue.captured"],
    reactsToEvents: ["revenue.captured", "forecast.below_target"],
    allowedActions: [
      {
        id: "billing.update_payment_method",
        label: "Update payment method",
        visibility: "owner",
        policy: { mode: "owner_only" },
      },
      {
        id: "billing.download_invoice",
        label: "Download invoice",
        visibility: "team",
        policy: { mode: "auto" },
      },
    ],
    capabilityVisibility: "owner",
    approvalPolicy: { mode: "owner_only" },
  },
  {
    id: "voice-notes",
    rendererPath: "components/suite/workspaces/VoiceNotesWorkspace",
    requiredAgents: ["intelligence"],
    requiredSkills: ["knowledge-summary"],
    emitsEvents: [],
    reactsToEvents: [],
    allowedActions: [
      {
        id: "voice.transcribe_upload",
        label: "Transcribe uploaded audio",
        visibility: "member",
        policy: { mode: "auto" },
      },
      {
        id: "voice.save_live_note",
        label: "Save live transcript",
        visibility: "member",
        policy: { mode: "auto" },
      },
    ],
    capabilityVisibility: "member",
    approvalPolicy: { mode: "auto" },
  },
  {
    id: "messaging",
    rendererPath: "components/suite/workspaces/MessagingWorkspace",
    requiredAgents: ["sales"],
    requiredSkills: [],
    emitsEvents: [],
    reactsToEvents: [],
    allowedActions: [
      {
        id: "messaging.send_sms",
        label: "Send SMS",
        visibility: "member",
        policy: { mode: "auto" },
      },
    ],
    capabilityVisibility: "member",
    approvalPolicy: { mode: "auto" },
  },
  {
    id: "reports",
    rendererPath: "components/suite/workspaces/ReportsWorkspace",
    requiredAgents: ["intelligence"],
    requiredSkills: [],
    emitsEvents: [],
    reactsToEvents: [],
    allowedActions: [
      {
        id: "reports.export_all",
        label: "Export reports as CSV",
        visibility: "team",
        policy: { mode: "auto" },
      },
    ],
    capabilityVisibility: "team",
    approvalPolicy: { mode: "auto" },
  },
  {
    id: "import",
    rendererPath: "components/suite/workspaces/ImportWorkspace",
    // Canonical agent mapping: operations rolls into Conductor (orchestrating the batch lifecycle).
    requiredAgents: ["conductor", "intelligence", "sales"],
    requiredSkills: ["csv-import", "import-enrichment"],
    emitsEvents: ["import.requested", "import.completed", "import.failed"],
    reactsToEvents: ["import.row_succeeded", "import.row_failed", "import.completed"],
    allowedActions: [
      { id: "import.upload",  label: "Upload CSV",       visibility: "member", policy: { mode: "auto" } },
      { id: "import.preview", label: "Preview mapping",  visibility: "member", policy: { mode: "auto" } },
      { id: "import.run",     label: "Run import",       visibility: "member", policy: { mode: "approval_required", risk: "medium" } },
      { id: "import.retry",   label: "Retry failed rows",visibility: "member", policy: { mode: "auto" } },
    ],
    capabilityVisibility: "member",
    approvalPolicy: { mode: "approval_required", risk: "medium" },
  },
  {
    id: "lists",
    rendererPath: "components/suite/workspaces/ListsWorkspace",
    requiredAgents: ["intelligence"],
    requiredSkills: ["list-segment"],
    emitsEvents: ["list.created", "list.updated", "list.deleted", "list.queried"],
    reactsToEvents: ["list.queried"],
    allowedActions: [
      { id: "list.create", label: "Create list", visibility: "member", policy: { mode: "auto" } },
      { id: "list.update", label: "Update list", visibility: "member", policy: { mode: "auto" } },
      { id: "list.delete", label: "Delete list", visibility: "member", policy: { mode: "auto" } },
      { id: "list.query",  label: "Query list",  visibility: "member", policy: { mode: "auto" } },
    ],
    capabilityVisibility: "member",
    approvalPolicy: { mode: "auto" },
  },
  {
    id: "inbox-sync",
    rendererPath: "components/suite/workspaces/InboxSyncWorkspace",
    // Canonical agent mapping: communication-project folder houses Creative (draft replies)
    // + Distribution (channel selection / send timing). Inbox-sync is distribution-side.
    requiredAgents: ["distribution", "intelligence", "sales"],
    requiredSkills: ["inbox-sync"],
    emitsEvents: ["inbox.sync.started", "inbox.sync.completed", "inbox.sync.failed", "inbox.message.linked", "contact.auto_created"],
    reactsToEvents: ["inbox.sync.completed", "inbox.message.linked"],
    allowedActions: [
      { id: "inbox.connect",          label: "Connect inbox",          visibility: "owner",  policy: { mode: "approval_required", risk: "high" } },
      { id: "inbox.sync_full",        label: "Run full sync",          visibility: "owner",  policy: { mode: "approval_required", risk: "medium" } },
      { id: "inbox.sync_incremental", label: "Run incremental sync",   visibility: "member", policy: { mode: "auto" } },
      { id: "inbox.disconnect",       label: "Disconnect mailbox",     visibility: "owner",  policy: { mode: "owner_only" } },
    ],
    capabilityVisibility: "owner",
    approvalPolicy: { mode: "approval_required", risk: "high" },
  },
  {
    id: "settings",
    rendererPath: "components/suite/workspaces/SettingsWorkspace",
    requiredAgents: [],
    requiredSkills: [],
    emitsEvents: [],
    reactsToEvents: [],
    allowedActions: [
      {
        id: "settings.update_profile",
        label: "Update profile",
        visibility: "member",
        policy: { mode: "auto" },
      },
      {
        id: "settings.toggle_notification",
        label: "Toggle notification channel",
        visibility: "member",
        policy: { mode: "auto" },
      },
    ],
    capabilityVisibility: "member",
    approvalPolicy: { mode: "auto" },
  },
];

const WORKSPACE_BY_ID = new Map(WORKSPACES.map((w) => [w.id, w]));

export function getWorkspaceContract(id: string): WorkspaceContract | undefined {
  return WORKSPACE_BY_ID.get(id);
}

/** All actions exposed across every workspace — consumed by mcp-server.ts. */
export function listAllActions(): Array<{ workspace: string } & WorkspaceAction> {
  return WORKSPACES.flatMap((w) =>
    w.allowedActions.map((a) => ({ workspace: w.id, ...a })),
  );
}
