import { deals, documents, intelligence, leads, tasks, workspaces } from "@/lib/data/seed";
import { newId, nowIso } from "@/lib/server/id";
import { DEFAULT_ORG_ID } from "@/lib/server/tenant";

export type AgentName =
  | "conductor"
  | "sales"
  | "intelligence"
  | "documents"
  | "operations"
  | "communication"
  | "payments";
export type JobStatus = "queued" | "running" | "completed" | "failed" | "canceled";

export interface AgentJob {
  id: string;
  organization_id: string | null;
  agent: AgentName;
  job_type: string;
  status: JobStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  run_after: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentEvent {
  id: string;
  organization_id: string | null;
  event_type: string;
  actor_type: "user" | "agent" | "system" | "webhook" | "cron";
  actor_id: string | null;
  resource_type: string | null;
  resource_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface WorkflowState {
  id: string;
  organization_id: string;
  workflow_type: string;
  status: "draft" | "active" | "paused" | "completed" | "failed" | "archived";
  resource_type: string | null;
  resource_id: string | null;
  state: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  organization_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  location: string | null;
  meeting_url: string | null;
  status: "tentative" | "confirmed" | "completed" | "canceled";
  event_type: "meeting" | "call" | "deadline" | "reminder" | "internal";
  deal_id: string | null;
  contact_id: string | null;
  attendees: Array<{ name?: string; email: string; role?: string }>;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VoiceCall {
  id: string;
  organization_id: string;
  direction: "inbound" | "outbound";
  status: "scheduled" | "ringing" | "active" | "completed" | "missed" | "failed" | "cancelled";
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  participants: Array<{ role: string; phone?: string; name?: string | null; email?: string | null; recordId?: string | null }>;
  consent: Record<string, unknown>;
  recording: Record<string, unknown>;
  transcript: Record<string, unknown>;
  transcript_text: string | null;
  summary: string | null;
  related_records: Record<string, unknown>;
  agentic_outputs: Record<string, unknown>;
  payload_r2_key: string | null;
  storage_object_id: string | null;
  provider: string | null;
  provider_call_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentApproval {
  id: string;
  organization_id: string;
  job_id: string | null;
  agent: AgentName;
  title: string;
  proposed_action: string;
  risk: "low" | "medium" | "high";
  status: "pending" | "approved" | "rejected" | "edited";
  resource_type: string | null;
  resource_id: string | null;
  payload: Record<string, unknown>;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StorageObject {
  id: string;
  organization_id: string;
  bucket: "documents" | "uploads" | "assets";
  r2_key: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  sha256: string | null;
  category: "document" | "upload" | "export" | "recording" | "transcript" | "asset";
  resource_type: string | null;
  resource_id: string | null;
  visibility: "workspace" | "private" | "shared";
  created_by: string | null;
  created_at: string;
}

export interface DocumentMetadata {
  id: string;
  organization_id: string;
  type: string;
  title: string;
  recipient_name: string | null;
  recipient_company: string | null;
  recipient_email: string | null;
  total_cents: number | null;
  status: string;
  r2_key: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealRecord {
  id: string;
  organization_id: string;
  contact_id: string | null;
  name: string;
  company: string | null;
  value_cents: number;
  stage: string;
  probability: number;
  expected_close_at: string | null;
  payload_r2_key: string | null;
  storage_object_id: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

const seedCalendarEvents: CalendarEvent[] = [
  {
    id: "cal_001",
    organization_id: DEFAULT_ORG_ID,
    title: "Sutter Maritime pre-signing alignment",
    starts_at: "2026-05-20T14:00:00.000Z",
    ends_at: "2026-05-20T14:45:00.000Z",
    timezone: "America/New_York",
    location: "Zoom",
    meeting_url: "https://meet.adga.ai/sutter-pre-signing",
    status: "confirmed",
    event_type: "meeting",
    deal_id: "DEAL-1210",
    contact_id: null,
    attendees: [
      { name: "Maren Voss", email: "maren.voss@concorde.co", role: "owner" },
      { name: "Aurore Chastain", email: "aurore.c@sutter.co", role: "counterparty" },
    ],
    notes: "Final review of working capital peg, holdback mechanic, and signature timeline.",
    created_by: "hellonolen@gmail.com",
    created_at: "2026-05-20T12:00:00.000Z",
    updated_at: "2026-05-20T12:00:00.000Z",
  },
  {
    id: "cal_002",
    organization_id: DEFAULT_ORG_ID,
    title: "Quorum Energy follow-up",
    starts_at: "2026-05-21T16:30:00.000Z",
    ends_at: "2026-05-21T17:00:00.000Z",
    timezone: "America/New_York",
    location: "Google Meet",
    meeting_url: "https://meet.adga.ai/quorum-follow-up",
    status: "tentative",
    event_type: "call",
    deal_id: "DEAL-1213",
    contact_id: null,
    attendees: [{ name: "Magnus Bell", email: "mbell@quorum.energy", role: "counterparty" }],
    notes: "Re-open dialogue on JV term sheet.",
    created_by: "hellonolen@gmail.com",
    created_at: "2026-05-20T13:00:00.000Z",
    updated_at: "2026-05-20T13:00:00.000Z",
  },
  {
    id: "cal_003",
    organization_id: DEFAULT_ORG_ID,
    title: "Tessellate signature SLA",
    starts_at: "2026-05-23T20:00:00.000Z",
    ends_at: "2026-05-23T20:15:00.000Z",
    timezone: "America/New_York",
    location: null,
    meeting_url: null,
    status: "confirmed",
    event_type: "deadline",
    deal_id: "DEAL-1218",
    contact_id: null,
    attendees: [],
    notes: "Signature request expires without response.",
    created_by: "system",
    created_at: "2026-05-20T13:00:00.000Z",
    updated_at: "2026-05-20T13:00:00.000Z",
  },
];

const memory = {
  jobs: [] as AgentJob[],
  events: [] as AgentEvent[],
  workflows: [] as WorkflowState[],
  calendarEvents: [...seedCalendarEvents] as CalendarEvent[],
  voiceCalls: [] as VoiceCall[],
  approvals: [] as AgentApproval[],
  storageObjects: [] as StorageObject[],
  documentRecords: [] as DocumentMetadata[],
  dealRecords: [] as DealRecord[],
};

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapJob(row: Record<string, unknown>): AgentJob {
  return {
    id: String(row.id),
    organization_id: row.organization_id ? String(row.organization_id) : null,
    agent: String(row.agent) as AgentName,
    job_type: String(row.job_type),
    status: String(row.status) as JobStatus,
    input: parseJson(String(row.input_json || "{}"), {}),
    output: row.output_json ? parseJson(String(row.output_json), {}) : null,
    error: row.error ? String(row.error) : null,
    run_after: row.run_after ? String(row.run_after) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapCalendarEvent(row: Record<string, unknown>): CalendarEvent {
  return {
    id: String(row.id),
    organization_id: String(row.organization_id),
    title: String(row.title),
    starts_at: String(row.starts_at),
    ends_at: String(row.ends_at),
    timezone: String(row.timezone || "America/New_York"),
    location: row.location ? String(row.location) : null,
    meeting_url: row.meeting_url ? String(row.meeting_url) : null,
    status: String(row.status) as CalendarEvent["status"],
    event_type: String(row.event_type) as CalendarEvent["event_type"],
    deal_id: row.deal_id ? String(row.deal_id) : null,
    contact_id: row.contact_id ? String(row.contact_id) : null,
    attendees: parseJson(String(row.attendees_json || "[]"), []),
    notes: row.notes ? String(row.notes) : null,
    created_by: row.created_by ? String(row.created_by) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapVoiceCall(row: Record<string, unknown>): VoiceCall {
  return {
    id: String(row.id),
    organization_id: String(row.organization_id),
    direction: String(row.direction || "inbound") as VoiceCall["direction"],
    status: String(row.status || "scheduled") as VoiceCall["status"],
    started_at: row.started_at ? String(row.started_at) : null,
    ended_at: row.ended_at ? String(row.ended_at) : null,
    duration_seconds: row.duration_seconds == null ? null : Number(row.duration_seconds),
    participants: parseJson(String(row.participants_json || "[]"), []),
    consent: parseJson(String(row.consent_json || "{}"), {}),
    recording: parseJson(String(row.recording_json || "{}"), {}),
    transcript: parseJson(String(row.transcript_json || "{}"), {}),
    transcript_text: row.transcript_text ? String(row.transcript_text) : null,
    summary: row.summary ? String(row.summary) : null,
    related_records: parseJson(String(row.related_records_json || "{}"), {}),
    agentic_outputs: parseJson(String(row.agentic_outputs_json || "{}"), {}),
    payload_r2_key: row.payload_r2_key ? String(row.payload_r2_key) : null,
    storage_object_id: row.storage_object_id ? String(row.storage_object_id) : null,
    provider: row.provider ? String(row.provider) : null,
    provider_call_id: row.provider_call_id ? String(row.provider_call_id) : null,
    created_by: row.created_by ? String(row.created_by) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapStorageObject(row: Record<string, unknown>): StorageObject {
  return {
    id: String(row.id),
    organization_id: String(row.organization_id),
    bucket: String(row.bucket) as StorageObject["bucket"],
    r2_key: String(row.r2_key),
    file_name: String(row.file_name),
    mime_type: String(row.mime_type || "application/octet-stream"),
    size_bytes: Number(row.size_bytes || 0),
    sha256: row.sha256 ? String(row.sha256) : null,
    category: String(row.category || "upload") as StorageObject["category"],
    resource_type: row.resource_type ? String(row.resource_type) : null,
    resource_id: row.resource_id ? String(row.resource_id) : null,
    visibility: String(row.visibility || "workspace") as StorageObject["visibility"],
    created_by: row.created_by ? String(row.created_by) : null,
    created_at: String(row.created_at),
  };
}

function mapApproval(row: Record<string, unknown>): AgentApproval {
  return {
    id: String(row.id),
    organization_id: String(row.organization_id),
    job_id: row.job_id ? String(row.job_id) : null,
    agent: String(row.agent) as AgentName,
    title: String(row.title),
    proposed_action: String(row.proposed_action),
    risk: String(row.risk || "medium") as AgentApproval["risk"],
    status: String(row.status || "pending") as AgentApproval["status"],
    resource_type: row.resource_type ? String(row.resource_type) : null,
    resource_id: row.resource_id ? String(row.resource_id) : null,
    payload: parseJson(String(row.payload_json || "{}"), {}),
    decided_by: row.decided_by ? String(row.decided_by) : null,
    decided_at: row.decided_at ? String(row.decided_at) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapLeadRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    name: String(row.full_name || ""),
    title: row.job_title ? String(row.job_title) : "",
    company: String(row.company || ""),
    sector: row.industry ? String(row.industry) : "",
    score: Number(row.score || 0),
    intent: row.urgency === "Immediate" || row.urgency === "Same Day" ? "high" : row.urgency === "Low" ? "low" : "med",
    value: Number(row.estimated_value_cents || 0) / 100,
    channel: row.source ? String(row.source) : "",
    last: row.last_contacted_at ? String(row.last_contacted_at) : row.received_at ? String(row.received_at) : "",
    status: String(row.status || "warm").toLowerCase(),
    urgency: row.urgency ? String(row.urgency) : "Normal",
    priority: String(row.priority || "medium"),
    receivedAt: row.received_at ? String(row.received_at) : String(row.created_at),
    followUpDueAt: row.follow_up_due_at ? String(row.follow_up_due_at) : null,
    followUpStatus: String(row.follow_up_status || "not_started"),
    preferredContact: row.preferred_contact_method ? String(row.preferred_contact_method) : null,
    phone: row.phone ? String(row.phone) : null,
    email: row.email ? String(row.email) : null,
    city: row.city ? String(row.city) : null,
    state: row.state_region ? String(row.state_region) : null,
    social: parseJson(String(row.social_profiles_json || "{}"), {}),
  };
}

function mapDealRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    name: String(row.name || ""),
    company: row.company ? String(row.company) : "",
    type: row.type ? String(row.type) : "",
    value: Number(row.value_cents || 0) / 100,
    currency: "USD",
    stage: String(row.stage || "lead").toLowerCase(),
    prob: Number(row.probability || 0),
    owner: row.owner_user_id ? String(row.owner_user_id) : "",
    team: [],
    close: row.expected_close_at ? String(row.expected_close_at) : "",
    updated: String(row.updated_at || ""),
    tags: [],
    priority: "med",
    source: "",
  };
}

function mapDealRecord(row: Record<string, unknown>): DealRecord {
  return {
    id: String(row.id),
    organization_id: String(row.organization_id || DEFAULT_ORG_ID),
    contact_id: row.contact_id ? String(row.contact_id) : null,
    name: String(row.name || ""),
    company: row.company ? String(row.company) : null,
    value_cents: Number(row.value_cents || 0),
    stage: String(row.stage || "lead").toLowerCase(),
    probability: Number(row.probability || 0),
    expected_close_at: row.expected_close_at ? String(row.expected_close_at) : null,
    payload_r2_key: row.payload_r2_key ? String(row.payload_r2_key) : null,
    storage_object_id: row.storage_object_id ? String(row.storage_object_id) : null,
    archived_at: row.archived_at ? String(row.archived_at) : null,
    created_at: String(row.created_at || nowIso()),
    updated_at: String(row.updated_at || nowIso()),
  };
}

function mapContactRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    name: String(row.full_name || `${row.first_name || ""} ${row.last_name || ""}`.trim()),
    email: row.email ? String(row.email) : null,
    phone: row.phone ? String(row.phone) : null,
    company: row.company ? String(row.company) : null,
    title: row.title ? String(row.title) : null,
    status: String(row.status || "lead"),
    created_at: String(row.created_at),
  };
}

function mapTaskRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    title: String(row.title || ""),
    deal: row.deal_id ? String(row.deal_id) : null,
    owner: row.assigned_user_id ? String(row.assigned_user_id) : "",
    due: row.due_at ? String(row.due_at) : "",
    status: String(row.status || "todo"),
    priority: String(row.priority || "medium"),
  };
}

function mapDocumentRow(row: Record<string, unknown>) {
  const title = String(row.title || "");
  const ext = (title.match(/\.([a-z0-9]+)$/i)?.[1] || "pdf").toLowerCase();
  return {
    id: String(row.id),
    name: title,
    ext,
    size: "—",
    updated: String(row.created_at || ""),
    deal: row.deal_id ? String(row.deal_id) : null,
    owner: row.created_by_user_id ? String(row.created_by_user_id) : "",
    signed: String(row.status) === "signed" || String(row.status) === "sent",
  };
}

function mapWorkspaceRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    name: String(row.name || ""),
    color: "var(--text-3)",
    members: [],
  };
}

function mapIntelligenceRow(row: Record<string, unknown>) {
  return {
    tag: row.category ? String(row.category) : "Reference",
    title: String(row.title || ""),
    desc: String(row.summary || ""),
    readers: 0,
    updated: String(row.updated_at || ""),
  };
}

export async function getSuiteState(db?: D1Database, organizationId = DEFAULT_ORG_ID) {
  // No D1 binding (local dev without remote DB) → use in-memory seed so the UI still has shape.
  if (!db) {
    return {
      organization: { id: organizationId, name: "ADGA", plan: "suite", subscription_status: "trialing" },
      leads,
      deals: [...deals, ...memory.dealRecords.filter((deal) => deal.organization_id === organizationId).map((deal) => mapDealRow(deal as unknown as Record<string, unknown>))],
      contacts: [] as ReturnType<typeof mapContactRow>[],
      tasks,
      documents,
      workspaces,
      intelligence,
      calendar_events: memory.calendarEvents,
      agent_approvals: memory.approvals.slice(-50).reverse(),
      storage_objects: memory.storageObjects.slice(-50).reverse(),
      agent_jobs: memory.jobs.slice(-25).reverse(),
      events: memory.events.slice(-50).reverse(),
    };
  }

  const [
    jobs, events, calendar, approvals, storage,
    leadRows, dealRows, contactRows, taskRows, documentRows, workspaceRows, intelligenceRows,
  ] = await Promise.all([
    db.prepare("SELECT * FROM agent_jobs WHERE organization_id = ? ORDER BY created_at DESC LIMIT 25").bind(organizationId).all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM events WHERE organization_id = ? ORDER BY created_at DESC LIMIT 50").bind(organizationId).all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM calendar_events WHERE organization_id = ? ORDER BY starts_at ASC LIMIT 100").bind(organizationId).all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM agent_approvals WHERE organization_id = ? ORDER BY created_at DESC LIMIT 50").bind(organizationId).all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM storage_objects WHERE organization_id = ? ORDER BY created_at DESC LIMIT 50").bind(organizationId).all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM leads WHERE organization_id = ? ORDER BY received_at DESC, created_at DESC LIMIT 200").bind(organizationId).all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM deals WHERE organization_id = ? ORDER BY updated_at DESC LIMIT 200").bind(organizationId).all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM contacts WHERE organization_id = ? ORDER BY updated_at DESC LIMIT 200").bind(organizationId).all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM tasks WHERE organization_id = ? ORDER BY due_at ASC NULLS LAST LIMIT 100").bind(organizationId).all<Record<string, unknown>>().catch(() =>
      db.prepare("SELECT * FROM tasks WHERE organization_id = ? ORDER BY due_at ASC LIMIT 100").bind(organizationId).all<Record<string, unknown>>()
    ),
    db.prepare("SELECT * FROM documents WHERE organization_id = ? ORDER BY created_at DESC LIMIT 100").bind(organizationId).all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM knowledge_workspaces WHERE organization_id = ? ORDER BY created_at DESC LIMIT 50").bind(organizationId).all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM intelligence_battlecards WHERE organization_id = ? ORDER BY updated_at DESC LIMIT 50").bind(organizationId).all<Record<string, unknown>>().catch(() => ({ results: [] as Record<string, unknown>[] })),
  ]);

  const organization = await db
    .prepare("SELECT id, name, plan, subscription_status FROM organizations WHERE id = ?")
    .bind(organizationId)
    .first<{ id: string; name: string; plan: string; subscription_status: string }>()
    .catch(() => null);

  // When D1 is connected we trust D1 — even empty results mean "real account, no records yet."
  return {
    organization: organization || { id: organizationId, name: "ADGA", plan: "suite", subscription_status: "trialing" },
    leads: (leadRows.results || []).map(mapLeadRow),
    deals: (dealRows.results || []).map(mapDealRow),
    contacts: (contactRows.results || []).map(mapContactRow),
    tasks: (taskRows.results || []).map(mapTaskRow),
    documents: (documentRows.results || []).map(mapDocumentRow),
    workspaces: (workspaceRows.results || []).map(mapWorkspaceRow),
    intelligence: (intelligenceRows.results || []).map(mapIntelligenceRow),
    calendar_events: (calendar.results || []).map(mapCalendarEvent),
    agent_approvals: (approvals.results || []).map(mapApproval),
    storage_objects: (storage.results || []).map(mapStorageObject),
    agent_jobs: (jobs.results || []).map(mapJob),
    events: (events.results || []).map((row) => ({
      id: String(row.id),
      organization_id: row.organization_id ? String(row.organization_id) : null,
      event_type: String(row.event_type),
      actor_type: String(row.actor_type),
      actor_id: row.actor_id ? String(row.actor_id) : null,
      resource_type: row.resource_type ? String(row.resource_type) : null,
      resource_id: row.resource_id ? String(row.resource_id) : null,
      payload: parseJson(String(row.payload_json || "{}"), {}),
      created_at: String(row.created_at),
    })),
  };
}

export async function listStorageObjects(db?: D1Database) {
  if (!db) return memory.storageObjects.slice(-100).reverse();
  const result = await db.prepare("SELECT * FROM storage_objects ORDER BY created_at DESC LIMIT 100").all<Record<string, unknown>>();
  return (result.results || []).map(mapStorageObject);
}

export async function listAgentApprovals(db?: D1Database) {
  if (!db) return memory.approvals.slice(-100).reverse();
  const result = await db.prepare("SELECT * FROM agent_approvals ORDER BY created_at DESC LIMIT 100").all<Record<string, unknown>>();
  return (result.results || []).map(mapApproval);
}

export async function createDeal(
  db: D1Database | undefined,
  input: Pick<DealRecord, "name"> &
    Partial<Pick<DealRecord, "id" | "organization_id" | "contact_id" | "company" | "value_cents" | "stage" | "probability" | "expected_close_at">>,
): Promise<DealRecord> {
  const timestamp = nowIso();
  const record: DealRecord = {
    id: input.id || newId("deal"),
    organization_id: input.organization_id || DEFAULT_ORG_ID,
    contact_id: input.contact_id || null,
    name: input.name,
    company: input.company || null,
    value_cents: input.value_cents ?? 0,
    stage: input.stage || "lead",
    probability: input.probability ?? 0,
    expected_close_at: input.expected_close_at || null,
    payload_r2_key: null,
    storage_object_id: null,
    archived_at: null,
    created_at: timestamp,
    updated_at: timestamp,
  };

  if (!db) {
    memory.dealRecords.push(record);
    return record;
  }

  await db
    .prepare(
      `INSERT INTO deals
        (id, organization_id, contact_id, name, company, value_cents, stage, probability, expected_close_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      record.id,
      record.organization_id,
      record.contact_id,
      record.name,
      record.company,
      record.value_cents,
      record.stage,
      record.probability,
      record.expected_close_at,
      record.created_at,
      record.updated_at,
    )
    .run();

  return record;
}

export async function updateDeal(
  db: D1Database | undefined,
  id: string,
  organizationId: string,
  patch: Partial<Pick<DealRecord, "name" | "contact_id" | "company" | "value_cents" | "stage" | "probability" | "expected_close_at">>,
): Promise<DealRecord | null> {
  const timestamp = nowIso();

  if (!db) {
    const index = memory.dealRecords.findIndex((deal) => deal.id === id && deal.organization_id === organizationId);
    const current =
      index >= 0
        ? memory.dealRecords[index]
        : (() => {
            const seed = (deals as Array<Record<string, unknown>>).find((deal) => String(deal.id) === id);
            if (!seed) return null;
            return mapDealRecord({
              id,
              organization_id: organizationId,
              name: seed.name,
              company: seed.company,
              value_cents: Math.round(Number(seed.value || 0) * 100),
              stage: seed.stage,
              probability: seed.prob,
              expected_close_at: seed.close,
              created_at: timestamp,
              updated_at: timestamp,
            });
          })();
    if (!current) return null;
    const next: DealRecord = {
      ...current,
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.contact_id !== undefined ? { contact_id: patch.contact_id } : {}),
      ...(patch.company !== undefined ? { company: patch.company } : {}),
      ...(patch.value_cents !== undefined ? { value_cents: patch.value_cents } : {}),
      ...(patch.stage !== undefined ? { stage: patch.stage } : {}),
      ...(patch.probability !== undefined ? { probability: patch.probability } : {}),
      ...(patch.expected_close_at !== undefined ? { expected_close_at: patch.expected_close_at } : {}),
      updated_at: timestamp,
    };
    if (index >= 0) {
      memory.dealRecords[index] = next;
    } else {
      const seed = (deals as Array<Record<string, unknown>>).find((deal) => String(deal.id) === id);
      if (seed) {
        if (patch.name !== undefined) seed.name = patch.name;
        if (patch.company !== undefined) seed.company = patch.company || "";
        if (patch.value_cents !== undefined) seed.value = patch.value_cents / 100;
        if (patch.stage !== undefined) seed.stage = patch.stage;
        if (patch.probability !== undefined) seed.prob = patch.probability;
        if (patch.expected_close_at !== undefined) seed.close = patch.expected_close_at || "";
        seed.updated = "just now";
      }
    }
    return next;
  }

  const existing = await db
    .prepare("SELECT * FROM deals WHERE id = ? AND organization_id = ? LIMIT 1")
    .bind(id, organizationId)
    .first<Record<string, unknown>>();
  if (!existing) return null;
  const current = mapDealRecord(existing);
  const next: DealRecord = {
    ...current,
    name: patch.name ?? current.name,
    contact_id: patch.contact_id === undefined ? current.contact_id : patch.contact_id,
    company: patch.company === undefined ? current.company : patch.company,
    value_cents: patch.value_cents ?? current.value_cents,
    stage: patch.stage ?? current.stage,
    probability: patch.probability ?? current.probability,
    expected_close_at: patch.expected_close_at === undefined ? current.expected_close_at : patch.expected_close_at,
    updated_at: timestamp,
  };

  await db
    .prepare(
      `UPDATE deals
       SET contact_id = ?, name = ?, company = ?, value_cents = ?, stage = ?, probability = ?, expected_close_at = ?, updated_at = ?
       WHERE id = ? AND organization_id = ?`,
    )
    .bind(
      next.contact_id,
      next.name,
      next.company,
      next.value_cents,
      next.stage,
      next.probability,
      next.expected_close_at,
      next.updated_at,
      id,
      organizationId,
    )
    .run();

  return next;
}

export async function createAgentApproval(
  db: D1Database | undefined,
  input: Pick<AgentApproval, "agent" | "title" | "proposed_action"> &
    Partial<Omit<AgentApproval, "id" | "organization_id" | "agent" | "title" | "proposed_action" | "status" | "decided_by" | "decided_at" | "created_at" | "updated_at"> & { organization_id: string; status: AgentApproval["status"] }>,
) {
  const timestamp = nowIso();
  const approval: AgentApproval = {
    id: newId("apr"),
    organization_id: input.organization_id || DEFAULT_ORG_ID,
    job_id: input.job_id || null,
    agent: input.agent,
    title: input.title,
    proposed_action: input.proposed_action,
    risk: input.risk || "medium",
    status: input.status || "pending",
    resource_type: input.resource_type || null,
    resource_id: input.resource_id || null,
    payload: input.payload || {},
    decided_by: null,
    decided_at: null,
    created_at: timestamp,
    updated_at: timestamp,
  };

  if (!db) {
    memory.approvals.push(approval);
    return approval;
  }

  try {
    await db.prepare(
      `INSERT INTO agent_approvals
        (id, organization_id, job_id, agent, title, proposed_action, risk, status, resource_type, resource_id, payload_json, decided_by, decided_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        approval.id,
        approval.organization_id,
        approval.job_id,
        approval.agent,
        approval.title,
        approval.proposed_action,
        approval.risk,
        approval.status,
        approval.resource_type,
        approval.resource_id,
        JSON.stringify(approval.payload),
        approval.decided_by,
        approval.decided_at,
        approval.created_at,
        approval.updated_at,
      )
      .run();
  } catch {
    memory.approvals.push(approval);
  }

  return approval;
}

export async function decideAgentApproval(
  db: D1Database | undefined,
  id: string,
  input: { status: "approved" | "rejected" | "edited"; decided_by: string; proposed_action?: string; payload?: Record<string, unknown> },
) {
  const timestamp = nowIso();
  if (!db) {
    const index = memory.approvals.findIndex((item) => item.id === id);
    if (index < 0) return null;
    memory.approvals[index] = {
      ...memory.approvals[index],
      status: input.status,
      proposed_action: input.proposed_action || memory.approvals[index].proposed_action,
      payload: { ...memory.approvals[index].payload, ...(input.payload || {}) },
      decided_by: input.decided_by,
      decided_at: timestamp,
      updated_at: timestamp,
    };
    return memory.approvals[index];
  }

  let existing: Record<string, unknown> | null = null;
  try {
    existing = await db.prepare("SELECT * FROM agent_approvals WHERE id = ?").bind(id).first<Record<string, unknown>>();
  } catch {
    const index = memory.approvals.findIndex((item) => item.id === id);
    if (index < 0) return null;
    memory.approvals[index] = {
      ...memory.approvals[index],
      status: input.status,
      proposed_action: input.proposed_action || memory.approvals[index].proposed_action,
      payload: { ...memory.approvals[index].payload, ...(input.payload || {}) },
      decided_by: input.decided_by,
      decided_at: timestamp,
      updated_at: timestamp,
    };
    return memory.approvals[index];
  }
  if (!existing) return null;
  const current = mapApproval(existing);
  const nextPayload = { ...current.payload, ...(input.payload || {}) };
  const nextAction = input.proposed_action || current.proposed_action;

  await db.prepare(
    `UPDATE agent_approvals
     SET status = ?, proposed_action = ?, payload_json = ?, decided_by = ?, decided_at = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(input.status, nextAction, JSON.stringify(nextPayload), input.decided_by, timestamp, timestamp, id)
    .run();

  return {
    ...current,
    status: input.status,
    proposed_action: nextAction,
    payload: nextPayload,
    decided_by: input.decided_by,
    decided_at: timestamp,
    updated_at: timestamp,
  };
}

export async function createStorageObject(
  db: D1Database | undefined,
  input: Omit<StorageObject, "id" | "organization_id" | "created_at"> & Partial<Pick<StorageObject, "organization_id">>,
) {
  const object: StorageObject = {
    id: newId("obj"),
    organization_id: input.organization_id || DEFAULT_ORG_ID,
    created_at: nowIso(),
    ...input,
  };

  if (!db) {
    memory.storageObjects.push(object);
    return object;
  }

  const existing = await db
    .prepare("SELECT * FROM storage_objects WHERE r2_key = ? LIMIT 1")
    .bind(object.r2_key)
    .first<Record<string, unknown>>()
    .catch(() => null);
  if (existing) {
    await db
      .prepare(
        `UPDATE storage_objects
         SET organization_id = ?, bucket = ?, file_name = ?, mime_type = ?, size_bytes = ?, sha256 = ?, category = ?,
             resource_type = ?, resource_id = ?, visibility = ?, created_by = ?
         WHERE r2_key = ?`,
      )
      .bind(
        object.organization_id,
        object.bucket,
        object.file_name,
        object.mime_type,
        object.size_bytes,
        object.sha256,
        object.category,
        object.resource_type,
        object.resource_id,
        object.visibility,
        object.created_by,
        object.r2_key,
      )
      .run();
    return {
      ...mapStorageObject(existing),
      organization_id: object.organization_id,
      bucket: object.bucket,
      file_name: object.file_name,
      mime_type: object.mime_type,
      size_bytes: object.size_bytes,
      sha256: object.sha256,
      category: object.category,
      resource_type: object.resource_type,
      resource_id: object.resource_id,
      visibility: object.visibility,
      created_by: object.created_by,
    };
  }

  try {
    await db.prepare(
      `INSERT INTO storage_objects
        (id, organization_id, bucket, r2_key, file_name, mime_type, size_bytes, sha256, category, resource_type, resource_id, visibility, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        object.id,
        object.organization_id,
        object.bucket,
        object.r2_key,
        object.file_name,
        object.mime_type,
        object.size_bytes,
        object.sha256,
        object.category,
        object.resource_type,
        object.resource_id,
        object.visibility,
        object.created_by,
        object.created_at,
      )
      .run();
  } catch {
    const stored = await db
      .prepare("SELECT * FROM storage_objects WHERE r2_key = ? LIMIT 1")
      .bind(object.r2_key)
      .first<Record<string, unknown>>()
      .catch(() => null);
    if (stored) return mapStorageObject(stored);
    memory.storageObjects.push(object);
  }

  return object;
}

export async function getStorageObjectById(db: D1Database | undefined, id: string | null | undefined): Promise<StorageObject | null> {
  if (!id) return null;
  if (!db) return memory.storageObjects.find((object) => object.id === id) || null;
  const row = await db
    .prepare("SELECT * FROM storage_objects WHERE id = ? LIMIT 1")
    .bind(id)
    .first<Record<string, unknown>>()
    .catch(() => null);
  return row ? mapStorageObject(row) : null;
}

export async function createDocumentMetadata(
  db: D1Database | undefined,
  input: Pick<DocumentMetadata, "title" | "r2_key"> &
    Partial<Omit<DocumentMetadata, "id" | "organization_id" | "title" | "r2_key" | "created_at" | "updated_at"> & { organization_id: string }>,
) {
  const timestamp = nowIso();
  const document: DocumentMetadata = {
    id: newId("doc"),
    organization_id: input.organization_id || DEFAULT_ORG_ID,
    type: input.type || "File",
    title: input.title,
    recipient_name: input.recipient_name || null,
    recipient_company: input.recipient_company || null,
    recipient_email: input.recipient_email || null,
    total_cents: input.total_cents ?? null,
    status: input.status || "stored",
    r2_key: input.r2_key,
    created_by_user_id: input.created_by_user_id || null,
    created_at: timestamp,
    updated_at: timestamp,
  };

  if (!db) {
    memory.documentRecords.push(document);
    return document;
  }

  try {
    await db.prepare(
      `INSERT INTO documents
        (id, organization_id, type, title, recipient_name, recipient_company, recipient_email, total_cents, status, r2_key, created_by_user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        document.id,
        document.organization_id,
        document.type,
        document.title,
        document.recipient_name,
        document.recipient_company,
        document.recipient_email,
        document.total_cents,
        document.status,
        document.r2_key,
        document.created_by_user_id,
        document.created_at,
        document.updated_at,
      )
      .run();
  } catch {
    memory.documentRecords.push(document);
  }

  return document;
}

export async function listCalendarEvents(db?: D1Database, organizationId = DEFAULT_ORG_ID) {
  if (!db) return memory.calendarEvents.filter((event) => event.organization_id === organizationId).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const result = await db
    .prepare("SELECT * FROM calendar_events WHERE organization_id = ? ORDER BY starts_at ASC LIMIT 200")
    .bind(organizationId)
    .all<Record<string, unknown>>();
  return (result.results || []).map(mapCalendarEvent);
}

export async function getCalendarEvent(db: D1Database | undefined, id: string, organizationId = DEFAULT_ORG_ID) {
  if (!db) return memory.calendarEvents.find((event) => event.id === id && event.organization_id === organizationId) || null;
  const row = await db
    .prepare("SELECT * FROM calendar_events WHERE id = ? AND organization_id = ? LIMIT 1")
    .bind(id, organizationId)
    .first<Record<string, unknown>>()
    .catch(() => null);
  return row ? mapCalendarEvent(row) : null;
}

export async function createCalendarEvent(
  db: D1Database | undefined,
  input: Pick<CalendarEvent, "title" | "starts_at" | "ends_at"> &
    Partial<Omit<CalendarEvent, "id" | "title" | "starts_at" | "ends_at" | "created_at" | "updated_at">>,
) {
  const timestamp = nowIso();
  const event: CalendarEvent = {
    id: newId("cal"),
    organization_id: input.organization_id || DEFAULT_ORG_ID,
    title: input.title,
    starts_at: input.starts_at,
    ends_at: input.ends_at,
    timezone: input.timezone || "America/New_York",
    location: input.location || null,
    meeting_url: input.meeting_url || null,
    status: input.status || "tentative",
    event_type: input.event_type || "meeting",
    deal_id: input.deal_id || null,
    contact_id: input.contact_id || null,
    attendees: input.attendees || [],
    notes: input.notes || null,
    created_by: input.created_by || null,
    created_at: timestamp,
    updated_at: timestamp,
  };

  if (!db) {
    memory.calendarEvents.push(event);
    return event;
  }

  try {
    await db.prepare(
      `INSERT INTO calendar_events
        (id, organization_id, title, starts_at, ends_at, timezone, location, meeting_url, status, event_type, deal_id, contact_id, attendees_json, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        event.id,
        event.organization_id,
        event.title,
        event.starts_at,
        event.ends_at,
        event.timezone,
        event.location,
        event.meeting_url,
        event.status,
        event.event_type,
        event.deal_id,
        event.contact_id,
        JSON.stringify(event.attendees),
        event.notes,
        event.created_by,
        event.created_at,
        event.updated_at,
      )
      .run();
  } catch {
    memory.calendarEvents.push(event);
  }

  return event;
}

export async function updateCalendarEvent(
  db: D1Database | undefined,
  id: string,
  input: Partial<Pick<CalendarEvent, "title" | "starts_at" | "ends_at" | "timezone" | "location" | "meeting_url" | "status" | "event_type" | "deal_id" | "contact_id" | "attendees" | "notes">>,
  organizationId = DEFAULT_ORG_ID,
) {
  const existing = await getCalendarEvent(db, id, organizationId);
  if (!existing) return null;

  const updated: CalendarEvent = {
    ...existing,
    ...input,
    location: input.location === undefined ? existing.location : input.location || null,
    meeting_url: input.meeting_url === undefined ? existing.meeting_url : input.meeting_url || null,
    deal_id: input.deal_id === undefined ? existing.deal_id : input.deal_id || null,
    contact_id: input.contact_id === undefined ? existing.contact_id : input.contact_id || null,
    notes: input.notes === undefined ? existing.notes : input.notes || null,
    attendees: input.attendees || existing.attendees,
    updated_at: nowIso(),
  };

  if (!db) {
    const index = memory.calendarEvents.findIndex((event) => event.id === id && event.organization_id === organizationId);
    if (index >= 0) memory.calendarEvents[index] = updated;
    return updated;
  }

  await db.prepare(
    `UPDATE calendar_events
     SET title = ?, starts_at = ?, ends_at = ?, timezone = ?, location = ?, meeting_url = ?, status = ?, event_type = ?,
         deal_id = ?, contact_id = ?, attendees_json = ?, notes = ?, updated_at = ?
     WHERE id = ? AND organization_id = ?`,
  )
    .bind(
      updated.title,
      updated.starts_at,
      updated.ends_at,
      updated.timezone,
      updated.location,
      updated.meeting_url,
      updated.status,
      updated.event_type,
      updated.deal_id,
      updated.contact_id,
      JSON.stringify(updated.attendees),
      updated.notes,
      updated.updated_at,
      id,
      organizationId,
    )
    .run();

  return updated;
}

export async function deleteCalendarEvent(db: D1Database | undefined, id: string, organizationId = DEFAULT_ORG_ID) {
  return archiveCalendarEvent(db, id, organizationId);
}

export async function archiveCalendarEvent(db: D1Database | undefined, id: string, organizationId = DEFAULT_ORG_ID) {
  const existing = await getCalendarEvent(db, id, organizationId);
  if (!existing) return null;
  const timestamp = nowIso();
  const archived = { ...existing, status: "canceled" as const, updated_at: timestamp };
  if (!db) {
    const index = memory.calendarEvents.findIndex((event) => event.id === id && event.organization_id === organizationId);
    if (index >= 0) memory.calendarEvents[index] = archived;
    return archived;
  }
  await db.prepare("UPDATE calendar_events SET status = ?, updated_at = ? WHERE id = ? AND organization_id = ?").bind("canceled", timestamp, id, organizationId).run();
  return archived;
}

export async function listCalendarAvailability(
  db: D1Database | undefined,
  input: { starts_at: string; ends_at: string; duration_minutes?: number; organization_id?: string },
) {
  const organizationId = input.organization_id || DEFAULT_ORG_ID;
  const rows = db
    ? await db
        .prepare(
          `SELECT * FROM calendar_events
           WHERE organization_id = ? AND status NOT IN ('canceled', 'cancelled') AND starts_at < ? AND ends_at > ?
           ORDER BY starts_at ASC LIMIT 200`,
        )
        .bind(organizationId, input.ends_at, input.starts_at)
        .all<Record<string, unknown>>()
        .catch(() => ({ results: [] as Record<string, unknown>[] }))
    : null;
  const events = rows
    ? (rows.results || []).map(mapCalendarEvent)
    : memory.calendarEvents.filter(
        (event) =>
          event.organization_id === organizationId &&
          event.status !== "canceled" &&
          String(event.status) !== "cancelled" &&
          event.starts_at < input.ends_at &&
          event.ends_at > input.starts_at,
      );

  const windowStart = new Date(input.starts_at).getTime();
  const windowEnd = new Date(input.ends_at).getTime();
  const durationMs = Math.max(input.duration_minutes || 30, 1) * 60 * 1000;
  const busy = events.map((event) => ({ id: event.id, title: event.title, starts_at: event.starts_at, ends_at: event.ends_at }));
  const available: Array<{ starts_at: string; ends_at: string }> = [];
  let cursor = windowStart;

  for (const event of events.sort((a, b) => a.starts_at.localeCompare(b.starts_at))) {
    const eventStart = new Date(event.starts_at).getTime();
    const eventEnd = new Date(event.ends_at).getTime();
    if (eventStart - cursor >= durationMs) {
      available.push({ starts_at: new Date(cursor).toISOString(), ends_at: new Date(eventStart).toISOString() });
    }
    cursor = Math.max(cursor, eventEnd);
  }
  if (windowEnd - cursor >= durationMs) {
    available.push({ starts_at: new Date(cursor).toISOString(), ends_at: new Date(windowEnd).toISOString() });
  }

  return { busy, available };
}

export async function listVoiceCalls(db?: D1Database, organizationId = DEFAULT_ORG_ID) {
  if (!db) return memory.voiceCalls.filter((call) => call.organization_id === organizationId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const result = await db
    .prepare("SELECT * FROM voice_calls WHERE organization_id = ? ORDER BY created_at DESC LIMIT 100")
    .bind(organizationId)
    .all<Record<string, unknown>>()
    .catch(() => ({ results: [] as Record<string, unknown>[] }));
  return (result.results || []).map(mapVoiceCall);
}

export async function getVoiceCall(db: D1Database | undefined, id: string, organizationId = DEFAULT_ORG_ID) {
  if (!db) return memory.voiceCalls.find((call) => call.id === id && call.organization_id === organizationId) || null;
  const row = await db
    .prepare("SELECT * FROM voice_calls WHERE id = ? AND organization_id = ? LIMIT 1")
    .bind(id, organizationId)
    .first<Record<string, unknown>>()
    .catch(() => null);
  return row ? mapVoiceCall(row) : null;
}

export async function createVoiceCall(
  db: D1Database | undefined,
  input: Partial<Omit<VoiceCall, "id" | "organization_id" | "created_at" | "updated_at">> & { organization_id?: string },
) {
  const timestamp = nowIso();
  const call: VoiceCall = {
    id: newId("vcall"),
    organization_id: input.organization_id || DEFAULT_ORG_ID,
    direction: input.direction || "inbound",
    status: input.status || "scheduled",
    started_at: input.started_at || null,
    ended_at: input.ended_at || null,
    duration_seconds: input.duration_seconds ?? null,
    participants: input.participants || [],
    consent: input.consent || { recordingAllowed: false, transcriptionAllowed: false, mode: "unknown" },
    recording: input.recording || { enabled: false, status: "not_started", r2Key: null },
    transcript: input.transcript || { enabled: false, status: "not_started", r2Key: null },
    transcript_text: input.transcript_text || null,
    summary: input.summary || null,
    related_records: input.related_records || {},
    agentic_outputs: input.agentic_outputs || {},
    payload_r2_key: null,
    storage_object_id: null,
    provider: input.provider || null,
    provider_call_id: input.provider_call_id || null,
    created_by: input.created_by || null,
    created_at: timestamp,
    updated_at: timestamp,
  };

  if (!db) {
    memory.voiceCalls.push(call);
    return call;
  }

  await db.prepare(
    `INSERT INTO voice_calls
      (id, organization_id, direction, status, started_at, ended_at, duration_seconds, participants_json, consent_json,
       recording_json, transcript_json, transcript_text, summary, related_records_json, agentic_outputs_json,
       payload_r2_key, storage_object_id, provider, provider_call_id, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      call.id,
      call.organization_id,
      call.direction,
      call.status,
      call.started_at,
      call.ended_at,
      call.duration_seconds,
      JSON.stringify(call.participants),
      JSON.stringify(call.consent),
      JSON.stringify(call.recording),
      JSON.stringify(call.transcript),
      call.transcript_text,
      call.summary,
      JSON.stringify(call.related_records),
      JSON.stringify(call.agentic_outputs),
      call.payload_r2_key,
      call.storage_object_id,
      call.provider,
      call.provider_call_id,
      call.created_by,
      call.created_at,
      call.updated_at,
    )
    .run();

  return call;
}

export async function updateVoiceCall(
  db: D1Database | undefined,
  id: string,
  input: Partial<Omit<VoiceCall, "id" | "organization_id" | "created_at" | "updated_at">>,
  organizationId = DEFAULT_ORG_ID,
) {
  const existing = await getVoiceCall(db, id, organizationId);
  if (!existing) return null;
  const updated: VoiceCall = { ...existing, ...input, updated_at: nowIso() };

  if (!db) {
    const index = memory.voiceCalls.findIndex((call) => call.id === id && call.organization_id === organizationId);
    if (index >= 0) memory.voiceCalls[index] = updated;
    return updated;
  }

  await db.prepare(
    `UPDATE voice_calls
     SET direction = ?, status = ?, started_at = ?, ended_at = ?, duration_seconds = ?, participants_json = ?,
         consent_json = ?, recording_json = ?, transcript_json = ?, transcript_text = ?, summary = ?,
         related_records_json = ?, agentic_outputs_json = ?, payload_r2_key = ?, storage_object_id = ?,
         provider = ?, provider_call_id = ?, created_by = ?, updated_at = ?
     WHERE id = ? AND organization_id = ?`,
  )
    .bind(
      updated.direction,
      updated.status,
      updated.started_at,
      updated.ended_at,
      updated.duration_seconds,
      JSON.stringify(updated.participants),
      JSON.stringify(updated.consent),
      JSON.stringify(updated.recording),
      JSON.stringify(updated.transcript),
      updated.transcript_text,
      updated.summary,
      JSON.stringify(updated.related_records),
      JSON.stringify(updated.agentic_outputs),
      updated.payload_r2_key,
      updated.storage_object_id,
      updated.provider,
      updated.provider_call_id,
      updated.created_by,
      updated.updated_at,
      id,
      organizationId,
    )
    .run();

  return updated;
}

export async function createEvent(
  db: D1Database | undefined,
  input: Omit<AgentEvent, "id" | "created_at">,
) {
  const event: AgentEvent = {
    id: newId("evt"),
    created_at: nowIso(),
    ...input,
  };

  if (!db) {
    memory.events.push(event);
    return event;
  }

  try {
    await db.prepare(
      `INSERT INTO events
        (id, organization_id, event_type, actor_type, actor_id, resource_type, resource_id, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        event.id,
        event.organization_id,
        event.event_type,
        event.actor_type,
        event.actor_id,
        event.resource_type,
        event.resource_id,
        JSON.stringify(event.payload),
        event.created_at,
      )
      .run();
  } catch {
    memory.events.push(event);
  }

  return event;
}

export async function createAgentJob(
  db: D1Database | undefined,
  input: Pick<AgentJob, "agent" | "job_type" | "input"> & Partial<Pick<AgentJob, "organization_id" | "run_after">>,
) {
  const timestamp = nowIso();
  const job: AgentJob = {
    id: newId("job"),
    organization_id: input.organization_id ?? DEFAULT_ORG_ID,
    agent: input.agent,
    job_type: input.job_type,
    status: "queued",
    input: input.input,
    output: null,
    error: null,
    run_after: input.run_after ?? null,
    created_at: timestamp,
    updated_at: timestamp,
  };

  if (!db) {
    memory.jobs.push(job);
    await createEvent(undefined, {
      organization_id: job.organization_id,
      event_type: "agent_job.created",
      actor_type: "system",
      actor_id: null,
      resource_type: "agent_job",
      resource_id: job.id,
      payload: { agent: job.agent, job_type: job.job_type },
    });
    return job;
  }

  try {
    await db.prepare(
      `INSERT INTO agent_jobs
        (id, organization_id, agent, job_type, status, input_json, output_json, error, run_after, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        job.id,
        job.organization_id,
        job.agent,
        job.job_type,
        job.status,
        JSON.stringify(job.input),
        null,
        null,
        job.run_after,
        job.created_at,
        job.updated_at,
      )
      .run();
  } catch {
    memory.jobs.push(job);
    await createEvent(undefined, {
      organization_id: job.organization_id,
      event_type: "agent_job.created",
      actor_type: "system",
      actor_id: null,
      resource_type: "agent_job",
      resource_id: job.id,
      payload: { agent: job.agent, job_type: job.job_type },
    });
    return job;
  }

  await createEvent(db, {
    organization_id: job.organization_id,
    event_type: "agent_job.created",
    actor_type: "system",
    actor_id: null,
    resource_type: "agent_job",
    resource_id: job.id,
    payload: { agent: job.agent, job_type: job.job_type },
  });

  return job;
}

export async function listQueuedAgentJobs(db?: D1Database, limit = 10) {
  if (!db) {
    return memory.jobs
      .filter((job) => job.status === "queued" && (!job.run_after || job.run_after <= nowIso()))
      .slice(0, limit);
  }
  const result = await db.prepare(
    `SELECT * FROM agent_jobs
     WHERE status = 'queued' AND (run_after IS NULL OR run_after <= ?)
     ORDER BY created_at ASC
     LIMIT ?`,
  )
    .bind(nowIso(), limit)
    .all<Record<string, unknown>>();
  return (result.results || []).map(mapJob);
}

export async function markAgentJobRunning(db: D1Database | undefined, job: AgentJob) {
  const updated = { ...job, status: "running" as const, updated_at: nowIso() };
  if (!db) {
    const index = memory.jobs.findIndex((item) => item.id === job.id);
    if (index >= 0) memory.jobs[index] = updated;
    return updated;
  }
  await db.prepare("UPDATE agent_jobs SET status = ?, updated_at = ? WHERE id = ?")
    .bind("running", updated.updated_at, job.id)
    .run();
  return updated;
}

export async function createWorkflowState(
  db: D1Database | undefined,
  input: Pick<WorkflowState, "workflow_type" | "state"> &
    Partial<Pick<WorkflowState, "organization_id" | "status" | "resource_type" | "resource_id">>,
) {
  const timestamp = nowIso();
  const workflow: WorkflowState = {
    id: newId("wf"),
    organization_id: input.organization_id || DEFAULT_ORG_ID,
    workflow_type: input.workflow_type,
    status: input.status || "active",
    resource_type: input.resource_type || null,
    resource_id: input.resource_id || null,
    state: input.state,
    created_at: timestamp,
    updated_at: timestamp,
  };

  if (!db) {
    memory.workflows.push(workflow);
    return workflow;
  }

  await db.prepare(
    `INSERT INTO workflow_states
      (id, organization_id, workflow_type, status, resource_type, resource_id, state_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      workflow.id,
      workflow.organization_id,
      workflow.workflow_type,
      workflow.status,
      workflow.resource_type,
      workflow.resource_id,
      JSON.stringify(workflow.state),
      workflow.created_at,
      workflow.updated_at,
    )
    .run();

  return workflow;
}

export async function completeAgentJob(
  db: D1Database | undefined,
  job: AgentJob,
  output: Record<string, unknown>,
) {
  const updated = { ...job, status: "completed" as const, output, updated_at: nowIso() };

  if (!db) {
    const index = memory.jobs.findIndex((item) => item.id === job.id);
    if (index >= 0) memory.jobs[index] = updated;
    await createEvent(undefined, {
      organization_id: job.organization_id,
      event_type: "agent_job.completed",
      actor_type: "agent",
      actor_id: job.agent,
      resource_type: "agent_job",
      resource_id: job.id,
      payload: output,
    });
    return updated;
  }

  await db.prepare("UPDATE agent_jobs SET status = ?, output_json = ?, updated_at = ? WHERE id = ?")
    .bind("completed", JSON.stringify(output), updated.updated_at, job.id)
    .run();
  await createEvent(db, {
    organization_id: job.organization_id,
    event_type: "agent_job.completed",
    actor_type: "agent",
    actor_id: job.agent,
    resource_type: "agent_job",
    resource_id: job.id,
    payload: output,
  });
  return updated;
}

export async function failAgentJob(
  db: D1Database | undefined,
  job: AgentJob,
  error: string,
) {
  const updated = { ...job, status: "failed" as const, error, updated_at: nowIso() };
  if (!db) {
    const index = memory.jobs.findIndex((item) => item.id === job.id);
    if (index >= 0) memory.jobs[index] = updated;
    return updated;
  }
  await db.prepare("UPDATE agent_jobs SET status = ?, error = ?, updated_at = ? WHERE id = ?")
    .bind("failed", error, updated.updated_at, job.id)
    .run();
  return updated;
}

export async function listAgentJobs(db?: D1Database) {
  if (!db) return memory.jobs.slice(-50).reverse();
  const result = await db.prepare("SELECT * FROM agent_jobs ORDER BY created_at DESC LIMIT 50").all<Record<string, unknown>>();
  return (result.results || []).map(mapJob);
}

// ─────────────────────────────────────────────────────────────────────────────
// DealFlow persistence. Database tables still use the legacy map_* names until a safe migration renames them.
// ─────────────────────────────────────────────────────────────────────────────

export type DealFlowNodeKind =
  | "deal"
  | "group"
  | "contact"
  | "company"
  | "bank"
  | "document"
  | "email"
  | "website"
  | "audio"
  | "video"
  | "task"
  | "call"
  | "call_step"
  | "meeting"
  | "journey_step"
  | "invoice"
  | "financial"
  | "action";
export type DealFlowNodeStatus = "neutral" | "active" | "warning" | "overdue" | "done";

export interface DealFlowRecord {
  id: string;
  organization_id: string;
  name: string;
  deal_id: string | null;
  template: string | null;
  payload_r2_key: string | null;
  storage_object_id: string | null;
  created_by_user_id: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealFlowNodeRecord {
  id: string;
  map_id: string;
  kind: DealFlowNodeKind;
  label: string;
  sublabel: string | null;
  status: DealFlowNodeStatus | null;
  position_x: number;
  position_y: number;
  data: Record<string, unknown>;
  payload_r2_key: string | null;
  storage_object_id: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealFlowEdgeRecord {
  id: string;
  map_id: string;
  source_node_id: string;
  target_node_id: string;
  label: string | null;
  style: Record<string, unknown> | null;
  payload_r2_key: string | null;
  storage_object_id: string | null;
  archived_at: string | null;
  created_at: string;
}

// Use globalThis so the in-memory fallback survives Next.js dev HMR. In production
// the D1 path is taken and this object is never touched.
interface DealFlowMemoryStore {
  maps: DealFlowRecord[];
  nodes: DealFlowNodeRecord[];
  edges: DealFlowEdgeRecord[];
}
const dealFlowMemoryGlobal = globalThis as unknown as { __adgaDealFlowMemory?: DealFlowMemoryStore };
const dealFlowMemory: DealFlowMemoryStore =
  dealFlowMemoryGlobal.__adgaDealFlowMemory ||
  (dealFlowMemoryGlobal.__adgaDealFlowMemory = { maps: [], nodes: [], edges: [] });

function mapDealFlowRow(row: Record<string, unknown>): DealFlowRecord {
  return {
    id: String(row.id),
    organization_id: String(row.organization_id),
    name: String(row.name),
    deal_id: row.deal_id ? String(row.deal_id) : null,
    template: row.template ? String(row.template) : null,
    payload_r2_key: row.payload_r2_key ? String(row.payload_r2_key) : null,
    storage_object_id: row.storage_object_id ? String(row.storage_object_id) : null,
    created_by_user_id: row.created_by_user_id ? String(row.created_by_user_id) : null,
    archived_at: row.archived_at ? String(row.archived_at) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapDealFlowNodeRow(row: Record<string, unknown>): DealFlowNodeRecord {
  return {
    id: String(row.id),
    map_id: String(row.map_id),
    kind: String(row.kind) as DealFlowNodeKind,
    label: String(row.label),
    sublabel: row.sublabel ? String(row.sublabel) : null,
    status: row.status ? (String(row.status) as DealFlowNodeStatus) : null,
    position_x: Number(row.position_x || 0),
    position_y: Number(row.position_y || 0),
    data: parseJson(String(row.data_json || "{}"), {} as Record<string, unknown>),
    payload_r2_key: row.payload_r2_key ? String(row.payload_r2_key) : null,
    storage_object_id: row.storage_object_id ? String(row.storage_object_id) : null,
    archived_at: row.archived_at ? String(row.archived_at) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapDealFlowEdgeRow(row: Record<string, unknown>): DealFlowEdgeRecord {
  return {
    id: String(row.id),
    map_id: String(row.map_id),
    source_node_id: String(row.source_node_id),
    target_node_id: String(row.target_node_id),
    label: row.label ? String(row.label) : null,
    style: row.style ? parseJson(String(row.style), {} as Record<string, unknown>) : null,
    payload_r2_key: row.payload_r2_key ? String(row.payload_r2_key) : null,
    storage_object_id: row.storage_object_id ? String(row.storage_object_id) : null,
    archived_at: row.archived_at ? String(row.archived_at) : null,
    created_at: String(row.created_at),
  };
}

export async function listDealFlows(db: D1Database | undefined, organizationId: string = DEFAULT_ORG_ID): Promise<DealFlowRecord[]> {
  if (!db) return dealFlowMemory.maps.filter((m) => m.organization_id === organizationId && !m.archived_at).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const result = await db
    .prepare("SELECT * FROM maps WHERE organization_id = ? AND archived_at IS NULL ORDER BY updated_at DESC LIMIT 200")
    .bind(organizationId)
    .all<Record<string, unknown>>()
    .catch(() =>
      db.prepare("SELECT * FROM maps WHERE organization_id = ? ORDER BY updated_at DESC LIMIT 200").bind(organizationId).all<Record<string, unknown>>()
    );
  return (result.results || []).map(mapDealFlowRow);
}

export async function getDealFlow(db: D1Database | undefined, id: string, organizationId: string = DEFAULT_ORG_ID): Promise<DealFlowRecord | null> {
  if (!db) return dealFlowMemory.maps.find((m) => m.id === id && m.organization_id === organizationId && !m.archived_at) || null;
  const row = await db
    .prepare("SELECT * FROM maps WHERE id = ? AND organization_id = ? AND archived_at IS NULL LIMIT 1")
    .bind(id, organizationId)
    .first<Record<string, unknown>>()
    .catch(() => db.prepare("SELECT * FROM maps WHERE id = ? AND organization_id = ? LIMIT 1").bind(id, organizationId).first<Record<string, unknown>>());
  return row ? mapDealFlowRow(row) : null;
}

export async function getDealFlowNodes(db: D1Database | undefined, dealFlowId: string): Promise<DealFlowNodeRecord[]> {
  if (!db) return dealFlowMemory.nodes.filter((n) => n.map_id === dealFlowId && !n.archived_at);
  const result = await db
    .prepare("SELECT * FROM map_nodes WHERE map_id = ? AND archived_at IS NULL ORDER BY created_at ASC")
    .bind(dealFlowId)
    .all<Record<string, unknown>>()
    .catch(() => db.prepare("SELECT * FROM map_nodes WHERE map_id = ? ORDER BY created_at ASC").bind(dealFlowId).all<Record<string, unknown>>());
  return (result.results || []).map(mapDealFlowNodeRow);
}

export async function getDealFlowEdges(db: D1Database | undefined, dealFlowId: string): Promise<DealFlowEdgeRecord[]> {
  if (!db) return dealFlowMemory.edges.filter((e) => e.map_id === dealFlowId && !e.archived_at);
  const result = await db
    .prepare("SELECT * FROM map_edges WHERE map_id = ? AND archived_at IS NULL ORDER BY created_at ASC")
    .bind(dealFlowId)
    .all<Record<string, unknown>>()
    .catch(() => db.prepare("SELECT * FROM map_edges WHERE map_id = ? ORDER BY created_at ASC").bind(dealFlowId).all<Record<string, unknown>>());
  return (result.results || []).map(mapDealFlowEdgeRow);
}

export async function createDealFlow(
  db: D1Database | undefined,
  input: Pick<DealFlowRecord, "name"> & Partial<Pick<DealFlowRecord, "organization_id" | "deal_id" | "template" | "created_by_user_id">>,
): Promise<DealFlowRecord> {
  const timestamp = nowIso();
  const record: DealFlowRecord = {
    id: newId("map"),
    organization_id: input.organization_id || DEFAULT_ORG_ID,
    name: input.name,
    deal_id: input.deal_id || null,
    template: input.template || null,
    payload_r2_key: null,
    storage_object_id: null,
    created_by_user_id: input.created_by_user_id || null,
    archived_at: null,
    created_at: timestamp,
    updated_at: timestamp,
  };

  if (!db) {
    dealFlowMemory.maps.push(record);
    return record;
  }

  await db
    .prepare(
      `INSERT INTO maps (id, organization_id, name, deal_id, template, created_by_user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      record.id,
      record.organization_id,
      record.name,
      record.deal_id,
      record.template,
      record.created_by_user_id,
      record.created_at,
      record.updated_at,
    )
    .run();

  return record;
}

export async function updateDealFlow(
  db: D1Database | undefined,
  id: string,
  organizationId: string,
  patch: Partial<Pick<DealFlowRecord, "name" | "deal_id" | "template">>,
): Promise<DealFlowRecord | null> {
  const existing = await getDealFlow(db, id, organizationId);
  if (!existing) return null;

  const next: DealFlowRecord = {
    ...existing,
    name: patch.name ?? existing.name,
    deal_id: patch.deal_id === undefined ? existing.deal_id : patch.deal_id,
    template: patch.template === undefined ? existing.template : patch.template,
    updated_at: nowIso(),
  };

  if (!db) {
    const index = dealFlowMemory.maps.findIndex((m) => m.id === id);
    if (index >= 0) dealFlowMemory.maps[index] = next;
    return next;
  }

  await db
    .prepare(
      `UPDATE maps SET name = ?, deal_id = ?, template = ?, updated_at = ?
       WHERE id = ? AND organization_id = ?`,
    )
    .bind(next.name, next.deal_id, next.template, next.updated_at, id, organizationId)
    .run();

  return next;
}

export async function deleteDealFlow(
  db: D1Database | undefined,
  id: string,
  organizationId: string,
): Promise<boolean> {
  return archiveDealFlow(db, id, organizationId);
}

export async function archiveDealFlow(
  db: D1Database | undefined,
  id: string,
  organizationId: string,
): Promise<boolean> {
  const existing = await getDealFlow(db, id, organizationId);
  if (!existing) return false;
  const timestamp = nowIso();

  if (!db) {
    dealFlowMemory.maps = dealFlowMemory.maps.map((m) =>
      m.id === id && m.organization_id === organizationId ? { ...m, archived_at: timestamp, updated_at: timestamp } : m,
    );
    dealFlowMemory.nodes = dealFlowMemory.nodes.map((n) => n.map_id === id ? { ...n, archived_at: timestamp, updated_at: timestamp } : n);
    dealFlowMemory.edges = dealFlowMemory.edges.map((e) => e.map_id === id ? { ...e, archived_at: timestamp } : e);
    return true;
  }

  await db.prepare("UPDATE map_edges SET archived_at = ? WHERE map_id = ?").bind(timestamp, id).run().catch(() => null);
  await db.prepare("UPDATE map_nodes SET archived_at = ?, updated_at = ? WHERE map_id = ?").bind(timestamp, timestamp, id).run().catch(() => null);
  await db.prepare("UPDATE maps SET archived_at = ?, updated_at = ? WHERE id = ? AND organization_id = ?")
    .bind(timestamp, timestamp, id, organizationId)
    .run()
    .catch(() =>
      db.prepare("UPDATE maps SET template = ?, updated_at = ? WHERE id = ? AND organization_id = ?")
        .bind("archived", timestamp, id, organizationId)
        .run()
    );
  return true;
}

async function touchDealFlow(db: D1Database | undefined, dealFlowId: string) {
  const timestamp = nowIso();
  if (!db) {
    const index = dealFlowMemory.maps.findIndex((m) => m.id === dealFlowId);
    if (index >= 0) dealFlowMemory.maps[index] = { ...dealFlowMemory.maps[index], updated_at: timestamp };
    return;
  }
  await db.prepare("UPDATE maps SET updated_at = ? WHERE id = ?").bind(timestamp, dealFlowId).run();
}

export async function createDealFlowNode(
  db: D1Database | undefined,
  dealFlowId: string,
  input: {
    kind: DealFlowNodeKind;
    label: string;
    sublabel?: string | null;
    status?: DealFlowNodeStatus | null;
    position_x: number;
    position_y: number;
    data?: Record<string, unknown>;
    id?: string;
  },
): Promise<DealFlowNodeRecord> {
  const timestamp = nowIso();
  const record: DealFlowNodeRecord = {
    id: input.id || newId("mnode"),
    map_id: dealFlowId,
    kind: input.kind,
    label: input.label,
    sublabel: input.sublabel ?? null,
    status: input.status ?? null,
    position_x: input.position_x,
    position_y: input.position_y,
    data: input.data || {},
    payload_r2_key: null,
    storage_object_id: null,
    archived_at: null,
    created_at: timestamp,
    updated_at: timestamp,
  };

  if (!db) {
    dealFlowMemory.nodes.push(record);
    await touchDealFlow(undefined, dealFlowId);
    return record;
  }

  await db
    .prepare(
      `INSERT INTO map_nodes (id, map_id, kind, label, sublabel, status, position_x, position_y, data_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      record.id,
      record.map_id,
      record.kind,
      record.label,
      record.sublabel,
      record.status,
      record.position_x,
      record.position_y,
      JSON.stringify(record.data),
      record.created_at,
      record.updated_at,
    )
    .run();

  await touchDealFlow(db, dealFlowId);
  return record;
}

export async function updateDealFlowNode(
  db: D1Database | undefined,
  dealFlowId: string,
  nodeId: string,
  patch: Partial<Pick<DealFlowNodeRecord, "label" | "sublabel" | "status" | "position_x" | "position_y" | "kind"> & { data: Record<string, unknown> }>,
): Promise<DealFlowNodeRecord | null> {
  const timestamp = nowIso();

  if (!db) {
    const index = dealFlowMemory.nodes.findIndex((n) => n.id === nodeId && n.map_id === dealFlowId);
    if (index < 0) return null;
    const next: DealFlowNodeRecord = {
      ...dealFlowMemory.nodes[index],
      ...(patch.label !== undefined ? { label: patch.label } : {}),
      ...(patch.sublabel !== undefined ? { sublabel: patch.sublabel } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.position_x !== undefined ? { position_x: patch.position_x } : {}),
      ...(patch.position_y !== undefined ? { position_y: patch.position_y } : {}),
      ...(patch.kind !== undefined ? { kind: patch.kind } : {}),
      ...(patch.data !== undefined ? { data: patch.data } : {}),
      updated_at: timestamp,
    };
    dealFlowMemory.nodes[index] = next;
    await touchDealFlow(undefined, dealFlowId);
    return next;
  }

  const existing = await db
    .prepare("SELECT * FROM map_nodes WHERE id = ? AND map_id = ? LIMIT 1")
    .bind(nodeId, dealFlowId)
    .first<Record<string, unknown>>();
  if (!existing) return null;
  const current = mapDealFlowNodeRow(existing);

  const next: DealFlowNodeRecord = {
    ...current,
    label: patch.label ?? current.label,
    sublabel: patch.sublabel === undefined ? current.sublabel : patch.sublabel,
    status: patch.status === undefined ? current.status : patch.status,
    position_x: patch.position_x ?? current.position_x,
    position_y: patch.position_y ?? current.position_y,
    kind: patch.kind ?? current.kind,
    data: patch.data ?? current.data,
    updated_at: timestamp,
  };

  await db
    .prepare(
      `UPDATE map_nodes
       SET label = ?, sublabel = ?, status = ?, position_x = ?, position_y = ?, kind = ?, data_json = ?, updated_at = ?
       WHERE id = ? AND map_id = ?`,
    )
    .bind(
      next.label,
      next.sublabel,
      next.status,
      next.position_x,
      next.position_y,
      next.kind,
      JSON.stringify(next.data),
      next.updated_at,
      nodeId,
      dealFlowId,
    )
    .run();

  await touchDealFlow(db, dealFlowId);
  return next;
}

export async function bulkUpdateDealFlowNodePositions(
  db: D1Database | undefined,
  dealFlowId: string,
  positions: Array<{ id: string; position_x: number; position_y: number }>,
): Promise<number> {
  if (positions.length === 0) return 0;
  const timestamp = nowIso();

  if (!db) {
    let count = 0;
    for (const pos of positions) {
      const index = dealFlowMemory.nodes.findIndex((n) => n.id === pos.id && n.map_id === dealFlowId);
      if (index < 0) continue;
      dealFlowMemory.nodes[index] = {
        ...dealFlowMemory.nodes[index],
        position_x: pos.position_x,
        position_y: pos.position_y,
        updated_at: timestamp,
      };
      count++;
    }
    await touchDealFlow(undefined, dealFlowId);
    return count;
  }

  const stmt = db.prepare(
    "UPDATE map_nodes SET position_x = ?, position_y = ?, updated_at = ? WHERE id = ? AND map_id = ?",
  );
  for (const pos of positions) {
    await stmt.bind(pos.position_x, pos.position_y, timestamp, pos.id, dealFlowId).run();
  }
  await touchDealFlow(db, dealFlowId);
  return positions.length;
}

export async function deleteDealFlowNode(
  db: D1Database | undefined,
  dealFlowId: string,
  nodeId: string,
): Promise<boolean> {
  return archiveDealFlowNode(db, dealFlowId, nodeId);
}

export async function archiveDealFlowNode(
  db: D1Database | undefined,
  dealFlowId: string,
  nodeId: string,
): Promise<boolean> {
  const timestamp = nowIso();
  if (!db) {
    const index = dealFlowMemory.nodes.findIndex((n) => n.id === nodeId && n.map_id === dealFlowId && !n.archived_at);
    if (index < 0) return false;
    dealFlowMemory.nodes[index] = { ...dealFlowMemory.nodes[index], archived_at: timestamp, updated_at: timestamp };
    dealFlowMemory.edges = dealFlowMemory.edges.map((e) =>
      e.map_id === dealFlowId && (e.source_node_id === nodeId || e.target_node_id === nodeId)
        ? { ...e, archived_at: timestamp }
        : e,
    );
    await touchDealFlow(undefined, dealFlowId);
    return true;
  }

  const existing = await db
    .prepare("SELECT id FROM map_nodes WHERE id = ? AND map_id = ? AND archived_at IS NULL LIMIT 1")
    .bind(nodeId, dealFlowId)
    .first<{ id: string }>()
    .catch(() => db.prepare("SELECT id FROM map_nodes WHERE id = ? AND map_id = ? LIMIT 1").bind(nodeId, dealFlowId).first<{ id: string }>());
  if (!existing) return false;

  await db
    .prepare("UPDATE map_edges SET archived_at = ? WHERE map_id = ? AND (source_node_id = ? OR target_node_id = ?)")
    .bind(timestamp, dealFlowId, nodeId, nodeId)
    .run()
    .catch(() => null);
  await db.prepare("UPDATE map_nodes SET archived_at = ?, updated_at = ? WHERE id = ? AND map_id = ?").bind(timestamp, timestamp, nodeId, dealFlowId).run();
  await touchDealFlow(db, dealFlowId);
  return true;
}

export async function createDealFlowEdge(
  db: D1Database | undefined,
  dealFlowId: string,
  input: {
    source_node_id: string;
    target_node_id: string;
    label?: string | null;
    style?: Record<string, unknown> | null;
    id?: string;
  },
): Promise<DealFlowEdgeRecord> {
  const record: DealFlowEdgeRecord = {
    id: input.id || newId("medge"),
    map_id: dealFlowId,
    source_node_id: input.source_node_id,
    target_node_id: input.target_node_id,
    label: input.label ?? null,
    style: input.style ?? null,
    payload_r2_key: null,
    storage_object_id: null,
    archived_at: null,
    created_at: nowIso(),
  };

  if (!db) {
    dealFlowMemory.edges.push(record);
    await touchDealFlow(undefined, dealFlowId);
    return record;
  }

  await db
    .prepare(
      `INSERT INTO map_edges (id, map_id, source_node_id, target_node_id, label, style, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      record.id,
      record.map_id,
      record.source_node_id,
      record.target_node_id,
      record.label,
      record.style ? JSON.stringify(record.style) : null,
      record.created_at,
    )
    .run();

  await touchDealFlow(db, dealFlowId);
  return record;
}

export async function deleteDealFlowEdge(
  db: D1Database | undefined,
  dealFlowId: string,
  edgeId: string,
): Promise<boolean> {
  return archiveDealFlowEdge(db, dealFlowId, edgeId);
}

export async function archiveDealFlowEdge(
  db: D1Database | undefined,
  dealFlowId: string,
  edgeId: string,
): Promise<boolean> {
  const timestamp = nowIso();
  if (!db) {
    const index = dealFlowMemory.edges.findIndex((e) => e.id === edgeId && e.map_id === dealFlowId && !e.archived_at);
    if (index < 0) return false;
    dealFlowMemory.edges[index] = { ...dealFlowMemory.edges[index], archived_at: timestamp };
    await touchDealFlow(undefined, dealFlowId);
    return true;
  }

  const existing = await db
    .prepare("SELECT id FROM map_edges WHERE id = ? AND map_id = ? AND archived_at IS NULL LIMIT 1")
    .bind(edgeId, dealFlowId)
    .first<{ id: string }>()
    .catch(() => db.prepare("SELECT id FROM map_edges WHERE id = ? AND map_id = ? LIMIT 1").bind(edgeId, dealFlowId).first<{ id: string }>());
  if (!existing) return false;

  await db.prepare("UPDATE map_edges SET archived_at = ? WHERE id = ? AND map_id = ?").bind(timestamp, edgeId, dealFlowId).run();
  await touchDealFlow(db, dealFlowId);
  return true;
}
