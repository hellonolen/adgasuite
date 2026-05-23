"use client";

import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export interface CalendarViewEvent {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  location: string | null;
  meeting_url: string | null;
  status: "tentative" | "confirmed" | "completed" | "canceled";
  event_type: "meeting" | "call" | "deadline" | "reminder" | "internal";
  deal_id: string | null;
  attendees: Array<{ name?: string; email: string; role?: string }>;
  notes: string | null;
}

export interface CalendarDealOption {
  id: string;
  name: string;
}

interface CalendarViewProps {
  initialEvents: CalendarViewEvent[];
  deals: CalendarDealOption[];
}

type Mode = "month" | "week" | "day";

const EVENT_COLORS: Record<CalendarViewEvent["event_type"], { bg: string; text: string; ring: string }> = {
  meeting: { bg: "#ede9fe", text: "#5d2cd6", ring: "rgba(86,36,199,0.32)" },
  call: { bg: "#ffedd5", text: "#c2410c", ring: "rgba(194,65,12,0.32)" },
  deadline: { bg: "#fee2e2", text: "#b91c1c", ring: "rgba(185,28,28,0.32)" },
  reminder: { bg: "#fef3c7", text: "#a16207", ring: "rgba(161,98,7,0.32)" },
  internal: { bg: "#e0f2fe", text: "#0369a1", ring: "rgba(3,105,161,0.32)" },
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfWeek(d: Date) {
  const day = d.getDay();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
}

function addDays(d: Date, days: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultStarts() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return toLocalInputValue(d.toISOString());
}

function defaultEnds() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 2);
  return toLocalInputValue(d.toISOString());
}

export function CalendarView({ initialEvents, deals }: CalendarViewProps) {
  const [mode, setMode] = React.useState<Mode>("month");
  const [cursor, setCursor] = React.useState<Date>(() => new Date());
  const [events, setEvents] = React.useState<CalendarViewEvent[]>(initialEvents);
  const [selected, setSelected] = React.useState<CalendarViewEvent | null>(null);
  const [composerOpen, setComposerOpen] = React.useState(false);

  const dayEvents = React.useCallback(
    (d: Date) =>
      events
        .filter((e) => isSameDay(new Date(e.starts_at), d))
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [events],
  );

  function shift(direction: -1 | 1) {
    if (mode === "month") {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1));
    } else if (mode === "week") {
      setCursor(addDays(cursor, direction * 7));
    } else {
      setCursor(addDays(cursor, direction));
    }
  }

  function handleEventCreated(event: CalendarViewEvent) {
    setEvents((prev) => [...prev, event].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
    setComposerOpen(false);
    setSelected(event);
  }

  const title = React.useMemo(() => {
    if (mode === "month") {
      return cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    if (mode === "week") {
      const start = startOfWeek(cursor);
      const end = addDays(start, 6);
      return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return cursor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }, [cursor, mode]);

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
            Today
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="Previous" onClick={() => shift(-1)}>
              ‹
            </Button>
            <Button variant="ghost" size="icon" aria-label="Next" onClick={() => shift(1)}>
              ›
            </Button>
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-[#0d0c0a]">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setComposerOpen(true)} className="bg-[#5d2cd6] hover:bg-[#4920b3]">
            + New event
          </Button>
        </div>
      </header>

      <Card className="flex-1 overflow-hidden">
        {events.length === 0 ? (
          <div className="flex h-full min-h-[480px] flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="text-sm font-medium text-[#0d0c0a]">No events yet</div>
            <p className="max-w-sm text-sm text-[#6b6760]">
              Create your first calendar event and we&apos;ll send the ICS invite via email.
            </p>
            <Button onClick={() => setComposerOpen(true)} className="bg-[#5d2cd6] hover:bg-[#4920b3]">
              Create event
            </Button>
          </div>
        ) : mode === "month" ? (
          <MonthGrid cursor={cursor} dayEvents={dayEvents} onPick={setSelected} onDayClick={(d) => { setCursor(d); setMode("day"); }} />
        ) : mode === "week" ? (
          <WeekGrid cursor={cursor} dayEvents={dayEvents} onPick={setSelected} />
        ) : (
          <DayList cursor={cursor} dayEvents={dayEvents} onPick={setSelected} />
        )}
      </Card>

      {selected && <EventDrawer event={selected} deals={deals} onClose={() => setSelected(null)} />}

      {composerOpen && (
        <EventComposer
          deals={deals}
          onClose={() => setComposerOpen(false)}
          onCreated={handleEventCreated}
        />
      )}
    </div>
  );
}

interface MonthGridProps {
  cursor: Date;
  dayEvents: (d: Date) => CalendarViewEvent[];
  onPick: (event: CalendarViewEvent) => void;
  onDayClick: (d: Date) => void;
}

function MonthGrid({ cursor, dayEvents, onPick, onDayClick }: MonthGridProps) {
  const monthStart = startOfMonth(cursor);
  const gridStart = startOfWeek(monthStart);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i += 1) cells.push(addDays(gridStart, i));
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();

  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-7 border-b border-[var(--rule,#e8e4de)] bg-[#faf9f6]">
        {dayLabels.map((d) => (
          <div key={d} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">
            {d}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 grid-rows-6">
        {cells.map((cell, idx) => {
          const inMonth = cell.getMonth() === cursor.getMonth();
          const isToday = isSameDay(cell, today);
          const list = dayEvents(cell);
          return (
            <button
              type="button"
              key={idx}
              onClick={() => onDayClick(cell)}
              className={`relative flex flex-col items-stretch gap-1 border-b border-r border-[var(--rule,#e8e4de)] p-1.5 text-left transition-colors ${
                inMonth ? "bg-white hover:bg-[#fbfaf7]" : "bg-[#f6f4f0] text-[#a8a39c]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-medium ${
                    isToday ? "bg-[#5d2cd6] text-white" : "text-[#0d0c0a]"
                  }`}
                >
                  {cell.getDate()}
                </span>
                {list.length > 3 && (
                  <span className="text-[10px] font-semibold text-[#6b6760]">+{list.length - 3}</span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                {list.slice(0, 3).map((event) => {
                  const palette = EVENT_COLORS[event.event_type];
                  return (
                    <button
                      type="button"
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPick(event);
                      }}
                      className="flex items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[10.5px] font-medium"
                      style={{ background: palette.bg, color: palette.text }}
                    >
                      <span className="font-semibold tabular-nums">{fmtTime(event.starts_at)}</span>
                      <span className="truncate">{event.title}</span>
                    </button>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({ cursor, dayEvents, onPick }: { cursor: Date; dayEvents: (d: Date) => CalendarViewEvent[]; onPick: (e: CalendarViewEvent) => void; }) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = new Date();
  return (
    <div className="grid h-full grid-cols-7">
      {days.map((d) => {
        const list = dayEvents(d);
        const isToday = isSameDay(d, today);
        return (
          <div key={d.toISOString()} className="flex flex-col border-r border-[var(--rule,#e8e4de)] last:border-r-0">
            <div className="border-b border-[var(--rule,#e8e4de)] px-3 py-2 text-xs font-semibold text-[#0d0c0a]">
              <div className="text-[10px] uppercase tracking-[0.14em] text-[#6b6760]">{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
              <div className={`mt-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full text-sm ${isToday ? "bg-[#5d2cd6] text-white" : "text-[#0d0c0a]"}`}>
                {d.getDate()}
              </div>
            </div>
            <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
              {list.length === 0 && <div className="text-[11px] text-[#a8a39c]">No events</div>}
              {list.map((event) => {
                const palette = EVENT_COLORS[event.event_type];
                return (
                  <button
                    type="button"
                    key={event.id}
                    onClick={() => onPick(event)}
                    className="w-full rounded-md border px-2 py-1.5 text-left text-[11.5px] transition-colors"
                    style={{ background: palette.bg, color: palette.text, borderColor: palette.ring }}
                  >
                    <div className="font-semibold tabular-nums">{fmtTime(event.starts_at)}</div>
                    <div className="truncate font-medium">{event.title}</div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayList({ cursor, dayEvents, onPick }: { cursor: Date; dayEvents: (d: Date) => CalendarViewEvent[]; onPick: (e: CalendarViewEvent) => void; }) {
  const list = dayEvents(cursor);
  if (list.length === 0) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 text-sm text-[#6b6760]">
        No events on {cursor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.
      </div>
    );
  }
  return (
    <div className="divide-y divide-[var(--rule,#e8e4de)]">
      {list.map((event) => {
        const palette = EVENT_COLORS[event.event_type];
        return (
          <button
            type="button"
            key={event.id}
            onClick={() => onPick(event)}
            className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-[#fbfaf7]"
          >
            <div className="w-20 shrink-0 text-sm font-semibold tabular-nums text-[#0d0c0a]">
              {fmtTime(event.starts_at)}
              <div className="text-xs font-normal text-[#6b6760]">to {fmtTime(event.ends_at)}</div>
            </div>
            <div className="h-10 w-1 shrink-0 rounded-full" style={{ background: palette.text }} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#0d0c0a]">{event.title}</div>
              <div className="text-xs text-[#6b6760] truncate">
                {[event.location, event.attendees.length ? `${event.attendees.length} attendee${event.attendees.length === 1 ? "" : "s"}` : null]
                  .filter(Boolean)
                  .join(" · ") || "No location"}
              </div>
            </div>
            <Badge variant="outline" style={{ color: palette.text, borderColor: palette.ring }}>
              {event.event_type}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}

function EventDrawer({ event, deals, onClose }: { event: CalendarViewEvent; deals: CalendarDealOption[]; onClose: () => void; }) {
  const palette = EVENT_COLORS[event.event_type];
  const deal = event.deal_id ? deals.find((d) => d.id === event.deal_id) : null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--rule,#e8e4de)] px-6 py-5">
          <div className="min-w-0">
            <Badge variant="outline" style={{ color: palette.text, borderColor: palette.ring }}>
              {event.event_type}
            </Badge>
            <h2 className="mt-2 text-lg font-semibold leading-tight text-[#0d0c0a]">{event.title}</h2>
            <p className="mt-1 text-sm text-[#6b6760]">
              {fmtDate(event.starts_at)} · {fmtTime(event.starts_at)} – {fmtTime(event.ends_at)}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">×</Button>
        </header>

        <div className="space-y-5 px-6 py-5 text-sm">
          {event.notes && (
            <section>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">Notes</div>
              <p className="mt-1.5 whitespace-pre-line text-[#0d0c0a]">{event.notes}</p>
            </section>
          )}

          <section>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">Location</div>
            <p className="mt-1.5 text-[#0d0c0a]">{event.location || "—"}</p>
          </section>

          {event.meeting_url && (
            <section>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">Meeting link</div>
              <a
                href={event.meeting_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-block break-all text-[#5d2cd6] hover:underline"
              >
                {event.meeting_url}
              </a>
            </section>
          )}

          {deal && (
            <section>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">Related deal</div>
              <a href={`/suite/map/${encodeURIComponent(deal.id)}`} className="mt-1.5 inline-block text-[#5d2cd6] hover:underline">
                {deal.name}
              </a>
            </section>
          )}

          <section>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">
              Attendees · {event.attendees.length}
            </div>
            {event.attendees.length === 0 ? (
              <p className="mt-1.5 text-[#6b6760]">No attendees added.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {event.attendees.map((a) => (
                  <li key={a.email} className="flex items-center justify-between gap-3 rounded-md border border-[var(--rule,#e8e4de)] px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-[#0d0c0a]">{a.name || a.email}</div>
                      <div className="truncate text-xs text-[#6b6760]">{a.email}</div>
                    </div>
                    {a.role && <Badge variant="secondary">{a.role}</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

function EventComposer({ deals, onClose, onCreated }: { deals: CalendarDealOption[]; onClose: () => void; onCreated: (e: CalendarViewEvent) => void; }) {
  const [title, setTitle] = React.useState("");
  const [startsAt, setStartsAt] = React.useState(defaultStarts);
  const [endsAt, setEndsAt] = React.useState(defaultEnds);
  const [eventType, setEventType] = React.useState<CalendarViewEvent["event_type"]>("meeting");
  const [dealId, setDealId] = React.useState<string>("");
  const [location, setLocation] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [attendeesText, setAttendeesText] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Add a title for the event.");
      return;
    }
    setSubmitting(true);
    try {
      const attendees = attendeesText
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((email) => ({ email }));
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          starts_at: new Date(startsAt).toISOString(),
          ends_at: new Date(endsAt).toISOString(),
          event_type: eventType,
          deal_id: dealId || undefined,
          location: location.trim() || undefined,
          notes: notes.trim() || undefined,
          attendees,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; event?: CalendarViewEvent; error?: string };
      if (!res.ok || !data.ok || !data.event) {
        throw new Error(data.error || "Failed to create event");
      }
      onCreated(data.event);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-[var(--rule,#e8e4de)] px-6 py-4">
          <h2 className="text-base font-semibold text-[#0d0c0a]">New event</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">×</Button>
        </header>
        <div className="space-y-4 px-6 py-5">
          <Field label="Title">
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Pre-signing alignment"
              className="w-full rounded-md border border-[var(--rule,#e8e4de)] px-3 py-2 text-sm outline-none focus:border-[#5d2cd6]"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts">
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full rounded-md border border-[var(--rule,#e8e4de)] px-3 py-2 text-sm outline-none focus:border-[#5d2cd6]"
              />
            </Field>
            <Field label="Ends">
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full rounded-md border border-[var(--rule,#e8e4de)] px-3 py-2 text-sm outline-none focus:border-[#5d2cd6]"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as CalendarViewEvent["event_type"])}
                className="w-full rounded-md border border-[var(--rule,#e8e4de)] bg-white px-3 py-2 text-sm outline-none focus:border-[#5d2cd6]"
              >
                <option value="meeting">Meeting</option>
                <option value="call">Call</option>
                <option value="deadline">Deadline</option>
                <option value="reminder">Reminder</option>
                <option value="internal">Internal</option>
              </select>
            </Field>
            <Field label="Related deal">
              <select
                value={dealId}
                onChange={(e) => setDealId(e.target.value)}
                className="w-full rounded-md border border-[var(--rule,#e8e4de)] bg-white px-3 py-2 text-sm outline-none focus:border-[#5d2cd6]"
              >
                <option value="">None</option>
                {deals.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    {deal.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Location">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Zoom / Office / —"
              className="w-full rounded-md border border-[var(--rule,#e8e4de)] px-3 py-2 text-sm outline-none focus:border-[#5d2cd6]"
            />
          </Field>
          <Field label="Attendees (comma or newline separated emails)">
            <textarea
              value={attendeesText}
              onChange={(e) => setAttendeesText(e.target.value)}
              rows={2}
              placeholder="name@company.com"
              className="w-full rounded-md border border-[var(--rule,#e8e4de)] px-3 py-2 text-sm outline-none focus:border-[#5d2cd6]"
            />
          </Field>
          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-[var(--rule,#e8e4de)] px-3 py-2 text-sm outline-none focus:border-[#5d2cd6]"
            />
          </Field>
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
        </div>
        <footer className="flex items-center justify-end gap-2 border-t border-[var(--rule,#e8e4de)] bg-[#fbfaf7] px-6 py-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" disabled={submitting} className="bg-[#5d2cd6] hover:bg-[#4920b3]">
            {submitting ? "Sending invites…" : "Create event"}
          </Button>
        </footer>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">{label}</div>
      {children}
    </label>
  );
}
