"use client";

import React, { useMemo, useState, useTransition } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ListTargetType = "contacts" | "leads" | "deals" | "organizations";
export type ListVisibility = "private" | "team" | "workspace";
export type ListFilterOp =
  | "eq" | "neq" | "gt" | "gte" | "lt" | "lte"
  | "contains" | "starts_with"
  | "in" | "between"
  | "is_null" | "is_not_null";

export interface ListFilter {
  field: string;
  op: ListFilterOp;
  value: unknown;
}

export interface ListSummary {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  target_type: ListTargetType;
  filters: ListFilter[];
  sort: Array<{ field: string; direction: "asc" | "desc" }> | null;
  visibility: ListVisibility;
  pinned: boolean;
  created_by: string;
  created_at: string;
  updated_at: string | null;
}

interface QueryResult {
  rows: Array<Record<string, unknown>>;
  matched_count: number;
}

interface Props {
  initialLists: ListSummary[];
}

// ─── Field metadata — must mirror the handler whitelist ──────────────────────

const TARGET_FIELDS: Record<Exclude<ListTargetType, "organizations">, Array<{ field: string; label: string }>> = {
  contacts: [
    { field: "first_name", label: "First name" },
    { field: "last_name", label: "Last name" },
    { field: "email", label: "Email" },
    { field: "phone", label: "Phone" },
    { field: "company", label: "Company" },
    { field: "title", label: "Title" },
    { field: "status", label: "Status" },
    { field: "created_at", label: "Created at" },
  ],
  leads: [
    { field: "full_name", label: "Full name" },
    { field: "email", label: "Email" },
    { field: "company", label: "Company" },
    { field: "job_title", label: "Job title" },
    { field: "source", label: "Source" },
    { field: "status", label: "Status" },
    { field: "score", label: "Score" },
    { field: "next_action", label: "Next action" },
    { field: "created_at", label: "Created at" },
  ],
  deals: [
    { field: "name", label: "Name" },
    { field: "company", label: "Company" },
    { field: "value_cents", label: "Value (cents)" },
    { field: "stage", label: "Stage" },
    { field: "probability", label: "Probability" },
    { field: "expected_close_at", label: "Expected close" },
    { field: "created_at", label: "Created at" },
  ],
};

const FILTER_OPS: Array<{ value: ListFilterOp; label: string; noValue?: boolean }> = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "contains", label: "contains" },
  { value: "starts_with", label: "starts with" },
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
  { value: "is_null", label: "is empty", noValue: true },
  { value: "is_not_null", label: "is not empty", noValue: true },
];

const TARGET_TYPES: ListTargetType[] = ["contacts", "leads", "deals"];

const COLORS = {
  background: "#f9f7f4",
  surface: "#ffffff",
  border: "#e8e4de",
  borderSoft: "#f1ede8",
  text: "#0d0c0a",
  textMuted: "#6b6760",
  accent: "#5d2cd6",
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function ListsClient({ initialLists }: Props) {
  const [lists, setLists] = useState<ListSummary[]>(initialLists);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [results, setResults] = useState<QueryResult | null>(null);
  const [queryingId, setQueryingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => groupByTarget(lists), [lists]);
  const selected = lists.find((l) => l.id === selectedId) || null;

  async function runQuery(list: ListSummary) {
    setError(null);
    setSelectedId(list.id);
    setQueryingId(list.id);
    setResults(null);
    try {
      const response = await fetch(`/api/lists/${list.id}/query`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        rows?: Array<Record<string, unknown>>;
        matched_count?: number;
        error?: string;
      };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || `Query failed (HTTP ${response.status})`);
      }
      setResults({ rows: data.rows || [], matched_count: data.matched_count ?? 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Query failed.");
    } finally {
      setQueryingId(null);
    }
  }

  async function deleteList(list: ListSummary) {
    if (!confirm(`Delete list "${list.name}"? Rows are not affected.`)) return;
    setError(null);
    try {
      const response = await fetch(`/api/lists/${list.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || `Delete failed (HTTP ${response.status})`);
      setLists((current) => current.filter((l) => l.id !== list.id));
      if (selectedId === list.id) {
        setSelectedId(null);
        setResults(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  }

  function handleCreated(created: ListSummary) {
    setLists((current) => [created, ...current]);
    setSelectedId(created.id);
    setResults(null);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 24, alignItems: "start" }}>
      {/* Sidebar — saved lists grouped by target_type. */}
      <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <NewListForm onCreated={handleCreated} onError={setError} />
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {TARGET_TYPES.map((target) => (
            <GroupSection
              key={target}
              target={target}
              lists={grouped[target] || []}
              selectedId={selectedId}
              queryingId={queryingId}
              onSelect={runQuery}
              onDelete={deleteList}
            />
          ))}
          {lists.length === 0 && (
            <div style={emptyHintStyle}>
              No saved lists yet. Create one with the form above.
            </div>
          )}
        </div>
      </aside>

      {/* Results panel */}
      <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {error && <Banner tone="error">{error}</Banner>}
        {!selected && !error && (
          <div style={{ ...panelStyle, padding: 32, color: COLORS.textMuted, fontSize: 14 }}>
            Select a list on the left, or build a new one above.
            <div style={{ marginTop: 10, fontSize: 12 }}>
              Every list resolves against live data — there is no cache to refresh.
            </div>
          </div>
        )}
        {selected && (
          <ResultsPanel
            list={selected}
            results={results}
            loading={queryingId === selected.id}
            onRefresh={() => runQuery(selected)}
          />
        )}
      </section>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function GroupSection({
  target,
  lists,
  selectedId,
  queryingId,
  onSelect,
  onDelete,
}: {
  target: ListTargetType;
  lists: ListSummary[];
  selectedId: string | null;
  queryingId: string | null;
  onSelect: (list: ListSummary) => void;
  onDelete: (list: ListSummary) => void;
}) {
  if (lists.length === 0) return null;
  return (
    <div>
      <div style={groupLabelStyle}>{labelForTarget(target)}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        {lists.map((list) => {
          const isActive = list.id === selectedId;
          const isLoading = list.id === queryingId;
          return (
            <div
              key={list.id}
              style={{
                ...panelStyle,
                padding: 14,
                borderColor: isActive ? COLORS.accent : COLORS.border,
                boxShadow: isActive ? "0 4px 18px rgba(93,44,214,0.10)" : "none",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{list.name}</div>
              {list.description && (
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
                  {list.description}
                </div>
              )}
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 6, letterSpacing: "0.04em" }}>
                {list.filters.length} filter{list.filters.length === 1 ? "" : "s"} ·{" "}
                {list.visibility}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => onSelect(list)}
                  disabled={isLoading}
                  style={primaryButtonStyle(isLoading)}
                >
                  {isLoading ? "Loading..." : "View results"}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(list)}
                  style={secondaryButtonStyle}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResultsPanel({
  list,
  results,
  loading,
  onRefresh,
}: {
  list: ListSummary;
  results: QueryResult | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const fields = list.target_type === "organizations" ? [] : TARGET_FIELDS[list.target_type as Exclude<ListTargetType, "organizations">];
  const columns = useMemo(() => deriveColumns(results, fields), [results, fields]);

  return (
    <div style={panelStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 16px",
          borderBottom: `1px solid ${COLORS.border}`,
          background: COLORS.background,
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{list.name}</div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
            {list.target_type} · {list.filters.length} filter{list.filters.length === 1 ? "" : "s"}
            {results && ` · ${results.matched_count} match${results.matched_count === 1 ? "" : "es"}`}
          </div>
        </div>
        <button type="button" onClick={onRefresh} disabled={loading} style={primaryButtonStyle(loading)}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {list.filters.length > 0 && (
        <div style={{ padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, borderBottom: `1px solid ${COLORS.borderSoft}` }}>
          <FilterSummary filters={list.filters} fields={fields} />
        </div>
      )}

      {!results && !loading && (
        <div style={{ padding: 24, fontSize: 13, color: COLORS.textMuted }}>
          Click Refresh to fetch live results.
        </div>
      )}
      {loading && !results && (
        <div style={{ padding: 24, fontSize: 13, color: COLORS.textMuted }}>Loading...</div>
      )}
      {results && results.rows.length === 0 && (
        <div style={{ padding: 24, fontSize: 13, color: COLORS.textMuted }}>No matches.</div>
      )}
      {results && results.rows.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: COLORS.background }}>
                {columns.map((col) => (
                  <th
                    key={col}
                    style={{
                      textAlign: "left",
                      padding: "10px 14px",
                      borderBottom: `1px solid ${COLORS.border}`,
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: COLORS.textMuted,
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.rows.map((row, idx) => (
                <tr key={String(row.id || idx)}>
                  {columns.map((col) => (
                    <td
                      key={col}
                      style={{
                        padding: "10px 14px",
                        borderBottom: `1px solid ${COLORS.borderSoft}`,
                        color: COLORS.text,
                        verticalAlign: "top",
                      }}
                    >
                      {renderCell(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NewListForm({
  onCreated,
  onError,
}: {
  onCreated: (list: ListSummary) => void;
  onError: (msg: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState<ListTargetType>("contacts");
  const [filterField, setFilterField] = useState<string>("email");
  const [filterOp, setFilterOp] = useState<ListFilterOp>("contains");
  const [filterValue, setFilterValue] = useState<string>("");
  const [visibility, setVisibility] = useState<ListVisibility>("private");
  const [pending, startTransition] = useTransition();

  const fields = target === "organizations" ? [] : TARGET_FIELDS[target as Exclude<ListTargetType, "organizations">];
  const opMeta = FILTER_OPS.find((o) => o.value === filterOp);
  const valueDisabled = opMeta?.noValue;

  // Reset field when target changes so we don't carry an invalid field across types.
  function onTargetChange(next: ListTargetType) {
    setTarget(next);
    const nextFields = next === "organizations" ? [] : TARGET_FIELDS[next as Exclude<ListTargetType, "organizations">];
    setFilterField(nextFields[0]?.field || "");
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    if (target === "organizations") {
      onError("organizations target is not supported in v1. Pick contacts, leads, or deals.");
      return;
    }
    onError(null);
    const filters: ListFilter[] = filterField && filterOp
      ? [{
          field: filterField,
          op: filterOp,
          value: valueDisabled ? null : coerceValue(filterValue, filterOp),
        }]
      : [];

    startTransition(async () => {
      try {
        const response = await fetch("/api/lists", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            target_type: target,
            filters,
            visibility,
          }),
        });
        const data = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          list?: ListSummary;
          error?: string;
        };
        if (!response.ok || !data.ok || !data.list) {
          throw new Error(data.error || `Create failed (HTTP ${response.status})`);
        }
        onCreated(data.list);
        setName("");
        setDescription("");
        setFilterValue("");
      } catch (e) {
        onError(e instanceof Error ? e.message : "Create failed.");
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      style={{ ...panelStyle, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}
    >
      <div style={groupLabelStyle}>New list</div>
      <input
        type="text"
        required
        placeholder="List name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={pending}
        maxLength={80}
        style={inputStyle}
      />
      <input
        type="text"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={pending}
        maxLength={280}
        style={inputStyle}
      />
      <select
        value={target}
        onChange={(e) => onTargetChange(e.target.value as ListTargetType)}
        disabled={pending}
        style={inputStyle}
      >
        <option value="contacts">Contacts</option>
        <option value="leads">Leads</option>
        <option value="deals">Deals</option>
      </select>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <select
          value={filterField}
          onChange={(e) => setFilterField(e.target.value)}
          disabled={pending}
          style={inputStyle}
        >
          {fields.map((f) => (
            <option key={f.field} value={f.field}>{f.label}</option>
          ))}
        </select>
        <select
          value={filterOp}
          onChange={(e) => setFilterOp(e.target.value as ListFilterOp)}
          disabled={pending}
          style={inputStyle}
        >
          {FILTER_OPS.map((op) => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>
      </div>
      <input
        type="text"
        placeholder={valueDisabled ? "(no value needed)" : "Filter value"}
        value={filterValue}
        onChange={(e) => setFilterValue(e.target.value)}
        disabled={pending || valueDisabled}
        style={{ ...inputStyle, opacity: valueDisabled ? 0.5 : 1 }}
      />

      <select
        value={visibility}
        onChange={(e) => setVisibility(e.target.value as ListVisibility)}
        disabled={pending}
        style={inputStyle}
      >
        <option value="private">Private</option>
        <option value="team">Team</option>
        <option value="workspace">Workspace</option>
      </select>

      <button type="submit" disabled={pending || !name.trim()} style={primaryButtonStyle(pending || !name.trim())}>
        {pending ? "Saving..." : "Save list"}
      </button>
    </form>
  );
}

function FilterSummary({
  filters,
  fields,
}: {
  filters: ListFilter[];
  fields: Array<{ field: string; label: string }>;
}) {
  const labelFor = (f: string) => fields.find((x) => x.field === f)?.label || f;
  return (
    <span>
      {filters
        .map((f) => `${labelFor(f.field)} ${humanOp(f.op)}${f.value !== null && f.value !== undefined ? ` ${formatValue(f.value)}` : ""}`)
        .join("  ·  ")}
    </span>
  );
}

function Banner({ tone, children }: { tone: "error" | "info"; children: React.ReactNode }) {
  const palette =
    tone === "error"
      ? { bg: "#fef2f2", border: "#fecaca", text: "#991b1b" }
      : { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" };
  return (
    <div
      style={{
        padding: "10px 14px",
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.text,
        borderRadius: 8,
        fontSize: 13,
      }}
    >
      {children}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function labelForTarget(target: ListTargetType): string {
  switch (target) {
    case "contacts":      return "Contacts";
    case "leads":         return "Leads";
    case "deals":         return "Deals";
    case "organizations": return "Organizations";
  }
}

function groupByTarget(lists: ListSummary[]): Partial<Record<ListTargetType, ListSummary[]>> {
  const out: Partial<Record<ListTargetType, ListSummary[]>> = {};
  for (const list of lists) {
    const bucket = out[list.target_type] || [];
    bucket.push(list);
    out[list.target_type] = bucket;
  }
  return out;
}

function deriveColumns(
  results: QueryResult | null,
  fields: Array<{ field: string; label: string }>,
): string[] {
  if (!results || results.rows.length === 0) return [];
  const fieldOrder = fields.map((f) => f.field);
  const present = Object.keys(results.rows[0]);
  const ordered = fieldOrder.filter((f) => present.includes(f));
  const extras = present.filter((p) => !ordered.includes(p) && p !== "organization_id");
  return ["id", ...ordered.filter((f) => f !== "id"), ...extras.filter((p) => p !== "id")];
}

function renderCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function humanOp(op: ListFilterOp): string {
  switch (op) {
    case "eq":          return "=";
    case "neq":         return "≠";
    case "gt":          return ">";
    case "gte":         return "≥";
    case "lt":          return "<";
    case "lte":         return "≤";
    case "contains":    return "contains";
    case "starts_with": return "starts with";
    case "in":          return "in";
    case "between":     return "between";
    case "is_null":     return "is empty";
    case "is_not_null": return "is not empty";
  }
}

function formatValue(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map((x) => String(x)).join(", ")}]`;
  return String(v);
}

function coerceValue(raw: string, op: ListFilterOp): unknown {
  if (op === "in") {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (op === "between") {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  const asNumber = Number(raw);
  if (raw.trim() !== "" && Number.isFinite(asNumber) && String(asNumber) === raw.trim()) {
    return asNumber;
  }
  return raw;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  background: COLORS.surface,
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 6,
  fontSize: 14,
  background: COLORS.surface,
  color: COLORS.text,
  fontFamily: "inherit",
};

const groupLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: COLORS.textMuted,
};

const emptyHintStyle: React.CSSProperties = {
  ...panelStyle,
  padding: 16,
  fontSize: 13,
  color: COLORS.textMuted,
};

function primaryButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "8px 14px",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    background: disabled ? "#a8a39c" : COLORS.accent,
    color: "#ffffff",
    border: "none",
    borderRadius: 999,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

const secondaryButtonStyle: React.CSSProperties = {
  padding: "8px 14px",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  background: "transparent",
  color: COLORS.textMuted,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 999,
  cursor: "pointer",
};
