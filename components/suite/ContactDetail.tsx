"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface ContactDetailData {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  business_email: string | null;
  business_phone: string | null;
  title: string | null;
  company: string | null;
  industry: string | null;
  city: string | null;
  state_region: string | null;
  country: string | null;
  timezone: string | null;
  status: string | null;
  source: string | null;
  role_authority: string | null;
  owner_user_id: string | null;
  linkedin_url: string | null;
  x_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  other_profile_url: string | null;
  need_summary: string | null;
  last_contacted_at: string | null;
  follow_up_due_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ContactEvent {
  id: string;
  event_type: string;
  actor_type: string;
  actor_id: string | null;
  payload_json: string | null;
  created_at: string;
}

const EDITABLE_FIELDS = [
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "title", label: "Title" },
  { key: "company", label: "Company" },
  { key: "email", label: "Email", type: "email" as const },
  { key: "phone", label: "Phone" },
  { key: "linkedin_url", label: "LinkedIn URL", type: "url" as const },
  { key: "city", label: "City" },
  { key: "state_region", label: "State / Region" },
  { key: "country", label: "Country" },
  { key: "industry", label: "Industry" },
  { key: "role_authority", label: "Role / Authority" },
  { key: "source", label: "Source" },
  { key: "status", label: "Status" },
];

function initials(contact: ContactDetailData) {
  const name = contact.full_name || `${contact.first_name || ""} ${contact.last_name || ""}`;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function eventLabel(type: string) {
  return type.replace(/[._]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ContactDetail({
  contact: initial,
  events,
}: {
  contact: ContactDetailData;
  events: ContactEvent[];
}) {
  const router = useRouter();
  const [contact, setContact] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>(() => buildDraft(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildDraft(source: ContactDetailData): Record<string, string> {
    const seed: Record<string, string> = {};
    for (const field of EDITABLE_FIELDS) {
      const value = source[field.key as keyof ContactDetailData];
      seed[field.key] = typeof value === "string" ? value : "";
    }
    return seed;
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(draft),
      });
      const json = (await response.json()) as { ok: boolean; contact?: ContactDetailData; error?: string };
      if (!response.ok || !json.ok || !json.contact) {
        throw new Error(json.error || "Failed to save");
      }
      setContact(json.contact);
      setDraft(buildDraft(json.contact));
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const socials = [
    { label: "LinkedIn", url: contact.linkedin_url },
    { label: "X", url: contact.x_url },
    { label: "Instagram", url: contact.instagram_url },
    { label: "Facebook", url: contact.facebook_url },
    { label: "Other", url: contact.other_profile_url },
  ].filter((item): item is { label: string; url: string } => Boolean(item.url));

  const location = [contact.city, contact.state_region, contact.country].filter(Boolean).join(", ");

  return (
    <div className="bg-[#f9f7f4]">
      <header className="border-b border-[#e8e4de] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/suite/contacts"
              className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#6b6760] hover:text-[#0d0c0a]"
            >
              ← Contacts
            </Link>
            <div className="h-4 w-px bg-[#e8e4de]" />
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#5d2cd6] to-[#7e4dff] text-sm font-semibold text-white"
                aria-hidden
              >
                {initials(contact)}
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6b6760]">
                  {contact.status || "Lead"}
                </div>
                <h1 className="text-lg font-semibold text-[#0d0c0a]">
                  {contact.full_name || `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Unnamed contact"}
                </h1>
                <div className="text-xs text-[#6b6760]">
                  {[contact.title, contact.company].filter(Boolean).join(" · ") || "Add a title and company"}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {socials.length > 0 && !editing && (
              <div className="hidden items-center gap-1.5 md:flex">
                {socials.map((social) => (
                  <a
                    key={social.label}
                    href={social.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-[#e8e4de] px-3 py-1 text-[11px] font-medium text-[#0d0c0a] hover:border-[#cbb8ff] hover:text-[#5d2cd6]"
                  >
                    {social.label}
                  </a>
                ))}
              </div>
            )}
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setDraft(buildDraft(contact));
                    setError(null);
                  }}
                  disabled={saving}
                  className="rounded-full border border-[#e8e4de] px-4 py-2 text-sm font-medium text-[#0d0c0a] hover:border-[#cbb8ff]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="rounded-full bg-[#5d2cd6] px-5 py-2 text-sm font-medium text-white hover:bg-[#4a22b3] disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-full border border-[#e8e4de] bg-white px-5 py-2 text-sm font-medium text-[#0d0c0a] hover:border-[#cbb8ff]"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>
        </div>
      )}

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-[#e8e4de] bg-white p-5 shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6b6760]">Contact info</div>
            {editing ? (
              <div className="mt-4 grid gap-3">
                {EDITABLE_FIELDS.map((field) => (
                  <label key={field.key} className="block">
                    <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#6b6760]">{field.label}</span>
                    <input
                      type={field.type || "text"}
                      value={draft[field.key] ?? ""}
                      onChange={(event) => setDraft((prev) => ({ ...prev, [field.key]: event.target.value }))}
                      className="mt-1 w-full rounded-md border border-[#e8e4de] bg-[#f9f7f4] px-2.5 py-1.5 text-sm text-[#0d0c0a] focus:border-[#5d2cd6] focus:outline-none focus:ring-2 focus:ring-[#5d2cd6]/15"
                    />
                  </label>
                ))}
              </div>
            ) : (
              <dl className="mt-4 space-y-3 text-sm">
                <InfoRow label="Email" value={contact.email} link={contact.email ? `mailto:${contact.email}` : null} />
                <InfoRow label="Phone" value={contact.phone} link={contact.phone ? `tel:${contact.phone}` : null} />
                <InfoRow label="Business email" value={contact.business_email} />
                <InfoRow label="Business phone" value={contact.business_phone} />
                <InfoRow label="Location" value={location || null} />
                <InfoRow label="Timezone" value={contact.timezone} />
                <InfoRow label="Industry" value={contact.industry} />
                <InfoRow label="Role / Authority" value={contact.role_authority} />
                <InfoRow label="Source" value={contact.source} />
                <InfoRow label="Owner" value={contact.owner_user_id} />
              </dl>
            )}
          </div>

          {!editing && contact.need_summary && (
            <div className="rounded-2xl border border-[#e8e4de] bg-white p-5 shadow-sm">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6b6760]">Notes</div>
              <p className="mt-2 text-sm text-[#0d0c0a]">{contact.need_summary}</p>
            </div>
          )}

          {!editing && socials.length > 0 && (
            <div className="rounded-2xl border border-[#e8e4de] bg-white p-5 shadow-sm md:hidden">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6b6760]">Social</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {socials.map((social) => (
                  <a
                    key={social.label}
                    href={social.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-[#e8e4de] px-3 py-1 text-[11px] font-medium text-[#0d0c0a] hover:border-[#cbb8ff]"
                  >
                    {social.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </aside>

        <div className="rounded-2xl border border-[#e8e4de] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#e8e4de] px-5 py-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6b6760]">Activity</div>
              <div className="text-sm font-medium text-[#0d0c0a]">Timeline</div>
            </div>
            <div className="text-xs text-[#6b6760]">
              Last touched {formatDateTime(contact.last_contacted_at || contact.updated_at)}
            </div>
          </div>
          {events.length === 0 ? (
            <div className="px-6 py-14 text-center text-sm text-[#6b6760]">
              No activity yet. Calls, meetings, and notes attached to this contact will appear here.
            </div>
          ) : (
            <ol className="divide-y divide-[#f1ede8]">
              {events.map((event) => (
                <li key={event.id} className="flex gap-3 px-5 py-3">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#5d2cd6]" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-[#0d0c0a]">{eventLabel(event.event_type)}</div>
                    <div className="text-xs text-[#6b6760]">
                      {event.actor_type}
                      {event.actor_id ? ` · ${event.actor_id}` : ""} · {formatDateTime(event.created_at)}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}

function InfoRow({ label, value, link }: { label: string; value: string | null; link?: string | null }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-baseline gap-3">
      <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#6b6760]">{label}</dt>
      <dd className="truncate text-sm text-[#0d0c0a]">
        {value ? (
          link ? (
            <a href={link} className="hover:text-[#5d2cd6]">
              {value}
            </a>
          ) : (
            value
          )
        ) : (
          <span className="text-[#9c978f]">—</span>
        )}
      </dd>
    </div>
  );
}
