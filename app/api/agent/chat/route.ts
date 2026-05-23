import { z } from "zod";

import { runChatTurn, type ChatMessage } from "@/lib/agents/engine";
import { errorJson, json, readJson } from "@/lib/server/http";
import { getRuntimeContext, requireAdmin } from "@/lib/server/runtime";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(8000),
});

const ContextSchema = z
  .object({
    kind: z.enum(["deal", "pipeline", "workspace"]),
    id: z.string().min(1).max(120).optional(),
  })
  .optional();

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(40),
  context: ContextSchema,
});

// Per-session sliding-window rate limit (10 messages / minute).
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const rateLog = new Map<string, number[]>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const history = rateLog.get(key)?.filter((t) => now - t < RATE_WINDOW_MS) ?? [];
  if (history.length >= RATE_LIMIT) {
    rateLog.set(key, history);
    return false;
  }
  history.push(now);
  rateLog.set(key, history);
  return true;
}

interface DealRow {
  id: string;
  name: string;
  company: string | null;
  stage: string | null;
  value_cents: number | null;
  probability: number | null;
  expected_close_at: string | null;
  owner_user_id: string | null;
  updated_at: string | null;
}

interface EventRow {
  event_type: string;
  resource_type: string | null;
  resource_id: string | null;
  created_at: string;
}

async function buildContextBlock(
  db: D1Database | undefined,
  ctx: { kind: "deal" | "pipeline" | "workspace"; id?: string } | undefined,
): Promise<string> {
  if (!db) return "Live database is not bound in this environment. Respond using general business judgement.";

  const kind = ctx?.kind ?? "workspace";

  if (kind === "deal" && ctx?.id) {
    const deal = await db
      .prepare(
        "SELECT id, name, company, stage, value_cents, probability, expected_close_at, owner_user_id, updated_at FROM deals WHERE id = ?",
      )
      .bind(ctx.id)
      .first<DealRow>()
      .catch(() => null);

    if (!deal) return `Deal ${ctx.id} was requested but not found in the live database.`;

    const events = await db
      .prepare(
        "SELECT event_type, resource_type, resource_id, created_at FROM events WHERE resource_type = 'deal' AND resource_id = ? ORDER BY created_at DESC LIMIT 8",
      )
      .bind(ctx.id)
      .all<EventRow>()
      .catch(() => ({ results: [] as EventRow[] }));

    const eventLines = (events.results || [])
      .map((e) => `- ${e.created_at} ${e.event_type}`)
      .join("\n");

    const valueUsd = deal.value_cents != null ? `$${(deal.value_cents / 100).toLocaleString()}` : "unknown";

    return [
      "ACTIVE DEAL CONTEXT:",
      `- Deal: ${deal.name} (${deal.id})`,
      `- Company: ${deal.company || "—"}`,
      `- Stage: ${deal.stage || "—"} · probability ${deal.probability ?? "—"}%`,
      `- Value: ${valueUsd}`,
      `- Expected close: ${deal.expected_close_at || "—"}`,
      `- Last updated: ${deal.updated_at || "—"}`,
      eventLines ? `RECENT EVENTS:\n${eventLines}` : "RECENT EVENTS: none",
    ].join("\n");
  }

  if (kind === "pipeline") {
    const summary = await db
      .prepare(
        "SELECT stage, COUNT(*) AS count, SUM(value_cents) AS total_cents FROM deals GROUP BY stage ORDER BY count DESC",
      )
      .all<{ stage: string | null; count: number; total_cents: number | null }>()
      .catch(() => ({ results: [] as Array<{ stage: string | null; count: number; total_cents: number | null }> }));

    const lines = (summary.results || [])
      .map((r) => `- ${r.stage || "unstaged"}: ${r.count} deals · $${((r.total_cents ?? 0) / 100).toLocaleString()}`)
      .join("\n");

    return ["PIPELINE CONTEXT (live snapshot):", lines || "- (no deals in pipeline)"].join("\n");
  }

  const dealCount = await db.prepare("SELECT COUNT(*) AS n FROM deals").first<{ n: number }>().catch(() => null);
  const leadCount = await db.prepare("SELECT COUNT(*) AS n FROM leads").first<{ n: number }>().catch(() => null);
  return [
    "WORKSPACE CONTEXT (live snapshot):",
    `- Active deals: ${dealCount?.n ?? "—"}`,
    `- Active leads: ${leadCount?.n ?? "—"}`,
  ].join("\n");
}

function buildSystemPrompt(contextBlock: string): string {
  return [
    "You are ADGA, an autonomous deal-and-pipeline operator embedded inside the ADGA Suite for senior dealmakers.",
    "You speak with calm authority. You are direct, specific, and finish thoughts in one or two sentences.",
    "You never invent revenue, names, or commitments. If you do not know, say so and propose how to find out.",
    "When the user implies a structured map mutation (add a contact, link a company, create a task, advance a stage), append a fenced ```json``` code block at the end with shape: {\"actions\":[{\"type\":\"add_node\",\"kind\":\"contact\",\"label\":\"...\",\"sublabel\":\"...\"}]} or {\"type\":\"add_task\",\"label\":\"...\"} etc. Only include the block when an action is actually proposed.",
    "Keep the visible reply free of JSON. Use plain text with optional **bold** or *italic* for emphasis. Do not use headings or bullet lists unless explicitly asked.",
    "",
    contextBlock,
  ].join("\n");
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);

  try {
    requireAdmin(context);
  } catch (response) {
    if (response instanceof Response) return response;
    return errorJson("Forbidden", 403);
  }

  const rawBody = await readJson<Record<string, unknown>>(request);
  const parsed = BodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorJson("Invalid request body.", 400, parsed.error.issues);
  }

  const rateKey = context.user.email || request.headers.get("x-forwarded-for") || "anon";
  if (!checkRateLimit(rateKey)) {
    return errorJson("Rate limit reached. Please slow down.", 429);
  }

  const contextBlock = await buildContextBlock(context.env.DB, parsed.data.context);
  const systemPrompt = buildSystemPrompt(contextBlock);

  const messages: ChatMessage[] = parsed.data.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const result = await runChatTurn(
    { AI: context.env.AI, ADGA_AI_MODEL: context.env.ADGA_AI_MODEL },
    { systemPrompt, messages },
  );

  return json({
    ok: true,
    message: result.message,
    actions: result.actions,
    meta: {
      model: result.model,
      source: result.source,
    },
  });
}
