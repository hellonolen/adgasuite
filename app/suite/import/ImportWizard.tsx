"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

type SourceType = "csv" | "paste";
type TargetType = "contacts" | "leads" | "deals" | "organizations";
type DedupeStrategy = "email" | "name_plus_company" | "domain" | "name" | "phone" | "none";

interface PreviewResponse {
  ok: boolean;
  preview?: {
    headers: string[];
    rows: Array<Record<string, string>>;
    total_rows: number;
    missing_required: string[];
  };
  error?: string;
}

interface RunResponse {
  ok: boolean;
  batch?: {
    batch_id: string;
    rows_total: number;
    rows_succeeded: number;
    rows_failed: number;
    failure_summary: Record<string, number>;
    duration_ms: number;
    status: string;
  };
  error?: string;
}

interface BatchListItem {
  id: string;
  source_type: string;
  target_type: string;
  status: string;
  rows_total: number;
  rows_succeeded: number;
  rows_failed: number;
  started_at: string;
  completed_at: string | null;
}

interface BatchListResponse {
  ok: boolean;
  batches: BatchListItem[];
  error?: string;
}

const TARGET_FIELD_OPTIONS: Record<TargetType, Array<{ value: string; label: string }>> = {
  contacts: [
    { value: "", label: "— Skip column —" },
    { value: "first_name", label: "First name" },
    { value: "last_name", label: "Last name" },
    { value: "full_name", label: "Full name" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone" },
    { value: "company", label: "Company" },
    { value: "title", label: "Title" },
  ],
  leads: [
    { value: "", label: "— Skip column —" },
    { value: "full_name", label: "Full name" },
    { value: "email", label: "Email" },
    { value: "company", label: "Company" },
    { value: "job_title", label: "Job title" },
    { value: "phone", label: "Phone" },
    { value: "source", label: "Source" },
  ],
  deals: [
    { value: "", label: "— Skip column —" },
    { value: "name", label: "Deal name" },
    { value: "company", label: "Company" },
    { value: "value", label: "Value (USD)" },
    { value: "stage", label: "Stage" },
    { value: "probability", label: "Probability (%)" },
    { value: "expected_close_at", label: "Expected close" },
  ],
  organizations: [
    { value: "", label: "— Skip column —" },
    { value: "name", label: "Organization name" },
    { value: "domain", label: "Domain" },
    { value: "industry", label: "Industry" },
    { value: "location", label: "Location" },
    { value: "description", label: "Description" },
  ],
};

const DEDUPE_BY_TARGET: Record<TargetType, DedupeStrategy> = {
  contacts: "email",
  leads: "email",
  deals: "name_plus_company",
  organizations: "domain",
};

const COLOR_BG = "#f9f7f4";
const COLOR_SURFACE = "#ffffff";
const COLOR_BORDER = "#e8e4de";
const COLOR_BORDER_STRONG = "#ccc8c2";
const COLOR_TEXT = "#0d0c0a";
const COLOR_MUTED = "#6b6760";
const COLOR_ACCENT = "#5d2cd6";
const COLOR_DANGER = "#ef4444";
const COLOR_OK = "#16a34a";

interface Props {
  workspaceId: string;
}

export default function ImportWizard({ workspaceId: _workspaceId }: Props) {
  const [sourceType, setSourceType] = useState<SourceType>("paste");
  const [targetType, setTargetType] = useState<TargetType>("contacts");
  const [pasteText, setPasteText] = useState("");
  const [fileRows, setFileRows] = useState<string[][] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ready"; data: NonNullable<PreviewResponse["preview"]> }
    | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [runState, setRunState] = useState<
    | { kind: "idle" }
    | { kind: "running" }
    | { kind: "complete"; data: NonNullable<RunResponse["batch"]> }
    | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [batches, setBatches] = useState<BatchListItem[]>([]);
  const [batchesError, setBatchesError] = useState<string | null>(null);

  const payload = useMemo(() => {
    if (sourceType === "paste") {
      const rows = parsePastedTable(pasteText);
      return { paste: { rows, has_header: true } };
    }
    if (sourceType === "csv" && fileRows) {
      return { csv: { file_url: fileName || "client://csv", has_header: true, rows: fileRows } };
    }
    return null;
  }, [sourceType, pasteText, fileRows, fileName]);

  const loadBatches = useCallback(async () => {
    try {
      const response = await fetch("/api/import/batches?limit=10", { credentials: "include" });
      const data = (await response.json().catch(() => ({}))) as BatchListResponse;
      if (!response.ok || !data.ok) throw new Error(data.error || "Failed to load batches");
      setBatches(data.batches || []);
      setBatchesError(null);
    } catch (error) {
      setBatchesError(error instanceof Error ? error.message : "Failed to load batches");
    }
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  const runPreview = useCallback(async () => {
    if (!payload) {
      setPreviewState({ kind: "error", message: "Provide a CSV or paste rows first." });
      return;
    }
    setPreviewState({ kind: "loading" });
    try {
      const response = await fetch("/api/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          source_type: sourceType,
          target_type: targetType,
          payload,
          field_mapping: fieldMapping,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as PreviewResponse;
      if (!response.ok || !data.ok || !data.preview) {
        throw new Error(data.error || "Preview failed");
      }
      setPreviewState({ kind: "ready", data: data.preview });
      // Seed default mappings — if a column header matches a target field
      // verbatim, pre-fill it.
      const options = TARGET_FIELD_OPTIONS[targetType].map((opt) => opt.value);
      const seeded: Record<string, string> = { ...fieldMapping };
      for (const header of data.preview.headers) {
        if (seeded[header]) continue;
        const normalized = header.toLowerCase().replace(/\s+/g, "_");
        if (options.includes(normalized)) seeded[header] = normalized;
      }
      setFieldMapping(seeded);
    } catch (error) {
      setPreviewState({ kind: "error", message: error instanceof Error ? error.message : "Preview failed" });
    }
  }, [payload, sourceType, targetType, fieldMapping]);

  const runImport = useCallback(async () => {
    if (!payload) return;
    setRunState({ kind: "running" });
    try {
      const response = await fetch("/api/import/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          source_type: sourceType,
          target_type: targetType,
          payload,
          field_mapping: fieldMapping,
          dedupe_strategy: DEDUPE_BY_TARGET[targetType],
        }),
      });
      const data = (await response.json().catch(() => ({}))) as RunResponse;
      if (!response.ok || !data.ok || !data.batch) throw new Error(data.error || "Import failed");
      setRunState({ kind: "complete", data: data.batch });
      loadBatches();
    } catch (error) {
      setRunState({ kind: "error", message: error instanceof Error ? error.message : "Import failed" });
    }
  }, [payload, sourceType, targetType, fieldMapping, loadBatches]);

  const retryBatch = useCallback(
    async (batchId: string) => {
      try {
        const response = await fetch(`/api/import/batches/${batchId}/retry`, {
          method: "POST",
          credentials: "include",
        });
        const data = (await response.json().catch(() => ({}))) as RunResponse;
        if (!response.ok || !data.ok) throw new Error(data.error || "Retry failed");
        loadBatches();
      } catch (error) {
        setBatchesError(error instanceof Error ? error.message : "Retry failed");
      }
    },
    [loadBatches],
  );

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    const rows = parsePastedTable(text);
    setFileRows(rows);
    setPreviewState({ kind: "idle" });
  };

  const setMapping = (sourceCol: string, targetField: string) => {
    setFieldMapping((prev) => ({ ...prev, [sourceCol]: targetField }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, background: COLOR_BG }}>
      {/* Step 1 — Source + Target */}
      <Section title="Step 1 — Source & target">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <Label>Source</Label>
            <div style={{ display: "flex", gap: 8 }}>
              <RadioPill
                label="Paste"
                active={sourceType === "paste"}
                onClick={() => {
                  setSourceType("paste");
                  setFileRows(null);
                  setFileName(null);
                  setPreviewState({ kind: "idle" });
                }}
              />
              <RadioPill
                label="CSV file"
                active={sourceType === "csv"}
                onClick={() => {
                  setSourceType("csv");
                  setPasteText("");
                  setPreviewState({ kind: "idle" });
                }}
              />
            </div>
          </div>
          <div>
            <Label>Target record type</Label>
            <select
              value={targetType}
              onChange={(event) => {
                setTargetType(event.target.value as TargetType);
                setFieldMapping({});
                setPreviewState({ kind: "idle" });
              }}
              style={selectStyle}
            >
              <option value="contacts">Contacts</option>
              <option value="leads">Leads</option>
              <option value="deals">Deals</option>
              <option value="organizations">Organizations</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          {sourceType === "paste" ? (
            <>
              <Label>Paste CSV (first row = headers)</Label>
              <textarea
                value={pasteText}
                onChange={(event) => setPasteText(event.target.value)}
                placeholder={"name,email,company\nAva Tan,ava@acme.com,Acme\nBen Lee,ben@globex.io,Globex"}
                style={{
                  width: "100%",
                  minHeight: 140,
                  padding: 12,
                  border: `1px solid ${COLOR_BORDER}`,
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  background: COLOR_SURFACE,
                  color: COLOR_TEXT,
                }}
              />
            </>
          ) : (
            <>
              <Label>CSV file</Label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (file) await handleFile(file);
                }}
                style={{
                  width: "100%",
                  padding: 10,
                  border: `1px solid ${COLOR_BORDER}`,
                  borderRadius: 6,
                  fontSize: 13,
                  background: COLOR_SURFACE,
                  color: COLOR_TEXT,
                }}
              />
              {fileName && (
                <div style={{ marginTop: 8, fontSize: 12, color: COLOR_MUTED }}>
                  Loaded {fileName} — {fileRows?.length ?? 0} rows
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <PrimaryButton
            disabled={!payload || previewState.kind === "loading"}
            onClick={runPreview}
            label={previewState.kind === "loading" ? "Loading preview…" : "Preview rows"}
          />
        </div>
      </Section>

      {/* Step 2 — Map columns */}
      {previewState.kind === "error" && (
        <Section title="Preview failed">
          <Banner kind="error">{previewState.message}</Banner>
        </Section>
      )}

      {previewState.kind === "ready" && (
        <Section title="Step 2 — Map columns">
          <div style={{ fontSize: 13, color: COLOR_MUTED, marginBottom: 12 }}>
            {previewState.data.total_rows} total rows · showing first {previewState.data.rows.length}.
          </div>

          {previewState.data.missing_required.length > 0 && (
            <Banner kind="warn">
              Missing required field{previewState.data.missing_required.length > 1 ? "s" : ""}:{" "}
              <strong>{previewState.data.missing_required.join(", ")}</strong>. Map at least one column to each before running.
            </Banner>
          )}

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
                background: COLOR_SURFACE,
                border: `1px solid ${COLOR_BORDER}`,
              }}
            >
              <thead>
                <tr style={{ background: COLOR_BG }}>
                  {previewState.data.headers.map((header) => (
                    <th
                      key={header}
                      style={{
                        padding: "10px 12px",
                        textAlign: "left",
                        borderBottom: `1px solid ${COLOR_BORDER}`,
                        color: COLOR_TEXT,
                        fontWeight: 600,
                        fontSize: 11,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      <div>{header}</div>
                      <select
                        value={fieldMapping[header] || ""}
                        onChange={(event) => setMapping(header, event.target.value)}
                        style={{
                          ...selectStyle,
                          marginTop: 6,
                          padding: "6px 8px",
                          fontSize: 12,
                          textTransform: "none",
                          letterSpacing: 0,
                          fontWeight: 400,
                        }}
                      >
                        {TARGET_FIELD_OPTIONS[targetType].map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewState.data.rows.map((row, idx) => (
                  <tr key={idx}>
                    {previewState.data.headers.map((header) => (
                      <td
                        key={header}
                        style={{
                          padding: "10px 12px",
                          borderBottom: `1px solid ${COLOR_BORDER}`,
                          color: COLOR_TEXT,
                          maxWidth: 220,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row[header] || <span style={{ color: COLOR_MUTED }}>—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
            <PrimaryButton
              disabled={
                runState.kind === "running" ||
                previewState.data.missing_required.length > 0 ||
                Object.values(fieldMapping).filter(Boolean).length === 0
              }
              onClick={runImport}
              label={runState.kind === "running" ? "Importing…" : `Import ${previewState.data.total_rows} rows`}
            />
            <span style={{ fontSize: 12, color: COLOR_MUTED }}>
              Dedupe: <strong>{DEDUPE_BY_TARGET[targetType]}</strong>. Existing matches will be updated, not duplicated.
            </span>
          </div>
        </Section>
      )}

      {/* Step 3 — Result */}
      {runState.kind === "complete" && (
        <Section title="Step 3 — Result">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <Metric label="Total rows" value={String(runState.data.rows_total)} />
            <Metric
              label="Succeeded"
              value={String(runState.data.rows_succeeded)}
              accent={runState.data.rows_succeeded > 0 ? COLOR_OK : undefined}
            />
            <Metric
              label="Failed"
              value={String(runState.data.rows_failed)}
              accent={runState.data.rows_failed > 0 ? COLOR_DANGER : undefined}
            />
            <Metric label="Status" value={runState.data.status} sub={`${runState.data.duration_ms}ms`} />
          </div>
          {runState.data.rows_failed > 0 && (
            <div style={{ marginTop: 14 }}>
              <Banner kind="warn">
                {runState.data.rows_failed} row{runState.data.rows_failed > 1 ? "s" : ""} failed. Review and retry from the recent imports below.
              </Banner>
            </div>
          )}
        </Section>
      )}

      {runState.kind === "error" && (
        <Section title="Import failed">
          <Banner kind="error">{runState.message}</Banner>
        </Section>
      )}

      {/* Recent batches */}
      <Section title="Recent imports">
        {batchesError && <Banner kind="error">{batchesError}</Banner>}
        {batches.length === 0 ? (
          <div style={{ padding: "20px 0", fontSize: 13, color: COLOR_MUTED }}>No imports yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {batches.map((batch) => (
              <div
                key={batch.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto auto auto auto",
                  gap: 12,
                  alignItems: "center",
                  padding: "12px 14px",
                  background: COLOR_SURFACE,
                  border: `1px solid ${COLOR_BORDER}`,
                  borderRadius: 6,
                }}
              >
                <span style={statusBadge(batch.status)}>{batch.status}</span>
                <span style={{ fontSize: 13, color: COLOR_TEXT, fontFamily: "ui-monospace, monospace" }}>
                  {batch.id}
                </span>
                <span style={{ fontSize: 12, color: COLOR_MUTED }}>
                  {batch.source_type} → {batch.target_type}
                </span>
                <span style={{ fontSize: 12, color: COLOR_OK }}>{batch.rows_succeeded} ok</span>
                <span style={{ fontSize: 12, color: batch.rows_failed > 0 ? COLOR_DANGER : COLOR_MUTED }}>
                  {batch.rows_failed} failed
                </span>
                {batch.rows_failed > 0 ? (
                  <button onClick={() => retryBatch(batch.id)} style={secondaryButtonStyle}>
                    Retry failed
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: COLOR_MUTED, textAlign: "right" }}>
                    {new Date(batch.started_at).toLocaleString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ─── UI primitives (light-mode inline styles, mirror /suite/settings/seats) ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        border: `1px solid ${COLOR_BORDER}`,
        borderRadius: 8,
        background: COLOR_SURFACE,
        padding: 18,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: COLOR_MUTED,
          marginBottom: 14,
        }}
      >
        {title}
      </div>
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: COLOR_MUTED,
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        border: `1px solid ${COLOR_BORDER}`,
        borderRadius: 8,
        padding: 14,
        background: COLOR_BG,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: COLOR_MUTED,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          marginTop: 6,
          color: accent || COLOR_TEXT,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: COLOR_MUTED, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Banner({ kind, children }: { kind: "error" | "warn" | "ok"; children: React.ReactNode }) {
  const palette =
    kind === "error"
      ? { bg: "#fef2f2", border: "#fecaca", color: "#991b1b" }
      : kind === "warn"
        ? { bg: "#fffbeb", border: "#fde68a", color: "#92400e" }
        : { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534" };
  return (
    <div
      style={{
        padding: "10px 12px",
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 6,
        color: palette.color,
        fontSize: 13,
      }}
    >
      {children}
    </div>
  );
}

function RadioPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 999,
        border: `1px solid ${active ? COLOR_ACCENT : COLOR_BORDER_STRONG}`,
        background: active ? COLOR_ACCENT : COLOR_SURFACE,
        color: active ? "#ffffff" : COLOR_TEXT,
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function PrimaryButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 18px",
        background: disabled ? "#a8a39c" : COLOR_ACCENT,
        color: "#ffffff",
        border: "none",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "0.04em",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {label}
    </button>
  );
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: `1px solid ${COLOR_BORDER}`,
  borderRadius: 6,
  fontSize: 13,
  background: COLOR_SURFACE,
  color: COLOR_TEXT,
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "6px 12px",
  background: COLOR_SURFACE,
  color: COLOR_ACCENT,
  border: `1px solid ${COLOR_ACCENT}`,
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

function statusBadge(status: string): React.CSSProperties {
  const palette: Record<string, { bg: string; color: string }> = {
    completed: { bg: "#f0fdf4", color: "#166534" },
    completed_with_failures: { bg: "#fffbeb", color: "#92400e" },
    failed: { bg: "#fef2f2", color: "#991b1b" },
    running: { bg: "#eff6ff", color: "#1e40af" },
    queued: { bg: "#f1ede8", color: COLOR_MUTED },
    preview: { bg: "#f1ede8", color: COLOR_MUTED },
    cancelled: { bg: "#f1ede8", color: COLOR_MUTED },
  };
  const chosen = palette[status] || { bg: "#f1ede8", color: COLOR_MUTED };
  return {
    background: chosen.bg,
    color: chosen.color,
    padding: "3px 8px",
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsePastedTable(text: string): string[][] {
  // Minimal RFC4180-ish CSV: quoted cells, escaped quotes, embedded newlines.
  // Mirror of the parser in lib/agents/handlers/csv-import.ts so client + server
  // produce the same row shape. Kept here so paste payloads can be previewed
  // without round-tripping to the server.
  const rows: string[][] = [];
  let current: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      current.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      current.push(cell);
      cell = "";
      if (current.some((value) => value.length > 0)) rows.push(current);
      current = [];
      continue;
    }
    cell += char;
  }
  if (cell.length > 0 || current.length > 0) {
    current.push(cell);
    if (current.some((value) => value.length > 0)) rows.push(current);
  }
  return rows;
}
