"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface AuditFilterProps {
  eventTypes: string[];
  value: string | null;
}

export function AuditFilter({ eventTypes, value }: AuditFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateType(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!next) params.delete("type");
    else params.set("type", next);
    const query = params.toString();
    router.push(query ? `/suite/admin/audit?${query}` : "/suite/admin/audit");
  }

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="audit-type-filter"
        className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b6760]"
      >
        Event type
      </label>
      <select
        id="audit-type-filter"
        value={value ?? ""}
        onChange={(event) => updateType(event.target.value)}
        className="rounded-md border border-[var(--rule,#e8e4de)] bg-white px-3 py-1.5 text-sm text-[#0d0c0a] outline-none focus:border-[#5d2cd6] focus:ring-2 focus:ring-[#5d2cd6]/20"
      >
        <option value="">All events</option>
        {eventTypes.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
    </div>
  );
}
