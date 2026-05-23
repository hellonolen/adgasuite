"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface ContactRow {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  industry: string | null;
  city: string | null;
  state_region: string | null;
  status: string | null;
  owner_user_id: string | null;
  last_contacted_at: string | null;
  updated_at: string | null;
}

interface Facets {
  statuses: string[];
  owners: string[];
  cities: string[];
  sectors: string[];
}

interface ContactsListResponse {
  ok: boolean;
  contacts: ContactRow[];
  total: number;
  facets: Facets;
}

const PAGE_SIZE = 50;

function initials(contact: ContactRow) {
  const name = (contact.full_name || `${contact.first_name || ""} ${contact.last_name || ""}`).trim();
  if (!name) return "??";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatRelative(value: string | null) {
  if (!value) return "—";
  const ms = Date.now() - new Date(value).getTime();
  if (Number.isNaN(ms)) return "—";
  const day = 24 * 60 * 60 * 1000;
  if (ms < day) return "today";
  if (ms < 7 * day) return `${Math.floor(ms / day)}d ago`;
  if (ms < 30 * day) return `${Math.floor(ms / (7 * day))}w ago`;
  return new Date(value).toLocaleDateString();
}

function statusTone(status: string | null) {
  const value = (status || "").toLowerCase();
  if (value === "active" || value === "customer" || value === "won") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (value === "qualified" || value === "hot") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (value === "archived" || value === "lost") {
    return "border-zinc-200 bg-zinc-50 text-zinc-600";
  }
  return "border-[#e6dcff] bg-[#f3edff] text-[#5d2cd6]";
}

export default function ContactsList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [owner, setOwner] = useState("");
  const [city, setCity] = useState("");
  const [sector, setSector] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<ContactsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    if (owner) params.set("owner", owner);
    if (city) params.set("city", city);
    if (sector) params.set("sector", sector);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(offset));

    setLoading(true);
    fetch(`/api/contacts?${params.toString()}`, { signal: controller.signal, credentials: "same-origin" })
      .then(async (response) => {
        const json = (await response.json()) as ContactsListResponse;
        if (!aborted) {
          if (response.ok) {
            setData(json);
            setError(null);
          } else {
            setError("Failed to load contacts");
          }
        }
      })
      .catch((err) => {
        if (!aborted && err.name !== "AbortError") setError("Failed to load contacts");
      })
      .finally(() => {
        if (!aborted) setLoading(false);
      });

    return () => {
      aborted = true;
      controller.abort();
    };
  }, [search, status, owner, city, sector, offset]);

  useEffect(() => {
    setOffset(0);
  }, [search, status, owner, city, sector]);

  const contacts = data?.contacts ?? [];
  const total = data?.total ?? 0;
  const facets = data?.facets ?? { statuses: [], owners: [], cities: [], sectors: [] };
  const hasFilters = Boolean(search || status || owner || city || sector);

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + contacts.length, total);

  const filterChips = useMemo(
    () => [
      { key: "status", label: "Status", value: status, options: facets.statuses, setter: setStatus },
      { key: "owner", label: "Owner", value: owner, options: facets.owners, setter: setOwner },
      { key: "city", label: "City", value: city, options: facets.cities, setter: setCity },
      { key: "sector", label: "Sector", value: sector, options: facets.sectors, setter: setSector },
    ],
    [status, owner, city, sector, facets],
  );

  return (
    <main className="min-h-screen bg-[#f9f7f4]">
      <header className="border-b border-[#e8e4de] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/suite"
              className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#6b6760] hover:text-[#0d0c0a]"
            >
              ← Suite
            </Link>
            <div className="h-4 w-px bg-[#e8e4de]" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6b6760]">Workspace</div>
              <h1 className="text-lg font-semibold text-[#0d0c0a]">Contacts</h1>
            </div>
          </div>
          <Link
            href="/suite/contacts/new"
            className="inline-flex items-center justify-center rounded-full bg-[#5d2cd6] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#4a22b3]"
          >
            + New contact
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-6">
        <div className="rounded-2xl border border-[#e8e4de] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#e8e4de] p-4 md:flex-row md:items-center">
            <input
              type="search"
              placeholder="Search name, email, or company…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-lg border border-[#e8e4de] bg-[#f9f7f4] px-3.5 py-2.5 text-sm text-[#0d0c0a] placeholder:text-[#9c978f] focus:border-[#5d2cd6] focus:outline-none focus:ring-2 focus:ring-[#5d2cd6]/15 md:max-w-md"
              aria-label="Search contacts"
            />
            <div className="flex flex-wrap items-center gap-2">
              {filterChips.map((filter) => (
                <select
                  key={filter.key}
                  value={filter.value}
                  onChange={(event) => filter.setter(event.target.value)}
                  className="rounded-lg border border-[#e8e4de] bg-white px-3 py-2 text-xs font-medium text-[#0d0c0a] focus:border-[#5d2cd6] focus:outline-none focus:ring-2 focus:ring-[#5d2cd6]/15"
                  aria-label={`Filter by ${filter.label.toLowerCase()}`}
                >
                  <option value="">{`All ${filter.label.toLowerCase()}`}</option>
                  {filter.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ))}
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatus("");
                    setOwner("");
                    setCity("");
                    setSector("");
                  }}
                  className="rounded-lg border border-transparent px-2.5 py-2 text-xs font-medium text-[#6b6760] hover:text-[#0d0c0a]"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-[#6b6760]">
            <span>
              {loading ? "Loading contacts…" : `Showing ${pageStart}–${pageEnd} of ${total}`}
            </span>
            <span>{contacts.length} on this page</span>
          </div>

          {error ? (
            <div className="border-t border-[#e8e4de] px-6 py-12 text-center text-sm text-rose-600">{error}</div>
          ) : !loading && contacts.length === 0 ? (
            <EmptyState hasFilters={hasFilters} />
          ) : (
            <div className="grid gap-3 border-t border-[#e8e4de] bg-[#f9f7f4] p-4 sm:grid-cols-2 lg:grid-cols-3">
              {contacts.map((contact) => (
                <ContactCard key={contact.id} contact={contact} />
              ))}
            </div>
          )}

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-[#e8e4de] px-4 py-3 text-xs text-[#6b6760]">
              <button
                type="button"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                className="rounded-md border border-[#e8e4de] px-3 py-1.5 font-medium text-[#0d0c0a] disabled:opacity-40"
              >
                ← Previous
              </button>
              <span>
                Page {Math.floor(offset / PAGE_SIZE) + 1} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}
              </span>
              <button
                type="button"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                className="rounded-md border border-[#e8e4de] px-3 py-1.5 font-medium text-[#0d0c0a] disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function ContactCard({ contact }: { contact: ContactRow }) {
  const name = contact.full_name || `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Unnamed";
  const location = [contact.city, contact.state_region].filter(Boolean).join(", ");
  return (
    <Link
      href={`/suite/contacts/${contact.id}`}
      className="group flex flex-col gap-3 rounded-xl border border-[#e8e4de] bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-[#cbb8ff] hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#5d2cd6] to-[#7e4dff] text-sm font-semibold text-white"
          aria-hidden
        >
          {initials(contact)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-[#0d0c0a]">{name}</div>
          <div className="truncate text-xs text-[#6b6760]">
            {[contact.title, contact.company].filter(Boolean).join(" · ") || "No title"}
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] ${statusTone(contact.status)}`}
        >
          {contact.status || "lead"}
        </span>
      </div>
      <div className="flex items-center justify-between text-[11px] text-[#6b6760]">
        <span className="truncate">{contact.email || contact.phone || location || "No contact info"}</span>
        <span className="shrink-0 pl-2">{formatRelative(contact.last_contacted_at || contact.updated_at)}</span>
      </div>
    </Link>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  if (hasFilters) {
    return (
      <div className="border-t border-[#e8e4de] px-6 py-16 text-center">
        <div className="text-sm font-medium text-[#0d0c0a]">No contacts match those filters.</div>
        <div className="mt-1 text-xs text-[#6b6760]">Try clearing filters or broadening your search.</div>
      </div>
    );
  }
  return (
    <div className="border-t border-[#e8e4de] px-6 py-20 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f3edff] text-xl text-[#5d2cd6]">
        +
      </div>
      <div className="mt-4 text-base font-semibold text-[#0d0c0a]">Add your first contact</div>
      <p className="mx-auto mt-1 max-w-sm text-sm text-[#6b6760]">
        Contacts are the people behind every deal — buyers, partners, advisors. Add one to start the rolodex.
      </p>
      <Link
        href="/suite/contacts/new"
        className="mt-5 inline-flex items-center justify-center rounded-full bg-[#5d2cd6] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#4a22b3]"
      >
        + New contact
      </Link>
    </div>
  );
}
