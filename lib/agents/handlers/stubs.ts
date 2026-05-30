/**
 * Stub handlers — every skill declared in skills/*.skill.md has an entry here
 * so the SkillRegistry knows about it even before the real implementation lands.
 *
 * Each stub:
 *   - has the typed input/output the skill markdown declares
 *   - throws `not_implemented` so callSkill() returns { ok: false, error: "not_implemented" }
 *     to the caller (instead of "No skill handler registered" — the contract IS live, the
 *     implementation is pending)
 *   - publishes the same `agent_job.started` / `agent_job.failed` events as real handlers
 *     do (via callSkill), so the audit trail captures the call attempt
 *
 * When a stub graduates to a real handler, it moves to its own file
 * (`lib/agents/handlers/<skill>.ts`) and the registration in index.ts swaps in
 * the real function — no other edit required.
 */

import type { SkillContext, SkillHandler } from "@/lib/agents/skill-registry";

class NotImplementedError extends Error {
  constructor(public readonly skillId: string) {
    super(`not_implemented: skill "${skillId}" has a contract but no handler yet. See skills/${skillId}.skill.md.`);
    this.name = "NotImplementedError";
  }
}

function notImplemented<I, O>(skillId: string): SkillHandler<I, O> {
  return async (_ctx: SkillContext, _input: I): Promise<O> => {
    throw new NotImplementedError(skillId);
  };
}

// ─── Import wedge — csv-import is the MVP target, others are adapters ────────
export interface CsvImportInput {
  source_type: "csv" | "paste" | "hubspot" | "pipedrive" | "salesforce" | "notion" | "airtable";
  target_type: "contacts" | "leads" | "deals" | "organizations";
  payload: Record<string, unknown>;
  field_mapping: Record<string, string>;
  dedupe_strategy: "email" | "external_id" | "name_plus_company" | "domain" | "name" | "phone" | "none";
}
export interface CsvImportOutput {
  batch_id: string;
  rows_total: number;
  rows_succeeded: number;
  rows_failed: number;
  failure_summary: Record<string, number>;
}
export const csvImport = notImplemented<CsvImportInput, CsvImportOutput>("csv-import");

export const importHubspot     = notImplemented<CsvImportInput, CsvImportOutput>("import-hubspot");
export const importPipedrive   = notImplemented<CsvImportInput, CsvImportOutput>("import-pipedrive");
export const importSalesforce  = notImplemented<CsvImportInput, CsvImportOutput>("import-salesforce");
export const importNotion      = notImplemented<CsvImportInput, CsvImportOutput>("import-notion");
export const importAirtable    = notImplemented<CsvImportInput, CsvImportOutput>("import-airtable");

export interface ImportEnrichmentInput {
  batch_id: string;
  operations: Array<"normalize_names" | "derive_company_from_email" | "dedupe_near_matches" | "score_leads" | "summarize_imported">;
}
export interface ImportEnrichmentOutput {
  enrichment_id: string;
  operations_applied: Array<{ operation: string; rows_touched: number; rows_changed: number }>;
  duration_ms: number;
}
export const importEnrichment = notImplemented<ImportEnrichmentInput, ImportEnrichmentOutput>("import-enrichment");

// ─── Lists ───────────────────────────────────────────────────────────────────
export interface ListSegmentInput {
  operation: "create" | "update" | "delete" | "query" | "list_all";
  list?: {
    id: string | null;
    name: string;
    target_type: "contacts" | "leads" | "deals" | "organizations";
    filters: Array<{ field: string; op: string; value: unknown }>;
    sort: Array<{ field: string; direction: "asc" | "desc" }> | null;
    visibility: "private" | "team" | "workspace";
  };
}
export interface ListSegmentOutput {
  list_id: string;
  matched_count: number | null;
  rows: Array<Record<string, unknown>> | null;
}
export const listSegment = notImplemented<ListSegmentInput, ListSegmentOutput>("list-segment");

// ─── Activity timeline ───────────────────────────────────────────────────────
export interface ActivityTimelineInput {
  resource_type: "contact" | "lead" | "deal" | "organization" | "workspace";
  resource_id: string;
  filters?: {
    since: string | null;
    until: string | null;
    event_types: string[] | null;
    actor_type: "user" | "agent" | null;
    limit: number;
    cursor: string | null;
  };
}
export interface ActivityTimelineOutput {
  items: Array<{
    id: string;
    event_type: string;
    actor_type: string;
    actor_id: string;
    occurred_at: string;
    summary: string;
    payload: Record<string, unknown>;
  }>;
  next_cursor: string | null;
}
export const activityTimeline = notImplemented<ActivityTimelineInput, ActivityTimelineOutput>("activity-timeline");

// ─── Inbox sync ──────────────────────────────────────────────────────────────
export interface InboxSyncInput {
  operation: "connect" | "sync_full" | "sync_incremental" | "send_reply" | "disconnect";
  provider: "gmail" | "outlook";
  credential_id?: string | null;
  cursor?: string | null;
  reply?: {
    thread_id: string;
    message_id: string | null;
    body: string;
    cc: string[] | null;
    bcc: string[] | null;
  };
}
export interface InboxSyncOutput {
  sync_id: string | null;
  messages_processed: number;
  contacts_created: number;
  records_touched: number;
  cursor: string | null;
}
export const inboxSync = notImplemented<InboxSyncInput, InboxSyncOutput>("inbox-sync");

// ─── Custom objects ──────────────────────────────────────────────────────────
export interface CustomObjectInput {
  operation: "create" | "update" | "delete" | "list" | "get";
  object?: {
    id: string | null;
    slug: string;
    name_singular: string;
    name_plural: string;
    fields: Array<{ key: string; label: string; type: string; required: boolean; options: Record<string, unknown> | null }>;
    visibility: "private" | "team" | "workspace";
  };
}
export interface CustomObjectOutput {
  object_id: string;
  object: Record<string, unknown> | null;
  records_count: number | null;
}
export const customObject = notImplemented<CustomObjectInput, CustomObjectOutput>("custom-object");

// ─── Record comments ─────────────────────────────────────────────────────────
export interface RecordCommentInput {
  operation: "create" | "update" | "delete" | "list" | "react";
  comment?: {
    id: string | null;
    resource_type: "contact" | "lead" | "deal" | "organization" | "custom_object";
    resource_id: string;
    parent_comment_id: string | null;
    body: string;
    mentions: string[];
  };
  reaction?: { comment_id: string; emoji: string; action: "add" | "remove" };
}
export interface RecordCommentOutput {
  comment_id: string | null;
  comments: Array<Record<string, unknown>> | null;
}
export const recordComment = notImplemented<RecordCommentInput, RecordCommentOutput>("record-comment");
