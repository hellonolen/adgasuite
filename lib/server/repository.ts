import { deals, documents, intelligence, leads, tasks, workspaces } from "@/lib/data/seed";
import { newId, nowIso } from "@/lib/server/id";

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

const DEFAULT_ORG_ID = "org_adga_primary";

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
  approvals: [] as AgentApproval[],
  storageObjects: [] as StorageObject[],
  documentRecords: [] as DocumentMetadata[],
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

export async function getSuiteState(db?: D1Database) {
  // No D1 binding (local dev without remote DB) → use in-memory seed so the UI still has shape.
  if (!db) {
    return {
      organization: { id: DEFAULT_ORG_ID, name: "ADGA", plan: "suite", subscription_status: "trialing" },
      leads,
      deals,
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
    db.prepare("SELECT * FROM agent_jobs ORDER BY created_at DESC LIMIT 25").all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM events ORDER BY created_at DESC LIMIT 50").all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM calendar_events ORDER BY starts_at ASC LIMIT 100").all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM agent_approvals ORDER BY created_at DESC LIMIT 50").all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM storage_objects ORDER BY created_at DESC LIMIT 50").all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM leads ORDER BY received_at DESC, created_at DESC LIMIT 200").all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM deals ORDER BY updated_at DESC LIMIT 200").all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM contacts ORDER BY updated_at DESC LIMIT 200").all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM tasks ORDER BY due_at ASC NULLS LAST LIMIT 100").all<Record<string, unknown>>().catch(() =>
      db.prepare("SELECT * FROM tasks ORDER BY due_at ASC LIMIT 100").all<Record<string, unknown>>()
    ),
    db.prepare("SELECT * FROM documents ORDER BY created_at DESC LIMIT 100").all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM knowledge_workspaces ORDER BY created_at DESC LIMIT 50").all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM intelligence_battlecards ORDER BY updated_at DESC LIMIT 50").all<Record<string, unknown>>().catch(() => ({ results: [] as Record<string, unknown>[] })),
  ]);

  // When D1 is connected we trust D1 — even empty results mean "real account, no records yet."
  return {
    organization: { id: DEFAULT_ORG_ID, name: "ADGA", plan: "suite", subscription_status: "trialing" },
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
    memory.storageObjects.push(object);
  }

  return object;
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

export async function listCalendarEvents(db?: D1Database) {
  if (!db) return memory.calendarEvents.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const result = await db.prepare("SELECT * FROM calendar_events ORDER BY starts_at ASC LIMIT 200").all<Record<string, unknown>>();
  return (result.results || []).map(mapCalendarEvent);
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
