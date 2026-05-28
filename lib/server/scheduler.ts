import { runAgentJob } from "@/lib/agents/engine";
import {
  type AgentJob,
  completeAgentJob,
  createAgentJob,
  failAgentJob,
  listQueuedAgentJobs,
  markAgentJobRunning,
} from "@/lib/server/repository";
import { type BackupResult, runDailySnapshotIfDue } from "@/lib/server/backup";

const BATCH_LIMIT = 10;
const STALE_LEAD_DAYS = 7;
const STALLED_DEAL_DAYS = 14;
const OPEN_JOB_STATUSES = ["queued", "running"] as const;

export interface SchedulerResult {
  processed: number;
  failed: number;
  jobs: Array<{ id: string; status: "completed" | "failed"; error?: string }>;
}

export interface MaintenanceResult extends SchedulerResult {
  staleLeadJobsCreated: number;
  stalledDealJobsCreated: number;
  backup?: BackupResult;
}

async function hasOpenAgentJobForResource(
  db: D1Database,
  organizationId: string,
  jobType: string,
  resourceKey: string,
  resourceId: string,
): Promise<boolean> {
  const placeholders = OPEN_JOB_STATUSES.map(() => "?").join(", ");
  const rows = await db
    .prepare(
      `SELECT input_json
         FROM agent_jobs
        WHERE organization_id = ?
          AND job_type = ?
          AND status IN (${placeholders})
        ORDER BY created_at DESC
        LIMIT 100`,
    )
    .bind(organizationId, jobType, ...OPEN_JOB_STATUSES)
    .all<{ input_json: string | null }>();

  for (const row of rows.results || []) {
    try {
      const input = JSON.parse(row.input_json || "{}") as Record<string, unknown>;
      if (String(input[resourceKey] || "") === resourceId) return true;
    } catch {
      continue;
    }
  }

  return false;
}

/**
 * Drain up to BATCH_LIMIT queued agent jobs, catching errors per-job so a single
 * failure cannot tank the whole batch. Safe for scheduled() handlers.
 */
export async function runScheduledTick(env: CloudflareEnv): Promise<SchedulerResult> {
  const result: SchedulerResult = { processed: 0, failed: 0, jobs: [] };

  let jobs: AgentJob[] = [];
  try {
    jobs = await listQueuedAgentJobs(env.DB, BATCH_LIMIT);
  } catch (error) {
    console.error("[cron] listQueuedAgentJobs failed", error);
    return result;
  }

  for (const queued of jobs) {
    try {
      const running = await markAgentJobRunning(env.DB, queued);
      try {
        const output = await runAgentJob(env, running);
        await completeAgentJob(env.DB, running, output);
        result.processed += 1;
        result.jobs.push({ id: running.id, status: "completed" });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown agent runner error";
        await failAgentJob(env.DB, running, message);
        result.failed += 1;
        result.jobs.push({ id: running.id, status: "failed", error: message });
      }
    } catch (outerError) {
      // Repository call itself blew up. Log and continue with next job.
      console.error("[cron] job lifecycle error", outerError);
      result.failed += 1;
      result.jobs.push({
        id: queued.id,
        status: "failed",
        error: outerError instanceof Error ? outerError.message : "lifecycle error",
      });
    }
  }

  return result;
}

/**
 * Hourly maintenance:
 *   1. Drain queued jobs (same as 5-min tick).
 *   2. Detect stale leads (no activity in STALE_LEAD_DAYS) and queue Sales
 *      follow-up jobs.
 *   3. Detect stalled deals (no stage change in STALLED_DEAL_DAYS) and queue
 *      Sales check-in jobs.
 *
 * No-ops gracefully when env.DB is unavailable.
 */
export async function runHourlyMaintenance(env: CloudflareEnv): Promise<MaintenanceResult> {
  const drain = await runScheduledTick(env);
  const result: MaintenanceResult = {
    ...drain,
    staleLeadJobsCreated: 0,
    stalledDealJobsCreated: 0,
  };

  // Daily D1 → R2 snapshot. No-ops outside 06:00 UTC.
  result.backup = await runDailySnapshotIfDue(env).catch((error) => ({
    attempted: false,
    reason: error instanceof Error ? error.message : "backup error",
  }));

  if (!env.DB) return result;

  const now = new Date();
  const staleLeadCutoff = new Date(now.getTime() - STALE_LEAD_DAYS * 86400_000).toISOString();
  const stalledDealCutoff = new Date(now.getTime() - STALLED_DEAL_DAYS * 86400_000).toISOString();

  // Stale leads: never contacted AND received before cutoff, OR last_contacted_at
  // before cutoff. Skip closed/lost leads.
  try {
    const staleLeads = await env.DB.prepare(
      `SELECT id, organization_id, full_name, company, status, score
         FROM leads
        WHERE LOWER(status) NOT IN ('won', 'lost', 'closed', 'unresponsive')
          AND (
            (last_contacted_at IS NULL AND COALESCE(received_at, created_at) <= ?)
            OR (last_contacted_at IS NOT NULL AND last_contacted_at <= ?)
          )
        ORDER BY COALESCE(last_contacted_at, received_at, created_at) ASC
        LIMIT 25`,
    )
      .bind(staleLeadCutoff, staleLeadCutoff)
      .all<Record<string, unknown>>();

    for (const row of staleLeads.results || []) {
      try {
        await createAgentJob(env.DB, {
          agent: "sales",
          job_type: "follow_up_stale_lead",
          organization_id: String(row.organization_id),
          input: {
            lead_id: String(row.id),
            lead_name: String(row.full_name || ""),
            company: String(row.company || ""),
            status: String(row.status || ""),
            score: Number(row.score || 0),
            reason: `No activity in ${STALE_LEAD_DAYS}+ days`,
            cron_source: "hourly_maintenance",
          },
        });
        result.staleLeadJobsCreated += 1;
      } catch (error) {
        console.error("[cron] failed to queue stale-lead job", error);
      }
    }
  } catch (error) {
    console.error("[cron] stale lead query failed", error);
  }

  // Stalled deals: not won/lost AND updated_at before cutoff.
  try {
    const stalledDeals = await env.DB.prepare(
      `SELECT id, organization_id, name, company, stage, value_cents, probability
         FROM deals
        WHERE LOWER(stage) NOT IN ('won', 'lost', 'closed')
          AND updated_at <= ?
        ORDER BY updated_at ASC
        LIMIT 25`,
    )
      .bind(stalledDealCutoff)
      .all<Record<string, unknown>>();

    for (const row of stalledDeals.results || []) {
      try {
        const organizationId = String(row.organization_id);
        const dealId = String(row.id);
        const alreadyQueued = await hasOpenAgentJobForResource(
          env.DB,
          organizationId,
          "check_in_stalled_deal",
          "deal_id",
          dealId,
        );
        if (alreadyQueued) continue;

        await createAgentJob(env.DB, {
          agent: "sales",
          job_type: "check_in_stalled_deal",
          organization_id: organizationId,
          input: {
            deal_id: dealId,
            deal_name: String(row.name || ""),
            company: String(row.company || ""),
            stage: String(row.stage || ""),
            value_cents: Number(row.value_cents || 0),
            probability: Number(row.probability || 0),
            reason: `No stage change in ${STALLED_DEAL_DAYS}+ days`,
            cron_source: "hourly_maintenance",
          },
        });
        result.stalledDealJobsCreated += 1;
      } catch (error) {
        console.error("[cron] failed to queue stalled-deal job", error);
      }
    }
  } catch (error) {
    console.error("[cron] stalled deal query failed", error);
  }

  return result;
}
