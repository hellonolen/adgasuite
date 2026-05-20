import { errorJson, json, readJson } from "@/lib/server/http";
import { createAgentJob, createEvent } from "@/lib/server/repository";
import { getRuntimeContext } from "@/lib/server/runtime";
import { normalizePlan } from "@/lib/plans";

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  const body = await readJson<{
    name?: string;
    email?: string;
    company?: string;
    role?: string;
    plan?: string;
    seats?: string;
    notes?: string;
  }>(request);

  if (!body.email) return errorJson("email is required.");
  const plan = normalizePlan(body.plan);

  const event = await createEvent(context.env.DB, {
    organization_id: "org_adga_primary",
    event_type: "access.requested",
    actor_type: "user",
    actor_id: body.email,
    resource_type: "access_request",
    resource_id: body.email,
    payload: {
      name: body.name || "",
      company: body.company || "",
      role: body.role || "",
      plan,
      seats: body.seats || "",
      notes: body.notes || "",
    },
  });

  const job = await createAgentJob(context.env.DB, {
    agent: "operations",
    job_type: "access_request.review",
    input: {
      email: body.email,
      name: body.name || "",
      company: body.company || "",
      plan,
      seats: body.seats || "",
      requested_at: event.created_at,
    },
  });

  return json({ ok: true, event, job });
}
