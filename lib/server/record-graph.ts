export type RecordRef = {
  type: string;
  id: string;
};

export type RecordGraphEdge = {
  from: RecordRef;
  to: RecordRef;
  relation: string;
  label?: string | null;
  created_at?: string | null;
};

type EdgeRow = {
  from_type: string;
  from_id: string;
  to_type: string;
  to_id: string;
  relation: string;
  label?: string | null;
  created_at?: string | null;
};

function uniqueRefs(records: RecordRef[]): RecordRef[] {
  const seen = new Set<string>();
  return records.filter((record) => {
    const key = `${record.type}:${record.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mapEdge(row: EdgeRow): RecordGraphEdge {
  return {
    from: { type: row.from_type, id: row.from_id },
    to: { type: row.to_type, id: row.to_id },
    relation: row.relation,
    label: row.label ?? null,
    created_at: row.created_at ?? null,
  };
}

export async function getRecordGraph(
  db: D1Database | undefined,
  organizationId: string,
  records: RecordRef[],
  limitPerRecord = 8,
): Promise<RecordGraphEdge[]> {
  if (!db) return [];

  const edges: RecordGraphEdge[] = [];
  for (const record of uniqueRefs(records).slice(0, 12)) {
    const [events, storage, tasks, maps, nodes] = await Promise.all([
      db
        .prepare(
          `SELECT resource_type AS from_type, resource_id AS from_id, 'event' AS to_type, id AS to_id,
             event_type AS relation, actor_id AS label, created_at
           FROM events
           WHERE organization_id = ? AND resource_type = ? AND resource_id = ?
           ORDER BY created_at DESC
           LIMIT ?`,
        )
        .bind(organizationId, record.type, record.id, limitPerRecord)
        .all<EdgeRow>()
        .catch(() => ({ results: [] as EdgeRow[], success: false })),
      db
        .prepare(
          `SELECT resource_type AS from_type, resource_id AS from_id, 'storage_object' AS to_type, id AS to_id,
             category AS relation, file_name AS label, created_at
           FROM storage_objects
           WHERE organization_id = ? AND resource_type = ? AND resource_id = ?
           ORDER BY created_at DESC
           LIMIT ?`,
        )
        .bind(organizationId, record.type, record.id, limitPerRecord)
        .all<EdgeRow>()
        .catch(() => ({ results: [] as EdgeRow[], success: false })),
      record.type === "deal"
        ? db
            .prepare(
              `SELECT 'deal' AS from_type, deal_id AS from_id, 'task' AS to_type, id AS to_id,
                 status AS relation, title AS label, created_at
               FROM tasks
               WHERE organization_id = ? AND deal_id = ?
               ORDER BY updated_at DESC
               LIMIT ?`,
            )
            .bind(organizationId, record.id, limitPerRecord)
            .all<EdgeRow>()
            .catch(() => ({ results: [] as EdgeRow[], success: false }))
        : Promise.resolve({ results: [] as EdgeRow[], success: true }),
      record.type === "deal"
        ? db
            .prepare(
              `SELECT 'deal' AS from_type, deal_id AS from_id, 'map' AS to_type, id AS to_id,
                 COALESCE(template, 'dealflow') AS relation, name AS label, created_at
               FROM maps
               WHERE organization_id = ? AND deal_id = ?
               ORDER BY updated_at DESC
               LIMIT ?`,
            )
            .bind(organizationId, record.id, limitPerRecord)
            .all<EdgeRow>()
            .catch(() => ({ results: [] as EdgeRow[], success: false }))
        : Promise.resolve({ results: [] as EdgeRow[], success: true }),
      record.type === "map"
        ? db
            .prepare(
              `SELECT 'map' AS from_type, map_id AS from_id, 'map_node' AS to_type, id AS to_id,
                 kind AS relation, label AS label, created_at
               FROM map_nodes
               WHERE map_id = ?
               ORDER BY updated_at DESC
               LIMIT ?`,
            )
            .bind(record.id, limitPerRecord)
            .all<EdgeRow>()
            .catch(() => ({ results: [] as EdgeRow[], success: false }))
        : Promise.resolve({ results: [] as EdgeRow[], success: true }),
    ]);

    for (const group of [events, storage, tasks, maps, nodes]) {
      edges.push(...(group.results || []).filter((row) => row.from_id && row.to_id).map(mapEdge));
    }
  }

  return edges;
}
