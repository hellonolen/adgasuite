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
    phone?: string;
    company?: string;
    job_title?: string;
    website?: string;
    preferred_contact_method?: string;
    best_time_to_contact?: string;
    linkedin_url?: string;
    social_profiles?: Record<string, string>;
    business_phone?: string;
    business_email?: string;
    industry?: string;
    business_type?: string;
    company_size?: string;
    revenue_range?: string;
    city?: string;
    state_region?: string;
    country?: string;
    timezone?: string;
    business_state?: string;
    need_summary?: string;
    value?: number;
    priority?: string;
    urgency?: string;
    urgency_reason?: string;
    source?: string;
    qr_source?: string;
    referral_source?: string;
    deal_type?: string;
    stage?: string;
    follow_up_due_at?: string;
    follow_up_sequence?: string;
    document_links?: string[];
    tags?: string[];
    due_at?: string;
    notes?: string;
  }>(request);

  if (!body.type || !["lead", "deal", "task"].includes(body.type)) return errorJson("type must be lead, deal, or task.");
  if (!body.title) return errorJson("title is required.");

  const timestamp = nowIso();
  const org = "org_adga_primary";
  let record: Record<string, unknown>;
  const followUpDueAt = body.follow_up_due_at || body.due_at || null;
  const urgency = body.urgency || (followUpDueAt ? "Scheduled" : "Normal");
  const priority = body.priority || (urgency === "Immediate" ? "high" : "medium");
  const estimatedValueCents = Math.round(Number(body.value || 0) * 100);

  if (body.type === "lead") {
    record = {
      id: newId("lead"),
      organization_id: org,
      full_name: body.title,
      email: body.email || "unknown@adga.local",
      company: body.company || "Unassigned",
      job_title: body.job_title || null,
      phone: body.phone || null,
      website: body.website || null,
      preferred_contact_method: body.preferred_contact_method || null,
      best_time_to_contact: body.best_time_to_contact || null,
      social_profiles_json: JSON.stringify(body.social_profiles || {}),
      linkedin_url: body.linkedin_url || null,
      business_phone: body.business_phone || null,
      business_email: body.business_email || null,
      industry: body.industry || null,
      business_type: body.business_type || null,
      company_size: body.company_size || null,
      revenue_range: body.revenue_range || null,
      city: body.city || null,
      state_region: body.state_region || null,
      country: body.country || null,
      timezone: body.timezone || null,
      business_state: body.business_state || null,
      need_summary: body.need_summary || null,
      source: body.source || "Manual",
      qr_source: body.qr_source || null,
      referral_source: body.referral_source || null,
      status: "Warm",
      score: 55,
      urgency,
      urgency_reason: body.urgency_reason || null,
      priority,
      estimated_value_cents: estimatedValueCents,
      deal_type: body.deal_type || null,
      stage: body.stage || "New",
      owner_user_id: null,
      next_action: body.notes || "Review lead and determine next action.",
      follow_up_due_at: followUpDueAt,
      follow_up_sequence: body.follow_up_sequence || (urgency === "Immediate" ? "five-minute" : "standard"),
      follow_up_status: followUpDueAt ? "scheduled" : "not_started",
      next_scheduled_follow_up_at: followUpDueAt,
      notes: body.notes || null,
      document_links_json: JSON.stringify(body.document_links || []),
      tags_json: JSON.stringify(body.tags || []),
      agent_summary: body.need_summary || null,
      agent_next_move: followUpDueAt ? "Follow up at the scheduled time." : "Review lead and determine next action.",
      activity_history_json: JSON.stringify([
        {
          type: "lead.created",
          at: timestamp,
          source: body.source || "Manual",
          urgency,
          follow_up_due_at: followUpDueAt,
        },
      ]),
      received_at: timestamp,
      created_at: timestamp,
      updated_at: timestamp,
    };
    if (context.env.DB) try {
      await context.env.DB.prepare(
        `INSERT INTO leads
          (id, organization_id, full_name, email, company, job_title, phone, website, preferred_contact_method, best_time_to_contact,
           social_profiles_json, linkedin_url, business_phone, business_email, industry, business_type, company_size, revenue_range,
           city, state_region, country, timezone, business_state, need_summary, source, qr_source, referral_source, status, score,
           urgency, urgency_reason, priority, estimated_value_cents, deal_type, stage, owner_user_id, next_action, follow_up_due_at,
           follow_up_sequence, follow_up_status, next_scheduled_follow_up_at, notes, document_links_json, tags_json, agent_summary,
           agent_next_move, activity_history_json, received_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          record.id, org, record.full_name, record.email, record.company, record.job_title, record.phone, record.website,
          record.preferred_contact_method, record.best_time_to_contact, record.social_profiles_json, record.linkedin_url,
          record.business_phone, record.business_email, record.industry, record.business_type, record.company_size,
          record.revenue_range, record.city, record.state_region, record.country, record.timezone, record.business_state,
          record.need_summary, record.source, record.qr_source, record.referral_source, record.status, record.score,
          record.urgency, record.urgency_reason, record.priority, record.estimated_value_cents, record.deal_type, record.stage,
          record.owner_user_id, record.next_action, record.follow_up_due_at, record.follow_up_sequence, record.follow_up_status,
          record.next_scheduled_follow_up_at, record.notes, record.document_links_json, record.tags_json, record.agent_summary,
          record.agent_next_move, record.activity_history_json, record.received_at, timestamp, timestamp,
        )
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
