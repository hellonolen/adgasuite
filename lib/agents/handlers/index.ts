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
  importHubspot, importPipedrive, importSalesforce, importNotion, importAirtable,
  customObject, type CustomObjectInput, type CustomObjectOutput,
  recordComment, type RecordCommentInput, type RecordCommentOutput,
  type CsvImportInput, type CsvImportOutput,
  type ActivityTimelineInput, type ActivityTimelineOutput,
  type InboxSyncInput, type InboxSyncOutput,
} from "./stubs";
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

  // Stubs — contracts live in skills/*.skill.md; handler returns not_implemented
  // until the real implementation lands. Each entry below has a matching
  // markdown contract + state schema already on disk.
  registerSkill<CsvImportInput, CsvImportOutput>("import-hubspot", "operations", importHubspot);
  registerSkill<CsvImportInput, CsvImportOutput>("import-pipedrive", "operations", importPipedrive);
  registerSkill<CsvImportInput, CsvImportOutput>("import-salesforce", "operations", importSalesforce);
  registerSkill<CsvImportInput, CsvImportOutput>("import-notion", "operations", importNotion);
  registerSkill<CsvImportInput, CsvImportOutput>("import-airtable", "operations", importAirtable);
  registerSkill<CustomObjectInput, CustomObjectOutput>("custom-object", "operations", customObject);
  registerSkill<RecordCommentInput, RecordCommentOutput>("record-comment", "communication", recordComment);
}

// Auto-register on import for routes that bring this module in.
ensureSkillHandlersRegistered();
