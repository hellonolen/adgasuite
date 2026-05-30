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
import {
  dailyBrief,
  type DailyBriefInput,
  type DailyBriefOutput,
} from "./daily-brief";
import {
  teamInviteSend,
  teamInviteAccept,
  type TeamInviteSendInput,
  type TeamInviteSendOutput,
  type TeamInviteAcceptInput,
  type TeamInviteAcceptOutput,
} from "./team-invite";
import {
  type CustomObjectInput, type CustomObjectOutput,
  type RecordCommentInput, type RecordCommentOutput,
  type CsvImportInput, type CsvImportOutput,
  type ActivityTimelineInput, type ActivityTimelineOutput,
  type InboxSyncInput, type InboxSyncOutput,
} from "./stubs";
import { customObjectHandler } from "./custom-object";
import { recordCommentHandler } from "./record-comment";
import {
  importHubspotHandler,
  importPipedriveHandler,
  importSalesforceHandler,
  importNotionHandler,
  importAirtableHandler,
  type AdapterImportOutput,
} from "./import-adapters";
import { csvImportHandler } from "./csv-import";
import {
  importEnrichmentHandler,
  type ImportEnrichmentInput,
  type ImportEnrichmentOutput,
} from "./import-enrichment";
import { activityTimelineHandler } from "./activity-timeline";
import {
  listSegmentHandler,
  type ListSegmentInput,
  type ListSegmentOutput,
} from "./list-segment";
import { inboxSyncHandler } from "./inbox-sync";

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
  registerSkill<DailyBriefInput, DailyBriefOutput>(
    "daily-brief",
    "conductor",
    dailyBrief,
  );
  registerSkill<TeamInviteSendInput, TeamInviteSendOutput>(
    "team-invite",
    "sales",
    teamInviteSend,
  );
  registerSkill<TeamInviteAcceptInput, TeamInviteAcceptOutput>(
    "team-invite.accept",
    "sales",
    teamInviteAccept,
  );

  // Real handlers (graduated from stubs.ts to their own files).
  registerSkill<CsvImportInput, CsvImportOutput>("csv-import", "operations", csvImportHandler);
  registerSkill<ImportEnrichmentInput, ImportEnrichmentOutput>("import-enrichment", "intelligence", importEnrichmentHandler);
  registerSkill<ActivityTimelineInput, ActivityTimelineOutput>("activity-timeline", "intelligence", activityTimelineHandler);
  registerSkill<ListSegmentInput, ListSegmentOutput>("list-segment", "intelligence", listSegmentHandler);
  registerSkill<InboxSyncInput, InboxSyncOutput>("inbox-sync", "communication", inboxSyncHandler);

  // Import source adapters — credential-aware handlers. If no OAuth credential
  // is connected, returns a structured `integration_not_connected` error.
  // If credential resolves, returns a `status: "queued"` batch with
  // `adapter_pending_implementation: 1` in failure_summary (network fetch is
  // the only outstanding piece). Contracts: skills/import-<provider>.skill.md.
  registerSkill<CsvImportInput, AdapterImportOutput>("import-hubspot", "operations", importHubspotHandler);
  registerSkill<CsvImportInput, AdapterImportOutput>("import-pipedrive", "operations", importPipedriveHandler);
  registerSkill<CsvImportInput, AdapterImportOutput>("import-salesforce", "operations", importSalesforceHandler);
  registerSkill<CsvImportInput, AdapterImportOutput>("import-notion", "operations", importNotionHandler);
  registerSkill<CsvImportInput, AdapterImportOutput>("import-airtable", "operations", importAirtableHandler);

  // custom-object — graduated from stub to real handler. Metadata-only for v1:
  // record materialization uses a generic blob table. See custom-object.ts for
  // the v1 trade-off documentation.
  registerSkill<CustomObjectInput, CustomObjectOutput>("custom-object", "operations", customObjectHandler);

  // record-comment — graduated from stub to real handler. Threaded comments +
  // @mentions on any record; notification path bound back via
  // EVENT_SKILL_BINDINGS["record.comment.mentioned"] for delivery.
  registerSkill<RecordCommentInput, RecordCommentOutput>("record-comment", "communication", recordCommentHandler);
}

// Auto-register on import for routes that bring this module in.
ensureSkillHandlersRegistered();
