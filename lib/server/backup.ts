// Daily D1 → R2 snapshot. Hourly cron checks UTC hour; runs once per day at 06:00.
// Survives the 30-day D1 Time Travel window by writing JSON archives to R2.

const BACKUP_PREFIX = "backups/d1";
const BACKUP_TABLES = [
  "organizations",
  "organization_members",
  "users",
  "subscriptions",
  "deals",
  "maps",
  "map_nodes",
  "map_edges",
  "contacts",
  "leads",
  "documents",
  "tasks",
  "knowledge_workspaces",
  "knowledge_pages",
];

export interface BackupResult {
  attempted: boolean;
  reason?: string;
  r2_key?: string;
  bytes?: number;
  tables?: Record<string, number>;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export async function runDailySnapshotIfDue(env: CloudflareEnv): Promise<BackupResult> {
  // Only run at 06:00 UTC. Hourly cron lands inside that hour exactly once.
  const hour = new Date().getUTCHours();
  if (hour !== 6) return { attempted: false, reason: `skip (UTC hour ${hour}, snapshot runs at 06)` };

  if (!env.DB) return { attempted: false, reason: "no DB binding" };
  if (!env.ASSETS_BUCKET) return { attempted: false, reason: "no R2 ASSETS_BUCKET binding" };

  const key = `${BACKUP_PREFIX}/${todayKey()}.json`;
  // Idempotent: hourly cron writing the same key twice within hour 6 just overwrites.

  const tableCounts: Record<string, number> = {};
  const dump: Record<string, unknown[]> = {};
  for (const table of BACKUP_TABLES) {
    const result = await env.DB.prepare(`SELECT * FROM ${table}`)
      .all<Record<string, unknown>>()
      .catch(() => ({ results: [] as Record<string, unknown>[] }));
    const rows = result.results || [];
    dump[table] = rows;
    tableCounts[table] = rows.length;
  }

  const body = JSON.stringify({
    created_at: new Date().toISOString(),
    db: "adga-suite",
    tables: dump,
  });

  await env.ASSETS_BUCKET.put(key, body, {
    httpMetadata: { contentType: "application/json" },
    customMetadata: {
      created_at: new Date().toISOString(),
      table_count: String(BACKUP_TABLES.length),
    },
  });

  return {
    attempted: true,
    r2_key: key,
    bytes: body.length,
    tables: tableCounts,
  };
}
