// POST /api/import/preview — parse a CSV/paste payload and return headers +
// first 10 rows + suggested field mapping. No DB writes. No event publishes.
// Used by the /suite/import wizard before the user commits to a real run.

import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext, hydrateUserFromSession, requireUser } from "@/lib/server/runtime";

interface PreviewBody {
  source_type?: "csv" | "paste";
  target_type?: "contacts" | "leads" | "deals" | "organizations";
  payload?: {
    csv?: { content: string; has_header: boolean };
    paste?: { rows: string[][]; has_header: boolean };
  };
}

const MAX_PREVIEW_BYTES = 5 * 1024 * 1024;
const MAX_PREVIEW_ROWS = 10;
// SECURITY: cap paste payload row count so preview can't allocate unbounded
// memory parsing a 1M-row array.
const MAX_PASTE_ROWS_PREVIEW = 50_000;

const SUGGESTED_MAPPINGS: Record<string, Record<string, string>> = {
  contacts: {
    "first name": "first_name",
    first_name: "first_name",
    "last name": "last_name",
    last_name: "last_name",
    name: "first_name",
    "full name": "full_name",
    full_name: "full_name",
    email: "email",
    "email address": "email",
    phone: "phone",
    "phone number": "phone",
    company: "company",
    organization: "company",
    title: "title",
    "job title": "title",
    role: "title",
  },
  leads: {
    name: "full_name",
    "full name": "full_name",
    full_name: "full_name",
    email: "email",
    company: "company",
    "job title": "job_title",
    title: "job_title",
    source: "source",
    score: "score",
    status: "status",
    notes: "notes",
    "next action": "next_action",
  },
  deals: {
    name: "name",
    "deal name": "name",
    title: "name",
    company: "company",
    account: "company",
    value: "value_cents",
    amount: "value_cents",
    "deal value": "value_cents",
    stage: "stage",
    probability: "probability",
    "close date": "expected_close_at",
    "expected close": "expected_close_at",
  },
  organizations: {
    name: "name",
    "company name": "name",
    company: "name",
    domain: "domain",
    website: "domain",
    email: "email",
    phone: "phone",
  },
};

function normalizeHeader(s: string): string {
  return String(s || "").replace(/^﻿/, "").trim().toLowerCase().replace(/\s+/g, " ");
}

function suggestMapping(headers: string[], targetType: string): Record<string, string> {
  const table = SUGGESTED_MAPPINGS[targetType] || {};
  const mapping: Record<string, string> = {};
  for (const h of headers) {
    const norm = normalizeHeader(h);
    const target = table[norm] || table[norm.replace(/\s+/g, "_")];
    if (target) mapping[h] = target;
  }
  return mapping;
}

function parseCsv(content: string, hasHeader: boolean): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (inQuotes) {
      if (c === '"') {
        if (content[i + 1] === '"') { cell += '"'; i++; }
        else { inQuotes = false; }
      } else cell += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else if (c === "\r") { /* skip */ }
      else cell += c;
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  void hasHeader;
  return rows;
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  await hydrateUserFromSession(context, request);
  try {
    requireUser(context);
  } catch (response) {
    if (response instanceof Response) return response;
    return errorJson("Unauthorized", 401);
  }

  const body = await readJson<PreviewBody>(request);
  const sourceType = body.source_type;
  const targetType = body.target_type;
  if (sourceType !== "csv" && sourceType !== "paste") {
    return errorJson("source_type must be 'csv' or 'paste' for preview.");
  }
  if (!targetType || !["contacts", "leads", "deals", "organizations"].includes(targetType)) {
    return errorJson("target_type must be one of: contacts, leads, deals, organizations.");
  }

  let headers: string[] = [];
  let preview: Array<Record<string, string>> = [];
  let rowsTotal = 0;

  if (sourceType === "csv") {
    const csv = body.payload?.csv;
    if (!csv?.content) return errorJson("payload.csv.content required.");
    if (csv.content.length > MAX_PREVIEW_BYTES) {
      return errorJson(`Payload exceeds preview size cap (${Math.round(MAX_PREVIEW_BYTES / 1024)} KB).`, 413);
    }
    const parsed = parseCsv(csv.content, csv.has_header !== false);
    if (parsed.length === 0) return errorJson("CSV is empty.");
    headers = (csv.has_header === false
      ? parsed[0].map((_, i) => `col_${i + 1}`)
      : parsed[0].map(normalizeHeader));
    const dataRows = csv.has_header === false ? parsed : parsed.slice(1);
    rowsTotal = dataRows.length;
    preview = dataRows.slice(0, MAX_PREVIEW_ROWS).map((row) => {
      const o: Record<string, string> = {};
      headers.forEach((h, i) => { o[h] = row[i] ?? ""; });
      return o;
    });
  } else {
    const paste = body.payload?.paste;
    if (!paste?.rows?.length) return errorJson("payload.paste.rows required.");
    if (paste.rows.length > MAX_PASTE_ROWS_PREVIEW) {
      return errorJson(`Payload exceeds preview row cap (${MAX_PASTE_ROWS_PREVIEW.toLocaleString()} rows). Split into smaller batches.`, 413);
    }
    const hasHeader = paste.has_header !== false;
    headers = hasHeader ? paste.rows[0].map(normalizeHeader) : paste.rows[0].map((_, i) => `col_${i + 1}`);
    const dataRows = hasHeader ? paste.rows.slice(1) : paste.rows;
    rowsTotal = dataRows.length;
    preview = dataRows.slice(0, MAX_PREVIEW_ROWS).map((row) => {
      const o: Record<string, string> = {};
      headers.forEach((h, i) => { o[h] = row[i] ?? ""; });
      return o;
    });
  }

  return json({
    ok: true,
    source_type: sourceType,
    target_type: targetType,
    headers,
    rows_total: rowsTotal,
    preview,
    suggested_mapping: suggestMapping(headers, targetType),
  });
}
