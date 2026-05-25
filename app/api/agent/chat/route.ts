import { z } from "zod";

import { publish } from "@/lib/events/bus";
import { runChatTurn, type ChatMessage } from "@/lib/agents/engine";
import { EXPLICIT_APPROVAL_ACTIONS } from "@/lib/agents/prepared-actions";
import { errorJson, json, readJson } from "@/lib/server/http";
import {
  createAgentApproval,
  createDeal,
  createDealFlow,
  createDealFlowEdge,
  createDealFlowNode,
  getDealFlow,
  updateDeal,
  updateDealFlow,
  updateDealFlowNode,
  type DealFlowNodeKind,
  type DealFlowNodeStatus,
} from "@/lib/server/repository";
import { getRuntimeContext } from "@/lib/server/runtime";
import { resolveTenantSession } from "@/lib/server/tenant";
import { formatSearchContext, searchWorkspace } from "@/lib/server/workspace-search";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(8000),
});

const ContextSchema = z
  .object({
    kind: z.enum(["deal", "pipeline", "workspace", "dealflow", "map"]),
    id: z.string().min(1).max(120).optional(),
    dealFlowId: z.string().min(1).max(120).optional(),
    route: z.string().min(1).max(60).optional(),
    deal: z
      .object({
        id: z.string().min(1).max(120),
        name: z.string().max(240).optional(),
        stage: z.string().max(60).optional(),
        value: z.string().max(60).optional(),
        nextAction: z.string().max(240).optional(),
      })
      .optional(),
    nodeCount: z.number().int().min(0).max(10_000).optional(),
    edgeCount: z.number().int().min(0).max(10_000).optional(),
    viewMode: z.string().min(1).max(80).optional(),
    selectedNode: z
      .object({
        id: z.string().min(1).max(160),
        kind: z.string().min(1).max(80).optional().nullable(),
        label: z.string().min(1).max(240).optional().nullable(),
        sublabel: z.string().max(240).optional().nullable(),
        status: z.string().max(80).optional().nullable(),
      })
      .optional()
      .nullable(),
  })
  .optional();

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(40),
  context: ContextSchema,
});

const NODE_KINDS = [
  "deal",
  "group",
  "contact",
  "company",
  "bank",
  "document",
  "email",
  "website",
  "audio",
  "video",
  "task",
  "call",
  "call_step",
  "meeting",
  "journey_step",
  "invoice",
  "financial",
  "action",
] as const;
const NODE_STATUSES = ["neutral", "active", "warning", "overdue", "done"] as const;
const DEAL_STAGES = new Set(["lead", "qualify", "discover", "scope", "design", "close", "sign", "deliver", "expand", "won", "lost"]);
const EXTERNAL_ACTIONS = new Set([
  "call_external",
  "collect_payment",
  "create_payment_link",
  "edit_legal_document",
  "mark_invoice_paid",
  "process_payment",
  "send_email",
  "send_invoice",
  "send_sms",
  "execute_legal_document",
  "file_legal_document",
  "sign_contract",
  "start_call",
  "void_invoice",
]);
const DESTRUCTIVE_ACTIONS = new Set([
  "archive_calendar_event",
  "archive_dealflow",
  "archive_edge",
  "archive_node",
  "delete_calendar_event",
  "delete_dealflow",
  "delete_edge",
  "delete_map",
  "delete_node",
  "delete_record",
  "destroy_record",
  "remove_edge",
  "remove_node",
]);

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
  ctx:
    | {
        kind: "deal" | "pipeline" | "workspace" | "dealflow" | "map";
        id?: string;
        dealFlowId?: string;
        route?: string;
        deal?: { id: string; name?: string; stage?: string; value?: string; nextAction?: string };
        nodeCount?: number;
        edgeCount?: number;
        viewMode?: string;
        selectedNode?: { id: string; kind?: string | null; label?: string | null; sublabel?: string | null; status?: string | null } | null;
      }
    | undefined,
): Promise<string> {
  if (!db) {
    if ((ctx?.kind === "dealflow" || ctx?.kind === "map") && ctx.deal) {
      const lines = [
        "ACTIVE DEALFLOW CONTEXT (no live DB bound):",
        `- Dealflow: ${ctx.deal.name || ctx.deal.id}`,
        ctx.deal.stage ? `- Stage: ${ctx.deal.stage}` : null,
        ctx.deal.value ? `- Value: ${ctx.deal.value}` : null,
        ctx.deal.nextAction ? `- Next action: ${ctx.deal.nextAction}` : null,
        ctx.nodeCount != null ? `- Nodes on canvas: ${ctx.nodeCount}` : null,
        ctx.edgeCount != null ? `- Edges on canvas: ${ctx.edgeCount}` : null,
      ].filter(Boolean);
      return lines.join("\n");
    }
    return "Live database is not bound in this environment. Respond using general business judgement.";
  }

  const kind = ctx?.kind ?? "workspace";

  if (kind === "dealflow" || kind === "map") {
    const headerLines: string[] = ["ACTIVE DEALFLOW CONTEXT:"];
    if (ctx?.deal) {
      headerLines.push(`- Dealflow / deal: ${ctx.deal.name || ctx.deal.id}`);
      if (ctx.deal.stage) headerLines.push(`- Stage: ${ctx.deal.stage}`);
      if (ctx.deal.value) headerLines.push(`- Value: ${ctx.deal.value}`);
      if (ctx.deal.nextAction) headerLines.push(`- Next action: ${ctx.deal.nextAction}`);
    }
    if (ctx?.dealFlowId) headerLines.push(`- Dealflow id: ${ctx.dealFlowId}`);
    if (ctx?.nodeCount != null) headerLines.push(`- Nodes on canvas: ${ctx.nodeCount}`);
    if (ctx?.edgeCount != null) headerLines.push(`- Edges on canvas: ${ctx.edgeCount}`);
    if (ctx?.viewMode) headerLines.push(`- Active DealFlow view: ${ctx.viewMode}`);
    if (ctx?.selectedNode) {
      headerLines.push(
        [
          "SELECTED NODE:",
          `- ${ctx.selectedNode.label || ctx.selectedNode.id}`,
          ctx.selectedNode.kind ? `- Type: ${ctx.selectedNode.kind}` : null,
          ctx.selectedNode.sublabel ? `- Detail: ${ctx.selectedNode.sublabel}` : null,
          ctx.selectedNode.status ? `- Status: ${ctx.selectedNode.status}` : null,
        ].filter(Boolean).join("\n"),
      );
    }

    const dealId = ctx?.deal?.id;
    if (dealId) {
      const events = await db
        .prepare(
          "SELECT event_type, resource_type, resource_id, created_at FROM events WHERE resource_type = 'deal' AND resource_id = ? ORDER BY created_at DESC LIMIT 6",
        )
        .bind(dealId)
        .all<EventRow>()
        .catch(() => ({ results: [] as EventRow[] }));
      const eventLines = (events.results || []).map((e) => `- ${e.created_at} ${e.event_type}`).join("\n");
      if (eventLines) headerLines.push(`RECENT EVENTS:\n${eventLines}`);
    }

    return headerLines.join("\n");
  }

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
  const onMap = contextBlock.startsWith("ACTIVE DEALFLOW CONTEXT") || contextBlock.startsWith("ACTIVE MAP CONTEXT");
  return [
    "You are ADGA, an autonomous deal-and-pipeline operator embedded inside the ADGA Suite for senior dealmakers.",
    "You speak with calm authority. You are direct, specific, and finish thoughts in one or two sentences.",
    "You never invent revenue, names, or commitments. If you do not know, say so and propose how to find out.",
    onMap
      ? "The user is currently looking at dealflow, a canvas of people, files, calls, tasks, and meetings. Reference what is on the canvas. Suggest the next node to add when the next move is obvious."
      : "The user is in the suite workspace (lists, pipeline, inbox). Reference live data, not the canvas.",
    "When the user implies a structured internal mutation, append a fenced ```json``` code block at the end with an actions array. Supported actions: create_deal, update_deal, create_dealflow, update_dealflow, add_node, update_node, archive_node, add_edge, search_workspace. Later actions may reference earlier resources with ref/temp_id values such as \"deal\", \"dealflow\", \"contact_node\", or \"next_step_node\". Use add_node kinds: contact, company, bank, document, email, website, audio, video, task, call, call_step, meeting, journey_step, invoice, financial, action, or group. Use group for large collections, for example {\"actions\":[{\"type\":\"add_node\",\"kind\":\"group\",\"label\":\"Banks & lenders\",\"sublabel\":\"Capital sources tied to this deal\",\"data\":{\"child_kind\":\"bank\",\"children_count\":12}}]}. Use group nodes for the 9-step customer journey and 9-step call framework instead of dumping every child onto the canvas.",
    "Never execute or imply execution of external email/SMS/calls, invoice/payment actions, legal document edits, or destructive actions from chat. For send_email, send_sms, call_external, start_call, send_invoice, collect_payment, process_payment, create_payment_link, mark_invoice_paid, edit_legal_document, sign_contract, execute_legal_document, file_legal_document, delete_node, remove_node, delete_edge, remove_edge, delete_dealflow, and delete_record, only prepare them for explicit approval. Destructive requests must be converted to archive actions.",
    "Keep the visible reply free of JSON. Use plain text with optional **bold** or *italic* for emphasis. Do not use headings or bullet lists unless explicitly asked.",
    "",
    contextBlock,
  ].join("\n");
}

function latestUserMessage(messages: Array<{ role: string; content: string }>) {
  return [...messages].reverse().find((message) => message.role === "user")?.content || "";
}

type ChatActionRecord = { type: string; [key: string]: unknown };

interface ChatActionExecution {
  status: "executed" | "blocked" | "failed" | "skipped";
  action_type: string;
  resource_type?: string;
  resource_id?: string;
  message: string;
  data?: Record<string, unknown>;
}

interface ChatActionState {
  lastDealId?: string;
  lastDealFlowId?: string;
  refs: Map<string, string>;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullableString(value: unknown): string | null {
  const text = stringValue(value);
  return text || null;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/[$,]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function moneyCents(value: unknown): number | undefined {
  const numeric = numberValue(value);
  if (numeric === undefined) return undefined;
  return Math.round(numeric * 100);
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function registerRef(state: ChatActionState, ref: unknown, id: string) {
  const key = stringValue(ref).toLowerCase();
  if (key) state.refs.set(key, id);
}

function resolveRef(value: unknown, state: ChatActionState): string {
  const text = stringValue(value);
  if (!text) return "";
  return state.refs.get(text.toLowerCase()) || text;
}

function registerActionRefs(state: ChatActionState, action: ChatActionRecord, id: string, fallbackRefs: string[] = []) {
  for (const ref of [
    action.ref,
    action.temp_id,
    action.tempId,
    action.key,
    action.alias,
    action.id,
    action.label,
    action.name,
    action.title,
    ...fallbackRefs,
  ]) {
    registerRef(state, ref, id);
  }
}

function actionDealFlowId(action: ChatActionRecord, ctx: z.infer<typeof ContextSchema>, state: ChatActionState): string {
  return (
    resolveRef(action.dealFlowId, state) ||
    resolveRef(action.dealflow_id, state) ||
    resolveRef(action.deal_flow_id, state) ||
    resolveRef(action.map_id, state) ||
    stringValue(action.dealFlowId) ||
    stringValue(action.dealflow_id) ||
    stringValue(action.deal_flow_id) ||
    stringValue(action.map_id) ||
    state.lastDealFlowId ||
    ctx?.dealFlowId ||
    (ctx?.kind === "dealflow" || ctx?.kind === "map" ? ctx.id || "" : "")
  );
}

function archivePreparedActionFor(action: ChatActionRecord, context: z.infer<typeof ContextSchema>, state: ChatActionState): Record<string, unknown> | null {
  const type = action.type.trim();
  if (type === "delete_node" || type === "remove_node" || type === "archive_node") {
    const dealflowId = actionDealFlowId(action, context, state);
    const nodeId = resolveRef(action.node_id || action.nodeId || action.id, state) || context?.selectedNode?.id || "";
    return dealflowId && nodeId ? { type: "archive_dealflow_node", dealflow_id: dealflowId, node_id: nodeId } : null;
  }
  if (type === "delete_edge" || type === "remove_edge" || type === "archive_edge") {
    const dealflowId = actionDealFlowId(action, context, state);
    const edgeId = resolveRef(action.edge_id || action.edgeId || action.id, state);
    return dealflowId && edgeId ? { type: "archive_dealflow_edge", dealflow_id: dealflowId, edge_id: edgeId } : null;
  }
  if (type === "delete_dealflow" || type === "delete_map" || type === "archive_dealflow") {
    const dealflowId = actionDealFlowId(action, context, state);
    return dealflowId ? { type: "archive_dealflow", dealflow_id: dealflowId } : null;
  }
  if (type === "delete_calendar_event" || type === "archive_calendar_event") {
    const eventId = resolveRef(action.event_id || action.eventId || action.id, state);
    return eventId ? { type: "archive_calendar_event", event_id: eventId } : null;
  }
  return null;
}

async function queuePreparedApproval(input: {
  db: D1Database | undefined;
  action: ChatActionRecord;
  context: z.infer<typeof ContextSchema>;
  actorEmail: string | null;
  organizationId: string;
  state: ChatActionState;
}): Promise<ChatActionExecution> {
  const type = input.action.type.trim();
  const archiveAction = archivePreparedActionFor(input.action, input.context, input.state);
  const preparedAction = archiveAction || input.action;
  const resourceId =
    stringValue(input.action.resource_id) ||
    stringValue(input.action.node_id || input.action.edge_id || input.action.event_id || input.action.id) ||
    input.context?.selectedNode?.id ||
    input.context?.id ||
    null;
  const approval = await createAgentApproval(input.db, {
    organization_id: input.organizationId,
    agent: "conductor",
    title: `Approval required: ${type}`,
    proposed_action: archiveAction
      ? "Archive requested records after approval. Destructive deletes are not allowed."
      : "Approve the prepared risky action before any external, financial, legal, or destructive effect occurs.",
    risk: "high",
    resource_type: stringValue(input.action.resource_type) || (archiveAction ? "dealflow" : "workspace"),
    resource_id: resourceId,
    payload: {
      source: "agent_chat",
      original_action: input.action,
      prepared_action: preparedAction,
      requested_by: input.actorEmail,
      approval_policy: "explicit_approval_required",
    },
  });

  await publish(input.db, {
    organization_id: input.organizationId,
    event_type: "agent_approval.requested",
    actor_type: "user",
    actor_id: input.actorEmail,
    resource_type: "agent_approval",
    resource_id: approval.id,
    payload: { approval_id: approval.id, action_type: type, prepared_action: preparedAction },
  });

  return {
    status: "blocked",
    action_type: type,
    resource_type: "agent_approval",
    resource_id: approval.id,
    message: archiveAction
      ? "Destructive action queued as an archive approval; no delete ran from chat."
      : "Risky action queued for explicit approval; nothing was executed from chat.",
  };
}

function normalizeNodeKind(value: unknown): DealFlowNodeKind | null {
  return NODE_KINDS.includes(value as DealFlowNodeKind) ? (value as DealFlowNodeKind) : null;
}

function normalizeNodeStatus(value: unknown): DealFlowNodeStatus | null | undefined {
  if (value == null || value === "") return undefined;
  return NODE_STATUSES.includes(value as DealFlowNodeStatus) ? (value as DealFlowNodeStatus) : null;
}

function normalizeDealPatch(action: ChatActionRecord) {
  const patch: {
    name?: string;
    contact_id?: string | null;
    company?: string | null;
    value_cents?: number;
    stage?: string;
    probability?: number;
    expected_close_at?: string | null;
  } = {};
  const name = stringValue(action.name);
  const contactId = nullableString(action.contact_id);
  const company = nullableString(action.company);
  const valueCents = action.value_cents === undefined ? moneyCents(action.value) : numberValue(action.value_cents);
  const stage = stringValue(action.stage).toLowerCase();
  const probability = numberValue(action.probability ?? action.prob);
  const expectedCloseAt = nullableString(action.expected_close_at ?? action.close ?? action.close_date);

  if (name) patch.name = name;
  if (action.contact_id !== undefined) patch.contact_id = contactId;
  if (action.company !== undefined) patch.company = company;
  if (valueCents !== undefined) patch.value_cents = Math.max(0, Math.round(valueCents));
  if (stage && DEAL_STAGES.has(stage)) patch.stage = stage;
  if (probability !== undefined) patch.probability = Math.max(0, Math.min(100, Math.round(probability)));
  if (action.expected_close_at !== undefined || action.close !== undefined || action.close_date !== undefined) {
    patch.expected_close_at = expectedCloseAt;
  }
  return patch;
}

function parseActionJson(content: string): ChatActionRecord[] {
  const candidates: string[] = [];
  const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) candidates.push(fenceMatch[1]);
  const jsonLineMatch = content.match(/\{\s*"actions"\s*:\s*\[[\s\S]*?\]\s*\}\s*$/);
  if (jsonLineMatch) candidates.push(jsonLineMatch[0]);

  for (const raw of candidates) {
    try {
      const parsed = JSON.parse(raw.trim()) as { actions?: unknown };
      if (Array.isArray(parsed.actions)) {
        return parsed.actions.filter(
          (action: unknown): action is ChatActionRecord =>
            Boolean(action) && typeof action === "object" && typeof (action as { type?: unknown }).type === "string",
        );
      }
    } catch {
      // Keep looking for another valid candidate.
    }
  }
  return [];
}

function extractNamedValue(text: string, noun: string): string {
  const pattern = new RegExp(`${noun}[^\\n.;:]*?(?:called|named|for)\\s+["“]?([^"”\\n.;]+)`, "i");
  return stringValue(text.match(pattern)?.[1]).replace(/\s+(with|and|plus|then)\s*$/i, "");
}

function parseNodeRequests(text: string): ChatActionRecord[] {
  const match = text.match(/nodes?\s*(?::|for|with)\s*([^.\n]+)/i);
  if (!match) return [];

  const parts = match[1]
    .split(/[,;]|\band\b/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 8);

  return parts
    .map((part, index): ChatActionRecord | null => {
      const nodeMatch = part.match(/^(contact|company|bank|document|email|website|audio|video|task|call|call_step|meeting|journey_step|invoice|financial|action|group)\s+(?:node\s+)?(?:called|named|for\s+)?(.+)$/i);
      if (!nodeMatch) return null;
      const kind = nodeMatch[1].toLowerCase() as DealFlowNodeKind;
      const label = stringValue(nodeMatch[2]).replace(/^["“]|["”]$/g, "");
      if (!label) return null;
      return {
        type: "add_node",
        kind,
        label,
        ref: index === 0 ? `${kind}_node` : `${kind}_node_${index + 1}`,
        status: kind === "task" || kind === "action" ? "active" : "neutral",
      };
    })
    .filter((action): action is ChatActionRecord => Boolean(action));
}

function actionDedupeKey(action: ChatActionRecord): string {
  return [
    stringValue(action.type).toLowerCase(),
    stringValue(action.kind).toLowerCase(),
    stringValue(action.dealflow_id ?? action.dealFlowId ?? action.deal_flow_id ?? action.map_id).toLowerCase(),
    stringValue(action.node_id ?? action.nodeId ?? action.id).toLowerCase(),
    stringValue(action.label ?? action.name ?? action.title ?? action.query).toLowerCase(),
  ].join(":");
}

function dedupeActions(actions: ChatActionRecord[]): ChatActionRecord[] {
  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = actionDedupeKey(action);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function inferredServerActions(messages: ChatMessage[], context: z.infer<typeof ContextSchema>, modelActions: Array<{ type: string }>): ChatActionRecord[] {
  const latest = latestUserMessage(messages);
  const explicitActions = parseActionJson(latest);
  if (explicitActions.length) return dedupeActions(explicitActions);

  const actions = modelActions.map((action) => action as ChatActionRecord);
  const lower = latest.toLowerCase();
  if (actions.length === 0 && lower.includes("create") && lower.includes("deal")) {
    const dealName = extractNamedValue(latest, "deal") || extractNamedValue(latest, "opportunity") || stringValue(context?.deal?.name) || "ADGA chat deal";
    actions.push({ type: "create_deal", name: dealName, ref: "deal" });

    if (lower.includes("dealflow") || lower.includes("deal flow") || lower.includes("canvas")) {
      const dealFlowName = extractNamedValue(latest, "dealflow") || extractNamedValue(latest, "deal flow") || `${dealName} DealFlow`;
      actions.push({ type: "create_dealflow", name: dealFlowName, deal_id: "deal", ref: "dealflow" });
    }

    actions.push(...parseNodeRequests(latest));
  }

  if ((lower.includes("search") || lower.includes("find")) && lower.includes("next step")) {
    actions.push({ type: "search_workspace", query: extractNamedValue(latest, "next step") || context?.deal?.nextAction || "next step" });
  }

  return dedupeActions(actions);
}

async function executeChatAction(input: {
  env: CloudflareEnv;
  action: ChatActionRecord;
  context: z.infer<typeof ContextSchema>;
  actorEmail: string | null;
  organizationId: string;
  index: number;
  state: ChatActionState;
}): Promise<ChatActionExecution> {
  const { action, env, context, actorEmail, organizationId, index, state } = input;
  const db = env.DB;
  const type = action.type.trim();

  if (EXTERNAL_ACTIONS.has(type) || EXPLICIT_APPROVAL_ACTIONS.has(type) || DESTRUCTIVE_ACTIONS.has(type)) {
    return queuePreparedApproval({ db, action, context, actorEmail, organizationId, state });
  }

  if (type === "create_deal") {
    const name = stringValue(action.name || action.label);
    if (!name) return { status: "skipped", action_type: type, message: "create_deal requires a name." };
    const deal = await createDeal(db, {
      ...normalizeDealPatch(action),
      id: stringValue(action.id) || undefined,
      organization_id: organizationId,
      name,
    });
    await publish(db, {
      organization_id: organizationId,
      event_type: "deal.created",
      actor_type: "user",
      actor_id: actorEmail,
      resource_type: "deal",
      resource_id: deal.id,
      payload: { source: "agent_chat", deal_id: deal.id },
    });
    state.lastDealId = deal.id;
    registerActionRefs(state, action, deal.id, ["deal", "last_deal"]);
    return { status: "executed", action_type: type, resource_type: "deal", resource_id: deal.id, message: "Deal created." };
  }

  if (type === "update_deal" || type === "update_deal_stage") {
    const dealId = resolveRef(action.deal_id || action.dealId || action.id, state) || state.lastDealId || context?.deal?.id || (context?.kind === "deal" ? context.id || "" : "");
    if (!dealId) return { status: "skipped", action_type: type, message: "update_deal requires a deal id." };
    const patch = normalizeDealPatch(action);
    if (type === "update_deal_stage" && !patch.stage) {
      const stage = stringValue(action.stage).toLowerCase();
      if (DEAL_STAGES.has(stage)) patch.stage = stage;
    }
    if (Object.keys(patch).length === 0) return { status: "skipped", action_type: type, message: "update_deal had no supported fields." };
    const deal = await updateDeal(db, dealId, organizationId, patch);
    if (!deal) return { status: "failed", action_type: type, resource_type: "deal", resource_id: dealId, message: "Deal not found." };
    await publish(db, {
      organization_id: organizationId,
      event_type: patch.stage ? "deal.stage_changed" : "deal.updated",
      actor_type: "user",
      actor_id: actorEmail,
      resource_type: "deal",
      resource_id: deal.id,
      payload: { source: "agent_chat", deal_id: deal.id, changed_fields: Object.keys(patch) },
    });
    state.lastDealId = deal.id;
    registerActionRefs(state, action, deal.id, ["deal", "last_deal"]);
    return { status: "executed", action_type: type, resource_type: "deal", resource_id: deal.id, message: "Deal updated." };
  }

  if (type === "create_dealflow" || type === "create_map") {
    const name = stringValue(action.name || action.label);
    if (!name) return { status: "skipped", action_type: type, message: "create_dealflow requires a name." };
    const dealFlow = await createDealFlow(db, {
      organization_id: organizationId,
      name,
      deal_id: resolveRef(action.deal_id ?? action.dealId, state) || state.lastDealId || context?.deal?.id || null,
      template: nullableString(action.template),
      created_by_user_id: actorEmail,
    });
    await publish(db, {
      organization_id: organizationId,
      event_type: "dealflow.created",
      actor_type: "user",
      actor_id: actorEmail,
      resource_type: "dealflow",
      resource_id: dealFlow.id,
      payload: { source: "agent_chat", dealflow_id: dealFlow.id },
    });
    state.lastDealFlowId = dealFlow.id;
    registerActionRefs(state, action, dealFlow.id, ["dealflow", "map", "last_dealflow"]);
    return { status: "executed", action_type: type, resource_type: "dealflow", resource_id: dealFlow.id, message: "DealFlow created." };
  }

  if (type === "update_dealflow" || type === "update_map") {
    const dealFlowId = actionDealFlowId(action, context, state);
    if (!dealFlowId) return { status: "skipped", action_type: type, message: "update_dealflow requires a DealFlow id." };
    const patch = {
      ...(action.name !== undefined ? { name: stringValue(action.name) } : {}),
      ...(action.deal_id !== undefined || action.dealId !== undefined ? { deal_id: resolveRef(action.deal_id ?? action.dealId, state) || null } : {}),
      ...(action.template !== undefined ? { template: nullableString(action.template) } : {}),
    };
    const dealFlow = await updateDealFlow(db, dealFlowId, organizationId, patch);
    if (!dealFlow) return { status: "failed", action_type: type, resource_type: "dealflow", resource_id: dealFlowId, message: "DealFlow not found." };
    await publish(db, {
      organization_id: organizationId,
      event_type: "dealflow.updated",
      actor_type: "user",
      actor_id: actorEmail,
      resource_type: "dealflow",
      resource_id: dealFlow.id,
      payload: { source: "agent_chat", dealflow_id: dealFlow.id, changed_fields: Object.keys(patch) },
    });
    state.lastDealFlowId = dealFlow.id;
    registerActionRefs(state, action, dealFlow.id, ["dealflow", "map", "last_dealflow"]);
    return { status: "executed", action_type: type, resource_type: "dealflow", resource_id: dealFlow.id, message: "DealFlow updated." };
  }

  if (type === "add_node" || type === "create_node") {
    const dealFlowId = actionDealFlowId(action, context, state);
    if (!dealFlowId) return { status: "skipped", action_type: type, message: "add_node requires a DealFlow id." };
    const existing = await getDealFlow(db, dealFlowId, organizationId);
    if (!existing) return { status: "failed", action_type: type, resource_type: "dealflow", resource_id: dealFlowId, message: "DealFlow not found." };
    const kind = normalizeNodeKind(action.kind);
    const label = stringValue(action.label || action.name || action.title);
    if (!kind || !label) return { status: "skipped", action_type: type, message: "add_node requires a supported kind and label." };
    const status = normalizeNodeStatus(action.status);
    if (status === null) return { status: "skipped", action_type: type, message: "add_node has an unsupported status." };
    const node = await createDealFlowNode(db, dealFlowId, {
      id: stringValue(action.id) || undefined,
      kind,
      label,
      sublabel: nullableString(action.sublabel || action.subtitle || action.detail),
      status: status ?? null,
      position_x: numberValue(action.position_x ?? action.x) ?? 160 + ((context?.nodeCount ?? 0) + index) * 32,
      position_y: numberValue(action.position_y ?? action.y) ?? 160 + ((context?.nodeCount ?? 0) + index) * 24,
      data: objectValue(action.data),
    });
    await publish(db, {
      organization_id: organizationId,
      event_type: "dealflow.node_added",
      actor_type: "user",
      actor_id: actorEmail,
      resource_type: "dealflow_node",
      resource_id: node.id,
      payload: { source: "agent_chat", dealflow_id: dealFlowId, node_id: node.id, kind },
    });
    registerActionRefs(state, action, node.id, [`${kind}_node`, "last_node"]);
    return { status: "executed", action_type: type, resource_type: "dealflow_node", resource_id: node.id, message: "DealFlow node added." };
  }

  if (type === "update_node") {
    const dealFlowId = actionDealFlowId(action, context, state);
    const nodeId = resolveRef(action.node_id || action.nodeId || action.id, state) || context?.selectedNode?.id || "";
    if (!dealFlowId || !nodeId) return { status: "skipped", action_type: type, message: "update_node requires a DealFlow id and node id." };
    const kind = action.kind === undefined ? undefined : normalizeNodeKind(action.kind);
    const status = normalizeNodeStatus(action.status);
    if (kind === null || status === null) return { status: "skipped", action_type: type, message: "update_node has an unsupported kind or status." };
    const patch = {
      ...(action.label !== undefined || action.name !== undefined || action.title !== undefined ? { label: stringValue(action.label || action.name || action.title) } : {}),
      ...(action.sublabel !== undefined || action.subtitle !== undefined || action.detail !== undefined ? { sublabel: nullableString(action.sublabel || action.subtitle || action.detail) } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(action.position_x !== undefined || action.x !== undefined ? { position_x: numberValue(action.position_x ?? action.x) ?? 0 } : {}),
      ...(action.position_y !== undefined || action.y !== undefined ? { position_y: numberValue(action.position_y ?? action.y) ?? 0 } : {}),
      ...(kind !== undefined ? { kind } : {}),
      ...(action.data !== undefined ? { data: objectValue(action.data) } : {}),
    };
    const node = await updateDealFlowNode(db, dealFlowId, nodeId, patch);
    if (!node) return { status: "failed", action_type: type, resource_type: "dealflow_node", resource_id: nodeId, message: "Node not found." };
    await publish(db, {
      organization_id: organizationId,
      event_type: "dealflow.node_updated",
      actor_type: "user",
      actor_id: actorEmail,
      resource_type: "dealflow_node",
      resource_id: node.id,
      payload: { source: "agent_chat", dealflow_id: dealFlowId, node_id: node.id, changed_fields: Object.keys(patch) },
    });
    registerActionRefs(state, action, node.id, [`${node.kind}_node`, "last_node"]);
    return { status: "executed", action_type: type, resource_type: "dealflow_node", resource_id: node.id, message: "DealFlow node updated." };
  }

  if (type === "add_edge" || type === "create_edge") {
    const dealFlowId = actionDealFlowId(action, context, state);
    const sourceNodeId = resolveRef(action.source_node_id || action.sourceNodeId || action.source, state);
    const targetNodeId = resolveRef(action.target_node_id || action.targetNodeId || action.target, state);
    if (!dealFlowId || !sourceNodeId || !targetNodeId) return { status: "skipped", action_type: type, message: "add_edge requires a DealFlow id, source node id, and target node id." };
    if (sourceNodeId === targetNodeId) return { status: "skipped", action_type: type, message: "add_edge source and target must differ." };
    const existing = await getDealFlow(db, dealFlowId, organizationId);
    if (!existing) return { status: "failed", action_type: type, resource_type: "dealflow", resource_id: dealFlowId, message: "DealFlow not found." };
    const edge = await createDealFlowEdge(db, dealFlowId, {
      id: stringValue(action.id) || undefined,
      source_node_id: sourceNodeId,
      target_node_id: targetNodeId,
      label: nullableString(action.label),
      style: action.style === undefined ? null : objectValue(action.style),
    });
    await publish(db, {
      organization_id: organizationId,
      event_type: "dealflow.edge_added",
      actor_type: "user",
      actor_id: actorEmail,
      resource_type: "dealflow_edge",
      resource_id: edge.id,
      payload: { source: "agent_chat", dealflow_id: dealFlowId, edge_id: edge.id, source_node_id: sourceNodeId, target_node_id: targetNodeId },
    });
    registerActionRefs(state, action, edge.id, ["edge", "last_edge"]);
    return { status: "executed", action_type: type, resource_type: "dealflow_edge", resource_id: edge.id, message: "DealFlow edge added." };
  }

  if (type === "search_workspace" || type === "search_next_step") {
    const query =
      stringValue(action.query) ||
      stringValue(action.next_step) ||
      stringValue(action.nextStep) ||
      context?.deal?.nextAction ||
      stringValue(action.label) ||
      "next step";
    if (!env.DB) {
      return {
        status: "executed",
        action_type: type,
        message: "Workspace search prepared; live DB is not bound in this environment.",
        data: {
          query,
          refs: Object.fromEntries(state.refs),
          last_deal_id: state.lastDealId,
          last_dealflow_id: state.lastDealFlowId,
        },
      };
    }
    const search = await searchWorkspace(env, { query, organizationId: organizationId, limit: 5 });
    return {
      status: "executed",
      action_type: type,
      message: search.results.length ? `Found ${search.results.length} workspace result(s).` : "No workspace results found.",
      data: {
        query: search.query,
        results: search.results.map((result) => ({
          type: result.type,
          id: result.id,
          title: result.title,
          url: result.url,
          score: result.score,
        })),
      },
    };
  }

  return { status: "blocked", action_type: type, message: `Unsupported chat action type: ${type}.` };
}

async function executeChatActions(input: {
  env: CloudflareEnv;
  actions: Array<{ type: string }>;
  context: z.infer<typeof ContextSchema>;
  actorEmail: string | null;
  organizationId: string;
}): Promise<ChatActionExecution[]> {
  const results: ChatActionExecution[] = [];
  const state: ChatActionState = { refs: new Map() };
  for (const [index, action] of input.actions.entries()) {
    try {
      results.push(await executeChatAction({ ...input, action: action as ChatActionRecord, index, state }));
    } catch (error) {
      results.push({
        status: "failed",
        action_type: action.type,
        message: error instanceof Error ? error.message : "Chat action execution failed.",
      });
    }
  }
  return results;
}

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  const tenant = await resolveTenantSession(context, request);
  if (!tenant) return errorJson("Authentication required.", 401);
  if (tenant.role !== "owner" && tenant.role !== "admin") return errorJson("Forbidden", 403);

  const rawBody = await readJson<Record<string, unknown>>(request);
  const parsed = BodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorJson("Invalid request body.", 400, parsed.error.issues);
  }

  const rateKey = tenant.email || request.headers.get("x-forwarded-for") || "anon";
  if (!checkRateLimit(rateKey)) {
    return errorJson("Rate limit reached. Please slow down.", 429);
  }

  const baseContextBlock = await buildContextBlock(context.env.DB, parsed.data.context);
  const retrieval = await searchWorkspace(context.env, {
    query: latestUserMessage(parsed.data.messages),
    organizationId: tenant.organizationId,
    limit: 5,
  }).catch(() => null);
  const retrievalBlock = retrieval ? formatSearchContext(retrieval, 5) : "";
  const contextBlock = [baseContextBlock, retrievalBlock].filter(Boolean).join("\n\n");
  const systemPrompt = buildSystemPrompt(contextBlock);

  const messages: ChatMessage[] = parsed.data.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const result = await runChatTurn(
    { AI: context.env.AI, ADGA_AI_MODEL: context.env.ADGA_AI_MODEL },
    { systemPrompt, messages },
  );
  const actions = inferredServerActions(messages, parsed.data.context, result.actions);
  const actionResults = await executeChatActions({
    env: context.env,
    actions,
    context: parsed.data.context,
    actorEmail: tenant.email,
    organizationId: tenant.organizationId,
  });

  return json({
    ok: true,
    message: result.message,
    actions,
    action_results: actionResults,
    meta: {
      model: result.model,
      source: result.source,
    },
  });
}
