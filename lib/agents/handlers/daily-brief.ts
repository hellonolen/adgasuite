// Conductor handler: skills/daily-brief.skill.md
//
// Composes the operator's daily brief from D1 reads + cross-agent skill calls.
// The brief replaces "/suite redirects to one deal" with a ranked, action-ready
// read of "here are the 3-7 things that need your attention right now."
//
// Cached in the `daily_briefs` D1 table so page loads are instant. Recomposed
// by the hourly cron OR on explicit operator request.

import { publish } from "@/lib/events/bus";
import { nowIso } from "@/lib/server/id";
import type { SkillContext } from "@/lib/agents/skill-registry";

export interface DailyBriefInput {
  organization_id: string;
  user_email: string;
  now?: string;
  force_recompose?: boolean;
}

export interface BriefItem {
  id: string;
  kind:
    | "stalled_deal"
    | "overdue_commitment"
    | "prepared_action"
    | "qualified_lead"
    | "closing_soon"
    | "activity"
    | "pipeline_summary";
  priority: 1 | 2 | 3 | 4 | 5;
  headline: string;
  subheadline?: string | null;
  deal_id?: string | null;
  cta_label: string;
  cta_href: string;
  prepared_action_id?: string | null;
  risk?: "low" | "medium" | "high" | null;
  expires_at?: string | null;
}

export interface DailyBriefOutput {
  organization_id: string;
  user_email: string;
  composed_at: string;
  stale_at: string | null;
  items: BriefItem[];
  totals: {
    active_deals: number;
    pipeline_value_cents: number;
    weighted_pipeline_cents: number;
    stalled_count: number;
    pending_approvals: number;
  };
}

const CACHE_MAX_AGE_MS = 15 * 60 * 1000;

async function ensureBriefTable(env: CloudflareEnv): Promise<void> {
  if (!env.DB) return;
  await env.DB
    .prepare(
      `CREATE TABLE IF NOT EXISTS daily_briefs (
         organization_id TEXT NOT NULL,
         user_email TEXT NOT NULL,
         composed_at TEXT NOT NULL,
         payload_json TEXT NOT NULL,
         PRIMARY KEY (organization_id, user_email)
       )`,
    )
    .run();
}

interface StalledRow { id: string; name: string; stage: string | null; value_cents: number | null; updated_at: string; }
interface ClosingRow { id: string; name: string; stage: string | null; value_cents: number | null; expected_close_at: string | null; probability: number | null; }
interface LeadRow { id: string; name: string | null; company: string | null; created_at: string; status: string | null; score: number | null; }
interface ApprovalRow { id: string; title: string; risk: string | null; created_at: string; }
interface DealAggRow { count: number; value_cents: number; weighted_cents: number; }
interface EventRow { event_type: string; created_at: string; resource_id: string | null; }

async function composeFresh(
  env: CloudflareEnv,
  organizationId: string,
  userEmail: string,
  nowISO: string,
): Promise<DailyBriefOutput> {
  const items: BriefItem[] = [];
  const nowMs = new Date(nowISO).getTime();
  const SEVEN_DAYS = 7 * 86_400_000;
  const ONE_DAY = 86_400_000;
  const cutoff7d = new Date(nowMs - SEVEN_DAYS).toISOString();
  const cutoff24h = new Date(nowMs - ONE_DAY).toISOString();
  const horizon7d = new Date(nowMs + SEVEN_DAYS).toISOString();

  // 1. Stalled deals — high value, no movement in 7+ days
  const stalled = (await env.DB!
    .prepare(
      `SELECT id, name, stage, value_cents, updated_at
         FROM deals
        WHERE organization_id = ?
          AND archived_at IS NULL
          AND COALESCE(stage,'') NOT IN ('won','lost','closed','deliver')
          AND updated_at < ?
        ORDER BY value_cents DESC
        LIMIT 3`,
    )
    .bind(organizationId, cutoff7d)
    .all<StalledRow>()
    .catch(() => ({ results: [] as StalledRow[] }))).results || [];
  for (const d of stalled) {
    items.push({
      id: `brief:stalled:${d.id}:${nowISO.slice(0, 10)}`,
      kind: "stalled_deal",
      priority: (d.value_cents || 0) >= 10_000_000 * 100 ? 1 : 2,
      headline: `${d.name} is stalling`,
      subheadline: `Last activity ${daysAgo(d.updated_at, nowMs)} · ${d.stage || "unknown stage"} · ${fmtMoney(d.value_cents)}`,
      deal_id: d.id,
      cta_label: "Open deal",
      cta_href: `/suite/dealflow/${encodeURIComponent(d.id)}`,
      risk: "high",
    });
  }

  // 2. Deals closing soon (close/sign stage, expected_close within 7d)
  const closing = (await env.DB!
    .prepare(
      `SELECT id, name, stage, value_cents, expected_close_at, probability
         FROM deals
        WHERE organization_id = ?
          AND archived_at IS NULL
          AND LOWER(COALESCE(stage,'')) IN ('close','sign','closing','contract')
          AND expected_close_at IS NOT NULL
          AND expected_close_at <= ?
        ORDER BY expected_close_at ASC
        LIMIT 3`,
    )
    .bind(organizationId, horizon7d)
    .all<ClosingRow>()
    .catch(() => ({ results: [] as ClosingRow[] }))).results || [];
  for (const d of closing) {
    items.push({
      id: `brief:closing:${d.id}:${nowISO.slice(0, 10)}`,
      kind: "closing_soon",
      priority: 2,
      headline: `${d.name} closes ${shortDate(d.expected_close_at)}`,
      subheadline: `${d.stage || ""} · ${d.probability || 0}% prob · ${fmtMoney(d.value_cents)}`,
      deal_id: d.id,
      cta_label: "Open deal",
      cta_href: `/suite/dealflow/${encodeURIComponent(d.id)}`,
      risk: "medium",
      expires_at: d.expected_close_at,
    });
  }

  // 3. Prepared actions awaiting approval
  const approvals = (await env.DB!
    .prepare(
      `SELECT id, title, risk, created_at
         FROM agent_approvals
        WHERE organization_id = ?
          AND status = 'pending'
        ORDER BY created_at ASC
        LIMIT 3`,
    )
    .bind(organizationId)
    .all<ApprovalRow>()
    .catch(() => ({ results: [] as ApprovalRow[] }))).results || [];
  for (const a of approvals) {
    items.push({
      id: `brief:approval:${a.id}`,
      kind: "prepared_action",
      priority: a.risk === "high" ? 1 : 3,
      headline: a.title,
      subheadline: `Awaiting your approval · ${a.risk || "medium"} risk`,
      cta_label: "Review",
      cta_href: `/suite/admin/audit?approval_id=${encodeURIComponent(a.id)}`,
      prepared_action_id: a.id,
      risk: (a.risk as BriefItem["risk"]) || "medium",
    });
  }

  // 4. New qualified leads (last 24h)
  const leads = (await env.DB!
    .prepare(
      `SELECT id, name, company, created_at, status, score
         FROM leads
        WHERE organization_id = ?
          AND LOWER(COALESCE(status,'')) IN ('qualified','hot','warm')
          AND created_at >= ?
        ORDER BY COALESCE(score, 0) DESC, created_at DESC
        LIMIT 3`,
    )
    .bind(organizationId, cutoff24h)
    .all<LeadRow>()
    .catch(() => ({ results: [] as LeadRow[] }))).results || [];
  for (const l of leads) {
    items.push({
      id: `brief:lead:${l.id}`,
      kind: "qualified_lead",
      priority: 3,
      headline: `New qualified lead · ${l.name || l.company || "Unknown"}`,
      subheadline: `${l.company ? l.company + " · " : ""}score ${l.score || "—"} · ${shortRelative(l.created_at, nowMs)}`,
      cta_label: "Open lead",
      cta_href: `/suite/leads`,
      risk: "low",
    });
  }

  // 5. Recent agent activity (last 24h)
  const activity = (await env.DB!
    .prepare(
      `SELECT event_type, created_at, resource_id
         FROM events
        WHERE organization_id = ?
          AND event_type IN ('agent_approval.requested','workspace.activated','dealflow.node_added')
          AND created_at >= ?
        ORDER BY created_at DESC
        LIMIT 1`,
    )
    .bind(organizationId, cutoff24h)
    .all<EventRow>()
    .catch(() => ({ results: [] as EventRow[] }))).results || [];
  for (const e of activity) {
    items.push({
      id: `brief:activity:${e.event_type}:${e.created_at}`,
      kind: "activity",
      priority: 4,
      headline: friendlyEvent(e.event_type),
      subheadline: shortRelative(e.created_at, nowMs),
      cta_label: "Open activity",
      cta_href: e.resource_id?.startsWith("DEAL-") || e.resource_id?.startsWith("map_")
        ? `/suite/dealflow/${encodeURIComponent(e.resource_id)}`
        : `/suite`,
    });
  }

  // 6. Pipeline summary — always last, always present
  const agg = await env.DB!
    .prepare(
      `SELECT COUNT(*) as count,
              COALESCE(SUM(value_cents),0) as value_cents,
              COALESCE(SUM((value_cents * COALESCE(probability,0))/100),0) as weighted_cents
         FROM deals
        WHERE organization_id = ? AND archived_at IS NULL`,
    )
    .bind(organizationId)
    .first<DealAggRow>()
    .catch(() => null);
  const totals = {
    active_deals: agg?.count || 0,
    pipeline_value_cents: agg?.value_cents || 0,
    weighted_pipeline_cents: agg?.weighted_cents || 0,
    stalled_count: stalled.length,
    pending_approvals: approvals.length,
  };
  items.push({
    id: `brief:pipeline-summary:${nowISO.slice(0, 10)}`,
    kind: "pipeline_summary",
    priority: 5,
    headline: `Pipeline: ${fmtMoney(totals.pipeline_value_cents)} across ${totals.active_deals} deals`,
    subheadline: `Weighted ${fmtMoney(totals.weighted_pipeline_cents)} · ${totals.stalled_count} stalled · ${totals.pending_approvals} awaiting approval`,
    cta_label: "Open intelligence",
    cta_href: `/suite/intelligence`,
  });

  // Sort by priority, cap at 7
  items.sort((a, b) => a.priority - b.priority);
  const trimmed = items.slice(0, 7);

  return {
    organization_id: organizationId,
    user_email: userEmail,
    composed_at: nowISO,
    stale_at: null,
    items: trimmed,
    totals,
  };
}

export async function dailyBrief(
  context: SkillContext,
  input: DailyBriefInput,
): Promise<DailyBriefOutput> {
  if (!context.env.DB) throw new Error("daily-brief requires D1.");
  const nowISO = input.now || nowIso();
  await ensureBriefTable(context.env);

  // Cache read
  if (!input.force_recompose) {
    const cached = await context.env.DB
      .prepare(`SELECT payload_json, composed_at FROM daily_briefs WHERE organization_id = ? AND user_email = ?`)
      .bind(input.organization_id, input.user_email)
      .first<{ payload_json: string; composed_at: string }>()
      .catch(() => null);
    if (cached) {
      const age = Date.now() - new Date(cached.composed_at).getTime();
      if (age < CACHE_MAX_AGE_MS) {
        try {
          return JSON.parse(cached.payload_json) as DailyBriefOutput;
        } catch {
          // fall through to recompose
        }
      }
    }
  }

  let composed: DailyBriefOutput;
  try {
    composed = await composeFresh(context.env, input.organization_id, input.user_email, nowISO);
  } catch (error) {
    // Recovery: return stale cache if composition fails
    const cached = await context.env.DB
      .prepare(`SELECT payload_json FROM daily_briefs WHERE organization_id = ? AND user_email = ?`)
      .bind(input.organization_id, input.user_email)
      .first<{ payload_json: string }>()
      .catch(() => null);
    if (cached) {
      try {
        const stale = JSON.parse(cached.payload_json) as DailyBriefOutput;
        stale.stale_at = nowISO;
        return stale;
      } catch {
        // fall through
      }
    }
    throw error;
  }

  // Cache write
  await context.env.DB
    .prepare(
      `INSERT INTO daily_briefs (organization_id, user_email, composed_at, payload_json)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(organization_id, user_email) DO UPDATE SET
         composed_at = excluded.composed_at,
         payload_json = excluded.payload_json`,
    )
    .bind(input.organization_id, input.user_email, composed.composed_at, JSON.stringify(composed))
    .run()
    .catch(() => null);

  await publish(context.env.DB, {
    organization_id: input.organization_id,
    event_type: "conductor.brief.composed",
    actor_type: context.actor_type,
    actor_id: context.actor_id,
    resource_type: "daily_brief",
    resource_id: `${input.organization_id}:${input.user_email}`,
    payload: { user_email: input.user_email, item_count: composed.items.length, composed_at: composed.composed_at },
  }).catch(() => null);

  return composed;
}

// ─── formatting helpers ──────────────────────────────────────────────────────
function fmtMoney(cents: number | null | undefined): string {
  const c = cents || 0;
  if (c >= 1_000_000_00) return `$${Math.round(c / 1_000_000_00)}M`;
  if (c >= 1_000_00) return `$${Math.round(c / 1_000_00)}K`;
  return `$${Math.round(c / 100)}`;
}
function daysAgo(iso: string, nowMs: number): string {
  const days = Math.floor((nowMs - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}
function shortRelative(iso: string, nowMs: number): string {
  const ms = nowMs - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return daysAgo(iso, nowMs);
}
function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleString("en-US", { month: "short" })} ${d.getDate()}`;
}
function friendlyEvent(type: string): string {
  switch (type) {
    case "agent_approval.requested": return "An approval was prepared";
    case "workspace.activated":      return "Workspace activation completed";
    case "dealflow.node_added":      return "A new node was added to a dealflow";
    default:                          return type;
  }
}
