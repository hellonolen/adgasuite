import { errorJson, json, readJson } from "@/lib/server/http";
import { createAgentJob, createEvent } from "@/lib/server/repository";
import { newId, nowIso } from "@/lib/server/id";
import { getRuntimeContext, requireAdmin } from "@/lib/server/runtime";

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  requireAdmin(context);
  const body = await readJson<{
    type?: "lead" | "deal" | "task";
    title?: string;
    email?: string;
    company?: string;
    value?: number;
    priority?: string;
    due_at?: string;
    notes?: string;
  }>(request);

  if (!body.type || !["lead", "deal", "task"].includes(body.type)) return errorJson("type must be lead, deal, or task.");
  if (!body.title) return errorJson("title is required.");

  const timestamp = nowIso();
  const org = "org_adga_primary";
  let record: Record<string, unknown>;

  if (body.type === "lead") {
    record = {
      id: newId("lead"),
      organization_id: org,
      full_name: body.title,
      email: body.email || "unknown@adga.local",
      company: body.company || "Unassigned",
      job_title: null,
      source: "Manual",
      status: "Warm",
      score: 55,
      owner_user_id: null,
      next_action: body.notes || "Review lead and determine next action.",
      notes: body.notes || null,
      created_at: timestamp,
      updated_at: timestamp,
    };
    if (context.env.DB) try {
      await context.env.DB.prepare(
        `INSERT INTO leads
          (id, organization_id, full_name, email, company, job_title, source, status, score, owner_user_id, next_action, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(record.id, org, record.full_name, record.email, record.company, null, "Manual", "Warm", 55, null, record.next_action, record.notes, timestamp, timestamp)
        .run();
    } catch {}
  } else if (body.type === "deal") {
    record = {
      id: newId("deal"),
      organization_id: org,
      name: body.title,
      company: body.company || "Unassigned",
      value_cents: Math.round(Number(body.value || 0) * 100),
      stage: "Prospect",
      probability: 10,
      expected_close_at: body.due_at || null,
      created_at: timestamp,
      updated_at: timestamp,
    };
    if (context.env.DB) try {
      await context.env.DB.prepare(
        `INSERT INTO deals
          (id, organization_id, contact_id, name, company, value_cents, stage, probability, expected_close_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(record.id, org, null, record.name, record.company, record.value_cents, "Prospect", 10, record.expected_close_at, timestamp, timestamp)
        .run();
    } catch {}
  } else {
    record = {
      id: newId("task"),
      organization_id: org,
      title: body.title,
      type: "task",
      priority: body.priority || "medium",
      status: "pending",
      due_at: body.due_at || null,
      created_at: timestamp,
      updated_at: timestamp,
    };
    if (context.env.DB) try {
      await context.env.DB.prepare(
        `INSERT INTO tasks
          (id, organization_id, contact_id, deal_id, title, type, priority, status, due_at, assigned_user_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(record.id, org, null, null, record.title, "task", record.priority, "pending", record.due_at, null, timestamp, timestamp)
        .run();
    } catch {}
  }

  const event = await createEvent(context.env.DB, {
    organization_id: org,
    event_type: `${body.type}.created`,
    actor_type: "user",
    actor_id: context.user.email,
    resource_type: body.type,
    resource_id: String(record.id),
    payload: { record, notes: body.notes || "" },
  });

  const job = await createAgentJob(context.env.DB, {
    agent: body.type === "task" ? "operations" : "sales",
    job_type: `${body.type}.created.review`,
    input: { record, requested_by: context.user.email },
  });

  return json({ ok: true, record, event, job });
}
