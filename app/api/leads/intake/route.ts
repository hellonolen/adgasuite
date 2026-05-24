import { json, readJson } from "@/lib/server/http";
import { createAgentJob } from "@/lib/server/repository";
import { publish } from "@/lib/events/bus";
import { newId, nowIso } from "@/lib/server/id";
import { getRuntimeContext } from "@/lib/server/runtime";
import { storeJsonPayload } from "@/lib/server/payload-storage";

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  const contentType = request.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await readJson<Record<string, unknown>>(request)
    : Object.fromEntries((await request.formData()).entries());
  const timestamp = nowIso();
  const org = "org_adga_primary";
  const urgency = String(body.urgency || "Normal");
  const followUpDueAt = body.follow_up_due_at ? String(body.follow_up_due_at) : urgency === "Immediate" ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : null;
  const record = {
    id: newId("lead"),
    organization_id: org,
    full_name: String(body.full_name || body.title || "New lead"),
    email: String(body.email || "unknown@adga.local"),
    phone: body.phone ? String(body.phone) : null,
    company: String(body.company || "Unassigned"),
    job_title: body.job_title ? String(body.job_title) : null,
    website: body.website ? String(body.website) : null,
    preferred_contact_method: body.preferred_contact_method ? String(body.preferred_contact_method) : null,
    best_time_to_contact: body.best_time_to_contact ? String(body.best_time_to_contact) : null,
    social_profiles_json: JSON.stringify({
      linkedin: body.linkedin_url || "",
      x: body.x_url || "",
      instagram: body.instagram_url || "",
      facebook: body.facebook_url || "",
      other: body.other_profile_url || "",
    }),
    linkedin_url: body.linkedin_url ? String(body.linkedin_url) : null,
    industry: body.industry ? String(body.industry) : null,
    business_type: body.business_type ? String(body.business_type) : null,
    city: body.city ? String(body.city) : null,
    state_region: body.state_region ? String(body.state_region) : null,
    country: body.country ? String(body.country) : null,
    business_state: body.business_state ? String(body.business_state) : null,
    need_summary: body.need_summary ? String(body.need_summary) : null,
    source: String(body.source || "Contact form"),
    qr_source: body.qr_source ? String(body.qr_source) : null,
    referral_source: body.referral_source ? String(body.referral_source) : null,
    status: "Warm",
    score: urgency === "Immediate" ? 70 : 55,
    urgency,
    priority: urgency === "Immediate" ? "high" : String(body.priority || "medium"),
    estimated_value_cents: Math.round(Number(body.value || 0) * 100),
    stage: "New",
    next_action: followUpDueAt ? "Follow up at the scheduled time." : "Review lead and determine next action.",
    follow_up_due_at: followUpDueAt,
    follow_up_sequence: urgency === "Immediate" ? "five-minute" : "standard",
    follow_up_status: followUpDueAt ? "scheduled" : "not_started",
    next_scheduled_follow_up_at: followUpDueAt,
    notes: body.notes ? String(body.notes) : null,
    document_links_json: JSON.stringify([]),
    tags_json: JSON.stringify(body.qr_source ? ["qr"] : []),
    agent_summary: body.need_summary ? String(body.need_summary) : null,
    agent_next_move: followUpDueAt ? "Follow up at the scheduled time." : "Review lead and determine next action.",
    activity_history_json: JSON.stringify([{ type: "lead.intake_submitted", at: timestamp, source: body.source || "Contact form", urgency }]),
    received_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
  };
  const stored = context.env.DB
    ? await storeJsonPayload({
        env: context.env,
        db: context.env.DB,
        organization_id: org,
        resource_type: "lead",
        resource_id: record.id,
        payload: record,
        created_by: "public-intake",
      })
    : null;

  if (context.env.DB) try {
    await context.env.DB.prepare(
      `INSERT INTO leads
        (id, organization_id, full_name, email, company, job_title, phone, website, preferred_contact_method, best_time_to_contact,
         social_profiles_json, linkedin_url, industry, business_type, city, state_region, country, business_state, need_summary,
         source, qr_source, referral_source, status, score, urgency, priority, estimated_value_cents, stage, next_action,
         follow_up_due_at, follow_up_sequence, follow_up_status, next_scheduled_follow_up_at, notes, document_links_json,
         tags_json, agent_summary, agent_next_move, activity_history_json, payload_r2_key, storage_object_id, received_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        record.id, org, `Lead ${record.id.slice(-8)}`, `lead-${record.id}@metadata.adga.internal`, "Lead payload in R2", null, null, null,
        null, null, "{}", null,
        null, null, null, null, null, null,
        null, record.source, record.qr_source, record.referral_source, record.status, record.score,
        record.urgency, record.priority, record.estimated_value_cents, record.stage, record.next_action, record.follow_up_due_at,
        record.follow_up_sequence, record.follow_up_status, record.next_scheduled_follow_up_at, null,
        "[]", record.tags_json, null, null, "[]", stored?.r2_key || null, stored?.storage_object_id || null,
        record.received_at, timestamp, timestamp,
      )
      .run();
  } catch {}

  await publish(context.env.DB, {
    organization_id: org,
    event_type: "lead.captured",
    actor_type: "system",
    actor_id: "public-intake",
    resource_type: "lead",
    resource_id: record.id,
    payload: { lead_id: record.id, source: "public-intake", payload_r2_key: stored?.r2_key || null, storage_object_id: stored?.storage_object_id || null },
  });

  await createAgentJob(context.env.DB, {
    agent: "sales",
    job_type: "lead.intake.review",
    input: { lead_id: record.id, payload_r2_key: stored?.r2_key || null, storage_object_id: stored?.storage_object_id || null },
  });

  return json({ ok: true, record });
}
