import { errorJson, json, readJson } from "@/lib/server/http";
import { createAgentJob, createEvent } from "@/lib/server/repository";
import { getRuntimeContext } from "@/lib/server/runtime";
import { normalizePlan } from "@/lib/plans";
import { newId } from "@/lib/server/id";
import { storeJsonPayload } from "@/lib/server/payload-storage";

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
  const requestId = newId("access");
  const requestPayload = {
    id: requestId,
    email: body.email,
    name: body.name || "",
    company: body.company || "",
    role: body.role || "",
    plan,
    seats: body.seats || "",
    notes: body.notes || "",
  };
  const stored = context.env.DB
    ? await storeJsonPayload({
        env: context.env,
        db: context.env.DB,
        organization_id: "org_adga_primary",
        resource_type: "access_request",
        resource_id: requestId,
        payload: requestPayload,
        created_by: "public-access-request",
      })
    : null;

  const event = await createEvent(context.env.DB, {
    organization_id: "org_adga_primary",
    event_type: "access.requested",
    actor_type: "system",
    actor_id: "public-access-request",
    resource_type: "access_request",
    resource_id: requestId,
    payload: {
      access_request_id: requestId,
      plan,
      seats: body.seats || "",
      payload_r2_key: stored?.r2_key || null,
      storage_object_id: stored?.storage_object_id || null,
    },
  });

  const job = await createAgentJob(context.env.DB, {
    agent: "operations",
    job_type: "access_request.review",
    input: {
      access_request_id: requestId,
      plan,
      seats: body.seats || "",
      payload_r2_key: stored?.r2_key || null,
      storage_object_id: stored?.storage_object_id || null,
      requested_at: event.created_at,
    },
  });

  return json({ ok: true, event, job });
}
