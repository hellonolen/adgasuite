import { redirect } from "next/navigation";

import { CalendarView, type CalendarDealOption, type CalendarViewEvent } from "@/components/suite/CalendarView";
import { listCalendarEvents } from "@/lib/server/repository";
import { getAdminRuntime, resolveAdminSession } from "@/lib/server/admin-session";

export const dynamic = "force-dynamic";

interface DealRow {
  id: string;
  name: string | null;
}

export default async function CalendarPage() {
  const session = await resolveAdminSession();
  if (!session) {
    redirect("/login?redirect=/suite/calendar");
  }

  const { context } = await getAdminRuntime();
  const db = context.env.DB;

  const [events, dealRows] = await Promise.all([
    listCalendarEvents(db),
    db
      ? db
          .prepare("SELECT id, name FROM deals ORDER BY updated_at DESC LIMIT 200")
          .all<DealRow>()
          .then((r) => r.results || [])
          .catch(() => [] as DealRow[])
      : Promise.resolve([] as DealRow[]),
  ]);

  const initialEvents: CalendarViewEvent[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    starts_at: e.starts_at,
    ends_at: e.ends_at,
    timezone: e.timezone,
    location: e.location,
    meeting_url: e.meeting_url,
    status: e.status,
    event_type: e.event_type,
    deal_id: e.deal_id,
    attendees: e.attendees,
    notes: e.notes,
  }));

  const deals: CalendarDealOption[] = (dealRows.length
    ? dealRows
    : seededDeals()
  ).map((d) => ({ id: d.id, name: d.name || d.id }));

  return (
    <main className="min-h-screen bg-[#f9f7f4]">
      <header className="border-b border-[var(--rule,#e8e4de)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <a href="/suite" className="text-xs font-medium uppercase tracking-[0.12em] text-[#6b6760] hover:text-[#0d0c0a]">
              ← Suite
            </a>
            <div className="h-4 w-px bg-[var(--rule,#e8e4de)]" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">Workspace</div>
              <div className="text-base font-semibold text-[#0d0c0a]">Calendar</div>
            </div>
          </div>
          <div className="text-xs text-[#6b6760]">{session.email}</div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="h-[calc(100vh-160px)] min-h-[640px]">
          <CalendarView initialEvents={initialEvents} deals={deals} />
        </div>
      </div>
    </main>
  );
}

/** Fallback deal list when D1 hasn't been provisioned yet (local dev). Mirrors the seed deals so the composer still has selectable deals. */
function seededDeals(): DealRow[] {
  return [
    { id: "DEAL-1207", name: "Heliograph Industries — Series C extension" },
    { id: "DEAL-1208", name: "Northbound Therapeutics — Licensing deal" },
    { id: "DEAL-1209", name: "Larkfield Capital — Strategic partnership" },
    { id: "DEAL-1210", name: "Meridian Cold Chain — Acquisition" },
    { id: "DEAL-1213", name: "Quorum Energy — Joint venture" },
    { id: "DEAL-1218", name: "Tessellate Robotics — Series B participation" },
  ];
}
