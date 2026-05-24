import { DEFAULT_ORG_ID } from "@/lib/server/tenant";
import { getRecordGraph, type RecordGraphEdge } from "@/lib/server/record-graph";

export type WorkspaceSearchResult = {
  type: string;
  id: string;
  title: string;
  subtitle?: string | null;
  snippet?: string | null;
  url?: string | null;
  score: number;
  updated_at?: string | null;
  metadata?: Record<string, unknown>;
};

export type WorkspaceSearchResponse = {
  query: string;
  organization_id: string;
  results: WorkspaceSearchResult[];
  graph: RecordGraphEdge[];
};

type SearchRow = {
  type: string;
  id: string;
  title: string;
  subtitle?: string | null;
  snippet?: string | null;
  url?: string | null;
  score?: number | null;
  updated_at?: string | null;
  payload_r2_key?: string | null;
  storage_object_id?: string | null;
};

type StorageRow = {
  id: string;
  bucket: "documents" | "uploads" | "assets";
  r2_key: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  category: string;
  resource_type: string | null;
  resource_id: string | null;
  created_at: string;
};

const MAX_QUERY_LENGTH = 120;
const MAX_R2_TEXT_BYTES = 512_000;

function normalizeQuery(query: string) {
  return query.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
}

function likePattern(query: string) {
  return `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

function compactText(value: string | null | undefined, max = 220) {
  if (!value) return null;
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function resultUrl(type: string, id: string) {
  if (type === "deal") return `/suite/dealflow/${id}`;
  if (type === "contact") return `/suite/contacts/${id}`;
  if (type === "map") return `/suite/dealflow/${id}`;
  return null;
}

function mergeResult(map: Map<string, WorkspaceSearchResult>, row: SearchRow, boost = 0) {
  const key = `${row.type}:${row.id}`;
  const score = Number(row.score || 1) + boost;
  const existing = map.get(key);
  if (existing) {
    existing.score = Math.max(existing.score, score);
    existing.snippet = existing.snippet || compactText(row.snippet);
    existing.subtitle = existing.subtitle || row.subtitle || null;
    existing.updated_at = existing.updated_at || row.updated_at || null;
    return;
  }

  map.set(key, {
    type: row.type,
    id: row.id,
    title: row.title || `${row.type} ${row.id}`,
    subtitle: row.subtitle || null,
    snippet: compactText(row.snippet),
    url: row.url || resultUrl(row.type, row.id),
    score,
    updated_at: row.updated_at || null,
    metadata: {
      payload_r2_key: row.payload_r2_key || undefined,
      storage_object_id: row.storage_object_id || undefined,
    },
  });
}

function bucketFor(env: CloudflareEnv, bucket: StorageRow["bucket"]): R2Bucket | undefined {
  if (bucket === "documents") return env.DOCUMENTS_BUCKET;
  if (bucket === "uploads") return env.UPLOADS_BUCKET;
  if (bucket === "assets") return env.ASSETS_BUCKET;
  return undefined;
}

function searchableMime(mimeType: string) {
  const mime = mimeType.toLowerCase();
  return mime.startsWith("text/") || mime.includes("json") || mime.includes("csv") || mime.includes("xml") || mime.includes("markdown");
}

async function readStorageText(env: CloudflareEnv, object: StorageRow): Promise<string | null> {
  if (!searchableMime(object.mime_type) || object.size_bytes > MAX_R2_TEXT_BYTES) return null;
  const bucket = bucketFor(env, object.bucket);
  if (!bucket) return null;
  const body = await bucket.get(object.r2_key).catch(() => null);
  if (!body) return null;
  return compactText(await body.text().catch(() => ""), 4000);
}

async function lookupStorageObject(
  db: D1Database,
  organizationId: string,
  input: { storageObjectId?: string | null; r2Key?: string | null },
): Promise<StorageRow | null> {
  if (input.storageObjectId) {
    const row = await db
      .prepare(
        `SELECT id, bucket, r2_key, file_name, mime_type, size_bytes, category, resource_type, resource_id, created_at
         FROM storage_objects
         WHERE organization_id = ? AND id = ?
         LIMIT 1`,
      )
      .bind(organizationId, input.storageObjectId)
      .first<StorageRow>()
      .catch(() => null);
    if (row) return row;
  }

  if (!input.r2Key) return null;
  return db
    .prepare(
      `SELECT id, bucket, r2_key, file_name, mime_type, size_bytes, category, resource_type, resource_id, created_at
       FROM storage_objects
       WHERE organization_id = ? AND r2_key = ?
       LIMIT 1`,
    )
    .bind(organizationId, input.r2Key)
    .first<StorageRow>()
    .catch(() => null);
}

async function queryRows(
  db: D1Database,
  sql: string,
  organizationId: string,
  pattern: string,
  limit: number,
): Promise<SearchRow[]> {
  const rows = await db.prepare(sql).bind(organizationId, pattern, limit).all<SearchRow>().catch(() => ({ results: [] as SearchRow[], success: false }));
  return rows.results || [];
}

export async function searchWorkspace(
  env: CloudflareEnv,
  input: { query: string; organizationId?: string; limit?: number },
): Promise<WorkspaceSearchResponse> {
  const query = normalizeQuery(input.query);
  const organizationId = input.organizationId || DEFAULT_ORG_ID;
  const limit = Math.min(Math.max(input.limit || 8, 1), 25);
  if (!env.DB || query.length < 2) {
    return { query, organization_id: organizationId, results: [], graph: [] };
  }

  const pattern = likePattern(query);
  const perTableLimit = Math.min(limit, 10);
  const fixedQueries = [
    `SELECT 'lead' AS type, id, full_name AS title, company AS subtitle,
       COALESCE(need_summary, notes, agent_summary, next_action, email) AS snippet,
       NULL AS url, 8 AS score, updated_at, payload_r2_key, storage_object_id
     FROM leads
     WHERE organization_id = ?1 AND (
       full_name LIKE ?2 ESCAPE '\\' OR email LIKE ?2 ESCAPE '\\' OR company LIKE ?2 ESCAPE '\\'
       OR need_summary LIKE ?2 ESCAPE '\\' OR notes LIKE ?2 ESCAPE '\\' OR agent_summary LIKE ?2 ESCAPE '\\'
       OR next_action LIKE ?2 ESCAPE '\\' OR tags_json LIKE ?2 ESCAPE '\\'
     )
     ORDER BY updated_at DESC LIMIT ?3`,
    `SELECT 'contact' AS type, id, COALESCE(full_name, first_name || ' ' || last_name) AS title, company AS subtitle,
       COALESCE(need_summary, agent_summary, email, phone) AS snippet,
       NULL AS url, 7 AS score, updated_at, payload_r2_key, storage_object_id
     FROM contacts
     WHERE organization_id = ?1 AND (
       full_name LIKE ?2 ESCAPE '\\' OR email LIKE ?2 ESCAPE '\\' OR company LIKE ?2 ESCAPE '\\'
       OR title LIKE ?2 ESCAPE '\\' OR need_summary LIKE ?2 ESCAPE '\\' OR agent_summary LIKE ?2 ESCAPE '\\'
       OR business_email LIKE ?2 ESCAPE '\\' OR linkedin_url LIKE ?2 ESCAPE '\\'
     )
     ORDER BY updated_at DESC LIMIT ?3`,
    `SELECT 'deal' AS type, id, name AS title, company AS subtitle,
       stage || ' - probability ' || probability || '%' AS snippet,
       NULL AS url, 7 AS score, updated_at, payload_r2_key, storage_object_id
     FROM deals
     WHERE organization_id = ?1 AND (
       name LIKE ?2 ESCAPE '\\' OR company LIKE ?2 ESCAPE '\\' OR stage LIKE ?2 ESCAPE '\\'
     )
     ORDER BY updated_at DESC LIMIT ?3`,
    `SELECT 'task' AS type, id, title, COALESCE(priority, status) AS subtitle,
       status || COALESCE(' - due ' || due_at, '') AS snippet,
       NULL AS url, 5 AS score, updated_at, payload_r2_key, storage_object_id
     FROM tasks
     WHERE organization_id = ?1 AND (
       title LIKE ?2 ESCAPE '\\' OR type LIKE ?2 ESCAPE '\\' OR priority LIKE ?2 ESCAPE '\\'
       OR status LIKE ?2 ESCAPE '\\'
     )
     ORDER BY updated_at DESC LIMIT ?3`,
    `SELECT 'document' AS type, id, title, COALESCE(recipient_company, recipient_name, type) AS subtitle,
       status AS snippet, NULL AS url, 6 AS score, updated_at, r2_key AS payload_r2_key, NULL AS storage_object_id
     FROM documents
     WHERE organization_id = ?1 AND (
       title LIKE ?2 ESCAPE '\\' OR type LIKE ?2 ESCAPE '\\' OR recipient_name LIKE ?2 ESCAPE '\\'
       OR recipient_company LIKE ?2 ESCAPE '\\' OR recipient_email LIKE ?2 ESCAPE '\\' OR status LIKE ?2 ESCAPE '\\'
     )
     ORDER BY updated_at DESC LIMIT ?3`,
    `SELECT 'knowledge_page' AS type, id, title, workspace_id AS subtitle,
       content_json AS snippet, NULL AS url, 6 AS score, updated_at, NULL AS payload_r2_key, NULL AS storage_object_id
     FROM knowledge_pages
     WHERE organization_id = ?1 AND (
       title LIKE ?2 ESCAPE '\\' OR content_json LIKE ?2 ESCAPE '\\'
     )
     ORDER BY updated_at DESC LIMIT ?3`,
    `SELECT 'map' AS type, id, name AS title, COALESCE(template, deal_id) AS subtitle,
       deal_id AS snippet, NULL AS url, 5 AS score, updated_at, payload_r2_key, storage_object_id
     FROM maps
     WHERE organization_id = ?1 AND (
       name LIKE ?2 ESCAPE '\\' OR deal_id LIKE ?2 ESCAPE '\\' OR template LIKE ?2 ESCAPE '\\'
     )
     ORDER BY updated_at DESC LIMIT ?3`,
    `SELECT 'map_node' AS type, n.id, n.label AS title, m.name AS subtitle,
       COALESCE(n.sublabel, n.status, n.data_json) AS snippet,
       NULL AS url, 5 AS score, n.updated_at, n.payload_r2_key, n.storage_object_id
     FROM map_nodes n
     JOIN maps m ON m.id = n.map_id
     WHERE m.organization_id = ?1 AND (
       n.label LIKE ?2 ESCAPE '\\' OR n.sublabel LIKE ?2 ESCAPE '\\' OR n.kind LIKE ?2 ESCAPE '\\'
       OR n.status LIKE ?2 ESCAPE '\\' OR n.data_json LIKE ?2 ESCAPE '\\'
     )
     ORDER BY n.updated_at DESC LIMIT ?3`,
    `SELECT 'voice_note' AS type, id, title, resource_type || ':' || resource_id AS subtitle,
       COALESCE(transcript_text, agent_summary) AS snippet, NULL AS url, 8 AS score, updated_at, payload_r2_key, storage_object_id
     FROM voice_notes
     WHERE organization_id = ?1 AND (
       title LIKE ?2 ESCAPE '\\' OR transcript_text LIKE ?2 ESCAPE '\\' OR agent_summary LIKE ?2 ESCAPE '\\'
     )
     ORDER BY updated_at DESC LIMIT ?3`,
    `SELECT 'communication_message' AS type, id, COALESCE(channel, 'message') AS title, resource_type || ':' || resource_id AS subtitle,
       body AS snippet, NULL AS url, 7 AS score, created_at AS updated_at, payload_r2_key, storage_object_id
     FROM communication_messages
     WHERE organization_id = ?1 AND (
       body LIKE ?2 ESCAPE '\\' OR channel LIKE ?2 ESCAPE '\\' OR audience LIKE ?2 ESCAPE '\\'
     )
     ORDER BY created_at DESC LIMIT ?3`,
  ];

  const resultMap = new Map<string, WorkspaceSearchResult>();
  for (const sql of fixedQueries) {
    const rows = await queryRows(env.DB, sql, organizationId, pattern, perTableLimit);
    for (const row of rows) mergeResult(resultMap, row);
  }

  const storageRows = await env.DB
    .prepare(
      `SELECT id, bucket, r2_key, file_name, mime_type, size_bytes, category, resource_type, resource_id, created_at
       FROM storage_objects
       WHERE organization_id = ? AND (
         file_name LIKE ? ESCAPE '\\' OR r2_key LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\'
       )
       ORDER BY created_at DESC LIMIT ?`,
    )
    .bind(organizationId, pattern, pattern, pattern, 20)
    .all<StorageRow>()
    .catch(() => ({ results: [] as StorageRow[], success: false }));

  for (const object of storageRows.results || []) {
    const text = await readStorageText(env, object);
    mergeResult(resultMap, {
      type: object.resource_type || "storage_object",
      id: object.resource_id || object.id,
      title: object.file_name,
      subtitle: object.category,
      snippet: text || object.r2_key,
      score: text?.toLowerCase().includes(query.toLowerCase()) ? 9 : 4,
      updated_at: object.created_at,
      storage_object_id: object.id,
    }, 1);
  }

  for (const result of resultMap.values()) {
    const storageObjectId = typeof result.metadata?.storage_object_id === "string" ? result.metadata.storage_object_id : null;
    const r2Key = typeof result.metadata?.payload_r2_key === "string" ? result.metadata.payload_r2_key : null;
    if (!storageObjectId && !r2Key) continue;

    const object = await lookupStorageObject(env.DB, organizationId, { storageObjectId, r2Key });
    if (!object) continue;

    const text = await readStorageText(env, object);
    if (!text) continue;

    if (!result.snippet || text.toLowerCase().includes(query.toLowerCase())) {
      result.snippet = compactText(text);
      result.score += text.toLowerCase().includes(query.toLowerCase()) ? 3 : 1;
      result.metadata = { ...result.metadata, hydrated_r2_key: object.r2_key };
    }
  }

  const results = Array.from(resultMap.values())
    .sort((a, b) => b.score - a.score || String(b.updated_at || "").localeCompare(String(a.updated_at || "")))
    .slice(0, limit);
  const graph = await getRecordGraph(env.DB, organizationId, results.map((result) => ({ type: result.type, id: result.id })), 5);

  return { query, organization_id: organizationId, results, graph };
}

export function formatSearchContext(search: WorkspaceSearchResponse, maxResults = 5) {
  if (!search.results.length) return "";
  const lines = search.results.slice(0, maxResults).map((result) => {
    const detail = [result.subtitle, result.snippet].filter(Boolean).join(" - ");
    return `- ${result.type}:${result.id} ${result.title}${detail ? ` - ${detail}` : ""}`;
  });
  const edgeLines = search.graph.slice(0, 8).map((edge) => {
    return `- ${edge.from.type}:${edge.from.id} -> ${edge.to.type}:${edge.to.id} (${edge.relation}${edge.label ? `: ${edge.label}` : ""})`;
  });
  return ["RETRIEVAL CONTEXT (LIKE search, not embeddings):", ...lines, edgeLines.length ? "RELATED RECORD GRAPH:" : "", ...edgeLines]
    .filter(Boolean)
    .join("\n");
}
