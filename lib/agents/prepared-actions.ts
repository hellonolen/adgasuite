import { createCalendarEvent } from "@/lib/server/repository";
import { newId, nowIso } from "@/lib/server/id";
import { DEFAULT_ORG_ID } from "@/lib/server/tenant";
import { publish } from "@/lib/events/bus";

const DEAL_STAGES = new Set(["lead", "qualify", "discover", "scope", "design", "close", "sign", "deliver", "expand", "won", "lost"]);
const EXTERNAL_ACTIONS = new Set([
  "send_email",
  "send_sms",
  "send_invoice",
  "collect_payment",
  "process_payment",
  "sign_contract",
  "execute_legal_document",
  "file_legal_document",
]);

type JsonRecord = Record<string, unknown>;

export interface CreateTaskPreparedAction {
  type: "create_task";
  title: string;
  priority?: "low" | "medium" | "high";
  due_at?: string | null;
  deal_id?: string | null;
  contact_id?: string | null;
  assigned_user_id?: string | null;
  note?: string | null;
}

export interface ScheduleCalendarEventPreparedAction {
  type: "schedule_calendar_event";
  title: string;
  starts_at: string;
  ends_at: string;
  timezone?: string;
  location?: string | null;
  meeting_url?: string | null;
  event_type?: "meeting" | "call" | "deadline" | "reminder" | "internal";
  deal_id?: string | null;
  contact_id?: string | null;
  attendees?: Array<{ name?: string; email: string; role?: string }>;
  notes?: string | null;
}

export interface UpdateDealStagePreparedAction {
  type: "update_deal_stage";
  deal_id: string;
  stage: string;
}

export type UnsupportedPreparedAction = {
  type: string;
  [key: string]: unknown;
};

export type PreparedAction =
  | CreateTaskPreparedAction
  | ScheduleCalendarEventPreparedAction
  | UpdateDealStagePreparedAction
  | UnsupportedPreparedAction;

export interface PreparedActionExecution {
  status: "executed" | "blocked" | "skipped" | "failed";
  action_type?: string;
  resource_type?: string;
  resource_id?: string;
  message: string;
  executed_at: string;
}

export function getPreparedAction(payload: JsonRecord | null | undefined): PreparedAction | null {
  const candidate = payload?.prepared_action ?? payload?.preparedAction ?? payload?.action;
  if (!candidate || typeof candidate !== "object") return null;
  const type = (candidate as { type?: unknown }).type;
  if (typeof type !== "string" || !type.trim()) return null;
  return candidate as PreparedAction;
}

export function normalizePreparedAction(input: unknown): PreparedAction | null {
  if (!input || typeof input !== "object") return null;
  const action = input as JsonRecord;
  const type = typeof action.type === "string" ? action.type.trim() : "";
  if (!type) return null;

  if (type === "create_task") {
    const title = stringValue(action.title);
    if (!title) return null;
    return {
      type,
      title,
      priority: normalizePriority(action.priority),
      due_at: nullableString(action.due_at),
      deal_id: nullableString(action.deal_id),
      contact_id: nullableString(action.contact_id),
      assigned_user_id: nullableString(action.assigned_user_id),
      note: nullableString(action.note),
    };
  }

  if (type === "schedule_calendar_event") {
    const title = stringValue(action.title);
    const starts_at = stringValue(action.starts_at);
    const ends_at = stringValue(action.ends_at);
    if (!title || !starts_at || !ends_at) return null;
    return {
      type,
      title,
      starts_at,
      ends_at,
      timezone: stringValue(action.timezone) || "America/New_York",
      location: nullableString(action.location),
      meeting_url: nullableString(action.meeting_url),
      event_type: normalizeEventType(action.event_type),
      deal_id: nullableString(action.deal_id),
      contact_id: nullableString(action.contact_id),
      attendees: normalizeAttendees(action.attendees),
      notes: nullableString(action.notes),
    };
  }

  if (type === "update_deal_stage") {
    const deal_id = stringValue(action.deal_id);
    const stage = stringValue(action.stage).toLowerCase();
    if (!deal_id || !DEAL_STAGES.has(stage)) return null;
    return { type, deal_id, stage };
  }

  return { ...action, type } as PreparedAction;
}

export async function executePreparedAction(input: {
  db: D1Database | undefined;
  approval: {
    id: string;
    organization_id?: string | null;
    payload: JsonRecord;
  };
  actorEmail: string;
}): Promise<PreparedActionExecution> {
  const action = getPreparedAction(input.approval.payload);
  const executed_at = nowIso();
  if (!action) {
    return { status: "skipped", message: "No prepared action was attached to this approval.", executed_at };
  }

  const prior = input.approval.payload.prepared_action_execution;
  if (prior && typeof prior === "object" && (prior as { status?: unknown }).status === "executed") {
    return {
      ...(prior as PreparedActionExecution),
      message: "Prepared action already executed.",
    };
  }

  if (EXTERNAL_ACTIONS.has(action.type)) {
    return {
      status: "blocked",
      action_type: action.type,
      message: "External sends, payments, and legal actions require their dedicated explicit approval flow and were not executed here.",
      executed_at,
    };
  }

  try {
    switch (action.type) {
      case "create_task":
        return await executeCreateTask(input.db, action as CreateTaskPreparedAction, input);
      case "schedule_calendar_event":
        return await executeScheduleCalendarEvent(input.db, action as ScheduleCalendarEventPreparedAction, input);
      case "update_deal_stage":
        return await executeUpdateDealStage(input.db, action as UpdateDealStagePreparedAction, input);
      default:
        return {
          status: "blocked",
          action_type: action.type,
          message: `Unsupported prepared action type: ${action.type}.`,
          executed_at,
        };
    }
  } catch (error) {
    return {
      status: "failed",
      action_type: action.type,
      message: error instanceof Error ? error.message : "Prepared action execution failed.",
      executed_at,
    };
  }
}

async function executeCreateTask(
  db: D1Database | undefined,
  action: CreateTaskPreparedAction,
  context: { approval: { id: string; organization_id?: string | null }; actorEmail: string },
): Promise<PreparedActionExecution> {
  const timestamp = nowIso();
  const organizationId = context.approval.organization_id || DEFAULT_ORG_ID;
  const taskId = newId("task");
  const payload = { note: action.note || null, approval_id: context.approval.id, prepared_action_type: action.type };

  if (db) {
    await db.prepare(
      `INSERT INTO tasks
        (id, organization_id, contact_id, deal_id, title, type, priority, status, due_at, assigned_user_id, payload_r2_key, storage_object_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        taskId,
        organizationId,
        action.contact_id || null,
        action.deal_id || null,
        action.title,
        "task",
        action.priority || "medium",
        "pending",
        action.due_at || null,
        action.assigned_user_id || null,
        null,
        null,
        timestamp,
        timestamp,
      )
      .run();
  }

  await publish(db, {
    organization_id: organizationId,
    event_type: "prepared_action.executed",
    actor_type: "user",
    actor_id: context.actorEmail,
    resource_type: "task",
    resource_id: taskId,
    payload,
  });

  return {
    status: "executed",
    action_type: action.type,
    resource_type: "task",
    resource_id: taskId,
    message: "Task created.",
    executed_at: timestamp,
  };
}

async function executeScheduleCalendarEvent(
  db: D1Database | undefined,
  action: ScheduleCalendarEventPreparedAction,
  context: { approval: { id: string; organization_id?: string | null }; actorEmail: string },
): Promise<PreparedActionExecution> {
  const organizationId = context.approval.organization_id || DEFAULT_ORG_ID;
  const event = await createCalendarEvent(db, {
    organization_id: organizationId,
    title: action.title,
    starts_at: action.starts_at,
    ends_at: action.ends_at,
    timezone: action.timezone || "America/New_York",
    location: action.location || null,
    meeting_url: action.meeting_url || null,
    event_type: action.event_type || "meeting",
    deal_id: action.deal_id || null,
    contact_id: action.contact_id || null,
    attendees: action.attendees || [],
    notes: action.notes || null,
    created_by: context.actorEmail,
  });

  await publish(db, {
    organization_id: organizationId,
    event_type: "prepared_action.executed",
    actor_type: "user",
    actor_id: context.actorEmail,
    resource_type: "calendar_event",
    resource_id: event.id,
    payload: { approval_id: context.approval.id, prepared_action_type: action.type },
  });

  return {
    status: "executed",
    action_type: action.type,
    resource_type: "calendar_event",
    resource_id: event.id,
    message: "Calendar event scheduled.",
    executed_at: nowIso(),
  };
}

async function executeUpdateDealStage(
  db: D1Database | undefined,
  action: UpdateDealStagePreparedAction,
  context: { approval: { id: string; organization_id?: string | null }; actorEmail: string },
): Promise<PreparedActionExecution> {
  const timestamp = nowIso();
  const organizationId = context.approval.organization_id || DEFAULT_ORG_ID;

  if (!db) {
    await publish(db, {
      organization_id: organizationId,
      event_type: "prepared_action.executed",
      actor_type: "user",
      actor_id: context.actorEmail,
      resource_type: "deal",
      resource_id: action.deal_id,
      payload: { approval_id: context.approval.id, prepared_action_type: action.type, stage: action.stage },
    });
    return {
      status: "executed",
      action_type: action.type,
      resource_type: "deal",
      resource_id: action.deal_id,
      message: "Deal stage update recorded.",
      executed_at: timestamp,
    };
  }

  const result = await db
    .prepare("UPDATE deals SET stage = ?, updated_at = ? WHERE id = ? AND organization_id = ?")
    .bind(action.stage, timestamp, action.deal_id, organizationId)
    .run();
  const changes = result.meta && typeof result.meta === "object" && "changes" in result.meta
    ? Number((result.meta as { changes?: unknown }).changes || 0)
    : 0;

  if (!changes) throw new Error("Deal not found for prepared stage update.");

  await publish(db, {
    organization_id: organizationId,
    event_type: "prepared_action.executed",
    actor_type: "user",
    actor_id: context.actorEmail,
    resource_type: "deal",
    resource_id: action.deal_id,
    payload: { approval_id: context.approval.id, prepared_action_type: action.type, stage: action.stage },
  });

  return {
    status: "executed",
    action_type: action.type,
    resource_type: "deal",
    resource_id: action.deal_id,
    message: "Deal stage updated.",
    executed_at: timestamp,
  };
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullableString(value: unknown): string | null {
  const text = stringValue(value);
  return text || null;
}

function normalizePriority(value: unknown): "low" | "medium" | "high" {
  return value === "low" || value === "high" ? value : "medium";
}

function normalizeEventType(value: unknown): "meeting" | "call" | "deadline" | "reminder" | "internal" {
  return value === "call" || value === "deadline" || value === "reminder" || value === "internal" ? value : "meeting";
}

function normalizeAttendees(value: unknown): Array<{ name?: string; email: string; role?: string }> {
  if (!Array.isArray(value)) return [];
  const attendees: Array<{ name?: string; email: string; role?: string }> = [];
  for (const attendee of value) {
    if (!attendee || typeof attendee !== "object") continue;
    const email = stringValue((attendee as JsonRecord).email);
    if (!email) continue;
    attendees.push({
      email,
      name: stringValue((attendee as JsonRecord).name) || undefined,
      role: stringValue((attendee as JsonRecord).role) || undefined,
    });
  }
  return attendees;
}
