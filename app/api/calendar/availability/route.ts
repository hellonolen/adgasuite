import { errorJson, json, readJson } from "@/lib/server/http";
import { listCalendarAvailability } from "@/lib/server/repository";
import { getRuntimeContext, requireAdmin } from "@/lib/server/runtime";
import { DEFAULT_ORG_ID } from "@/lib/server/tenant";

function validDate(value: string | null | undefined) {
  return value && !Number.isNaN(new Date(value).getTime()) ? value : null;
}

export async function GET(request: Request) {
  const context = getRuntimeContext(request);
  requireAdmin(context);

  const url = new URL(request.url);
  const startsAt = validDate(url.searchParams.get("starts_at") || url.searchParams.get("start"));
  const endsAt = validDate(url.searchParams.get("ends_at") || url.searchParams.get("end"));
  if (!startsAt || !endsAt) return errorJson("starts_at and ends_at are required ISO timestamps.");

  const duration = Number(url.searchParams.get("duration_minutes") || 30);
  const availability = await listCalendarAvailability(context.env.DB, {
    organization_id: DEFAULT_ORG_ID,
    starts_at: startsAt,
    ends_at: endsAt,
    duration_minutes: Number.isFinite(duration) ? duration : 30,
  });

  return json({ ok: true, ...availability });
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  requireAdmin(context);
  const body = await readJson<{ starts_at?: string; ends_at?: string; duration_minutes?: number }>(request);
  const startsAt = validDate(body.starts_at);
  const endsAt = validDate(body.ends_at);
  if (!startsAt || !endsAt) return errorJson("starts_at and ends_at are required ISO timestamps.");

  const availability = await listCalendarAvailability(context.env.DB, {
    organization_id: DEFAULT_ORG_ID,
    starts_at: startsAt,
    ends_at: endsAt,
    duration_minutes: body.duration_minutes,
  });

  return json({ ok: true, ...availability });
}
