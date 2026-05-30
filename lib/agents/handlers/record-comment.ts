// Communication handler: skills/record-comment.skill.md
//
// Threaded comments + @mentions on any record (contact, lead, deal,
// organization, custom object). Replaces "let's chat about this deal in
// Slack" with a persistent thread the next operator can read.
//
// State contract:    cloudflare/state/record-comment.schema.json
// Materialized in:   cloudflare/db/migrations/0030_record_comments.sql
// Notification path: lib/integrations/postmark.ts (reuses approval-notify pattern)
//
// Tenant isolation:
//   Every read/write filters on organization_id. Mention resolution is
//   restricted to org members — mentions of non-members are silently dropped
//   (per skill contract decision rules).
//
// Soft-delete only:
//   `delete` sets deleted_at + deleted_by. Body stays in DB for audit.
//   Event stream is the audit trail; body history is not versioned in-place.
//
// Edit window:
//   Within 15 minutes of created_at → body updated in place, edited_at set.
//   After 15 minutes              → body still updates, edited_at set. The
//   immutable audit trail is the event stream (record.comment.updated emits
//   on every edit), NOT the row.

import { publish } from "@/lib/events/bus";
import { newId, nowIso } from "@/lib/server/id";
import { sendPostmarkEmail } from "@/lib/integrations/postmark";
import type { SkillContext } from "@/lib/agents/skill-registry";

// ─── Types (must match stubs.ts shape) ───────────────────────────────────────

export type RecordResourceType =
  | "contact"
  | "lead"
  | "deal"
  | "organization"
  | "custom_object";

export interface RecordCommentInput {
  operation: "create" | "update" | "delete" | "list" | "react" | "notify_mention";
  comment?: {
    id: string | null;
    resource_type: RecordResourceType;
    resource_id: string;
    parent_comment_id: string | null;
    body: string;
    mentions: string[];
    custom_object_slug?: string | null;
  };
  reaction?: { comment_id: string; emoji: string; action: "add" | "remove" };
  // List query params
  resource_type?: RecordResourceType;
  resource_id?: string;
  cursor?: string | null;
  limit?: number | null;
  // Subscription-bound mention notify hints (set by buildSkillInputForBinding)
  _mentioned_user_id?: string;
  _mentioned_email?: string;
}

export interface RecordCommentOutput {
  comment_id: string | null;
  comments: Array<Record<string, unknown>> | null;
  next_cursor?: string | null;
  notify?: { sent: number; skipped: boolean } | null;
}

class HandlerError extends Error {
  constructor(public readonly reason: string, message?: string) {
    super(message || reason);
    this.name = "RecordCommentError";
  }
}

const RESOURCE_TYPES: ReadonlySet<RecordResourceType> = new Set<RecordResourceType>([
  "contact",
  "lead",
  "deal",
  "organization",
  "custom_object",
]);

const MAX_BODY_LENGTH = 4000;
const MAX_EMOJI_LENGTH = 12;
const EDIT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
// Match @email tokens in the body. Email regex is intentionally simple — we
// only use this to extract candidates; resolution against the users table is
// the real authority. Non-resolving mentions are silently dropped.
const MENTION_RE = /@([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function recordCommentHandler(
  context: SkillContext,
  input: RecordCommentInput,
): Promise<RecordCommentOutput> {
  if (!context.env.DB) {
    throw new HandlerError("d1_unavailable", "record-comment requires D1.");
  }
  await ensureRecordCommentsTable(context.env);

  switch (input.operation) {
    case "create":         return createComment(context, requireComment(input));
    case "update":         return updateComment(context, requireComment(input));
    case "delete":         return deleteComment(context, requireComment(input));
    case "list":           return listComments(context, input);
    case "react":          return reactComment(context, requireReaction(input));
    case "notify_mention": return notifyMention(context, input);
    default:
      throw new HandlerError("invalid_operation", `Unknown operation: ${String(input.operation)}`);
  }
}

function requireComment(input: RecordCommentInput): NonNullable<RecordCommentInput["comment"]> {
  if (!input.comment) throw new HandlerError("missing_required_field", "input.comment is required.");
  return input.comment;
}

function requireReaction(input: RecordCommentInput): NonNullable<RecordCommentInput["reaction"]> {
  if (!input.reaction) throw new HandlerError("missing_required_field", "input.reaction is required.");
  return input.reaction;
}

// ─── Create ──────────────────────────────────────────────────────────────────

async function createComment(
  context: SkillContext,
  comment: NonNullable<RecordCommentInput["comment"]>,
): Promise<RecordCommentOutput> {
  validateResourceType(comment.resource_type);
  validateBody(comment.body);

  // If reply, ensure parent exists in same org + same resource
  if (comment.parent_comment_id) {
    const parent = await loadCommentById(context, comment.parent_comment_id);
    if (!parent) {
      throw new HandlerError("parent_not_found", `parent_comment_id ${comment.parent_comment_id} not found.`);
    }
    if (parent.resource_type !== comment.resource_type || parent.resource_id !== comment.resource_id) {
      throw new HandlerError("parent_mismatch", "parent_comment_id is on a different resource.");
    }
    if (parent.deleted_at) {
      throw new HandlerError("parent_deleted", "cannot reply to a deleted comment.");
    }
  }

  // Resolve mentions: parse @emails, intersect with org members
  const mentionEmails = extractMentionEmails(comment.body);
  const resolvedMentions = mentionEmails.length > 0
    ? await resolveMentions(context, mentionEmails)
    : [];

  const id = newId("cmt");
  const now = nowIso();

  await context.env.DB!
    .prepare(
      `INSERT INTO record_comments (
         id, organization_id, resource_type, resource_id, custom_object_slug,
         parent_comment_id, body, mentions_json, reactions_json,
         created_by, created_at, edited_at, deleted_at, deleted_by
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .bind(
      id,
      context.organization_id,
      comment.resource_type,
      comment.resource_id,
      comment.custom_object_slug ?? null,
      comment.parent_comment_id ?? null,
      comment.body,
      JSON.stringify(resolvedMentions),
      JSON.stringify([]),
      context.actor_id || "unknown",
      now,
      null,
      null,
      null,
    )
    .run();

  await publish(context.env.DB, {
    organization_id: context.organization_id,
    event_type: "record.comment.created",
    actor_type: context.actor_type,
    actor_id: context.actor_id,
    resource_type: comment.resource_type,
    resource_id: comment.resource_id,
    payload: {
      comment_id: id,
      resource_type: comment.resource_type,
      resource_id: comment.resource_id,
      body_preview: previewBody(comment.body),
    },
  }).catch(() => null);

  // Per-mention notification event — bound back to this skill via
  // EVENT_SKILL_BINDINGS for delivery (notify_mention operation).
  for (const mention of resolvedMentions) {
    await publish(context.env.DB, {
      organization_id: context.organization_id,
      event_type: "record.comment.mentioned",
      actor_type: context.actor_type,
      actor_id: context.actor_id,
      resource_type: comment.resource_type,
      resource_id: comment.resource_id,
      payload: {
        comment_id: id,
        mentioned_user_id: mention.user_id,
        mentioned_email: mention.email,
      },
    }).catch(() => null);
  }

  const saved = await loadCommentById(context, id);
  return {
    comment_id: id,
    comments: saved ? [saved] : null,
  };
}

// ─── Update ──────────────────────────────────────────────────────────────────

async function updateComment(
  context: SkillContext,
  comment: NonNullable<RecordCommentInput["comment"]>,
): Promise<RecordCommentOutput> {
  if (!comment.id) {
    throw new HandlerError("missing_required_field", "comment.id is required for update.");
  }
  validateBody(comment.body);

  const existing = await loadCommentById(context, comment.id);
  if (!existing) {
    throw new HandlerError("not_found", `Comment ${comment.id} not found in this organization.`);
  }
  if (existing.deleted_at) {
    throw new HandlerError("comment_deleted", "cannot edit a deleted comment.");
  }

  // Edit window check — info-only. Per skill contract: after 15 min, body
  // still updates BUT edited_at marker is always set so the UI can show
  // "(edited)". Audit trail of body history lives in the event stream.
  const createdAtMs = Date.parse(String(existing.created_at));
  const beyondWindow = !Number.isNaN(createdAtMs) && (Date.now() - createdAtMs) > EDIT_WINDOW_MS;

  // Re-resolve mentions on edit (they may have changed)
  const mentionEmails = extractMentionEmails(comment.body);
  const resolvedMentions = mentionEmails.length > 0
    ? await resolveMentions(context, mentionEmails)
    : [];

  const now = nowIso();
  await context.env.DB!
    .prepare(
      `UPDATE record_comments
          SET body = ?, mentions_json = ?, edited_at = ?
        WHERE id = ? AND organization_id = ? AND deleted_at IS NULL`,
    )
    .bind(
      comment.body,
      JSON.stringify(resolvedMentions),
      now,
      comment.id,
      context.organization_id,
    )
    .run();

  await publish(context.env.DB, {
    organization_id: context.organization_id,
    event_type: "record.comment.updated",
    actor_type: context.actor_type,
    actor_id: context.actor_id,
    resource_type: String(existing.resource_type),
    resource_id: String(existing.resource_id),
    payload: {
      comment_id: comment.id,
      beyond_edit_window: beyondWindow,
    },
  }).catch(() => null);

  const saved = await loadCommentById(context, comment.id);
  return { comment_id: comment.id, comments: saved ? [saved] : null };
}

// ─── Delete ──────────────────────────────────────────────────────────────────

async function deleteComment(
  context: SkillContext,
  comment: NonNullable<RecordCommentInput["comment"]>,
): Promise<RecordCommentOutput> {
  if (!comment.id) {
    throw new HandlerError("missing_required_field", "comment.id is required for delete.");
  }

  const existing = await loadCommentById(context, comment.id);
  if (!existing) {
    throw new HandlerError("not_found", `Comment ${comment.id} not found in this organization.`);
  }
  if (existing.deleted_at) {
    // Idempotent — already deleted.
    return { comment_id: comment.id, comments: [existing] };
  }

  const now = nowIso();
  const actor = context.actor_id || "unknown";
  await context.env.DB!
    .prepare(
      `UPDATE record_comments
          SET deleted_at = ?, deleted_by = ?
        WHERE id = ? AND organization_id = ?`,
    )
    .bind(now, actor, comment.id, context.organization_id)
    .run();

  await publish(context.env.DB, {
    organization_id: context.organization_id,
    event_type: "record.comment.deleted",
    actor_type: context.actor_type,
    actor_id: context.actor_id,
    resource_type: String(existing.resource_type),
    resource_id: String(existing.resource_id),
    payload: { comment_id: comment.id },
  }).catch(() => null);

  const saved = await loadCommentById(context, comment.id);
  return { comment_id: comment.id, comments: saved ? [saved] : null };
}

// ─── List ────────────────────────────────────────────────────────────────────

async function listComments(
  context: SkillContext,
  input: RecordCommentInput,
): Promise<RecordCommentOutput> {
  const resourceType = input.resource_type;
  const resourceId = input.resource_id;
  if (!resourceType) {
    throw new HandlerError("missing_required_field", "resource_type is required for list.");
  }
  if (!resourceId) {
    throw new HandlerError("missing_required_field", "resource_id is required for list.");
  }
  validateResourceType(resourceType);

  const limit = clampLimit(input.limit);
  const cursorParts = decodeCursor(input.cursor ?? null);

  const params: Array<string | number> = [
    context.organization_id,
    resourceType,
    resourceId,
  ];

  let cursorClause = "";
  if (cursorParts) {
    // ASC ordering: fetch rows AFTER (created_at, id)
    cursorClause = ` AND (created_at > ? OR (created_at = ? AND id > ?))`;
    params.push(cursorParts.createdAt, cursorParts.createdAt, cursorParts.id);
  }

  // Fetch limit + 1 to compute next_cursor without a count() query.
  const result = await context.env.DB!
    .prepare(
      `SELECT id, organization_id, resource_type, resource_id, custom_object_slug,
              parent_comment_id, body, mentions_json, reactions_json,
              created_by, created_at, edited_at, deleted_at, deleted_by
         FROM record_comments
        WHERE organization_id = ?
          AND resource_type = ?
          AND resource_id = ?
          ${cursorClause}
        ORDER BY created_at ASC, id ASC
        LIMIT ?`,
    )
    .bind(...params, limit + 1)
    .all<RecordCommentRow>()
    .catch(() => ({ results: [] as RecordCommentRow[] }));

  const rows = result.results || [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page.length > 0 ? page[page.length - 1] : null;
  const nextCursor = hasMore && last
    ? encodeCursor({ createdAt: last.created_at, id: last.id })
    : null;

  return {
    comment_id: null,
    comments: page.map(rowToComment),
    next_cursor: nextCursor,
  };
}

// ─── React ───────────────────────────────────────────────────────────────────

async function reactComment(
  context: SkillContext,
  reaction: NonNullable<RecordCommentInput["reaction"]>,
): Promise<RecordCommentOutput> {
  if (!reaction.comment_id) {
    throw new HandlerError("missing_required_field", "reaction.comment_id is required.");
  }
  if (!reaction.emoji || reaction.emoji.length > MAX_EMOJI_LENGTH) {
    throw new HandlerError("emoji_invalid", `emoji must be 1..${MAX_EMOJI_LENGTH} chars.`);
  }
  if (reaction.action !== "add" && reaction.action !== "remove") {
    throw new HandlerError("action_invalid", "reaction.action must be add|remove.");
  }

  const existing = await loadCommentById(context, reaction.comment_id);
  if (!existing) {
    throw new HandlerError("not_found", `Comment ${reaction.comment_id} not found in this organization.`);
  }
  if (existing.deleted_at) {
    throw new HandlerError("comment_deleted", "cannot react to a deleted comment.");
  }

  const userId = context.actor_id || "unknown";
  const current: Array<{ emoji: string; user_id: string }> = Array.isArray(existing.reactions)
    ? (existing.reactions as Array<{ emoji: string; user_id: string }>)
    : [];

  let next: Array<{ emoji: string; user_id: string }>;
  if (reaction.action === "add") {
    const already = current.some((r) => r.emoji === reaction.emoji && r.user_id === userId);
    next = already ? current : [...current, { emoji: reaction.emoji, user_id: userId }];
  } else {
    next = current.filter((r) => !(r.emoji === reaction.emoji && r.user_id === userId));
  }

  await context.env.DB!
    .prepare(
      `UPDATE record_comments
          SET reactions_json = ?
        WHERE id = ? AND organization_id = ? AND deleted_at IS NULL`,
    )
    .bind(JSON.stringify(next), reaction.comment_id, context.organization_id)
    .run();

  await publish(context.env.DB, {
    organization_id: context.organization_id,
    event_type: "record.comment.reacted",
    actor_type: context.actor_type,
    actor_id: context.actor_id,
    resource_type: String(existing.resource_type),
    resource_id: String(existing.resource_id),
    payload: {
      comment_id: reaction.comment_id,
      emoji: reaction.emoji,
      action: reaction.action,
    },
  }).catch(() => null);

  const saved = await loadCommentById(context, reaction.comment_id);
  return { comment_id: reaction.comment_id, comments: saved ? [saved] : null };
}

// ─── Notify mention (event-bound) ────────────────────────────────────────────
//
// Invoked by EVENT_SKILL_BINDINGS["record.comment.mentioned"]. The binding
// passes _mentioned_user_id + _mentioned_email + reaction.comment_id (the
// comment that triggered the mention). Send a Postmark email with a body
// preview + deep link to the resource — mirrors approval-notify pattern.

async function notifyMention(
  context: SkillContext,
  input: RecordCommentInput,
): Promise<RecordCommentOutput> {
  const commentId = input.reaction?.comment_id || "";
  const mentionedEmail = input._mentioned_email || "";
  if (!commentId || !mentionedEmail) {
    return { comment_id: commentId || null, comments: null, notify: { sent: 0, skipped: true } };
  }

  const comment = await loadCommentById(context, commentId);
  if (!comment) {
    return { comment_id: commentId, comments: null, notify: { sent: 0, skipped: true } };
  }
  if (comment.deleted_at) {
    // Don't notify on deleted comments
    return { comment_id: commentId, comments: null, notify: { sent: 0, skipped: true } };
  }

  const resourceType = String(comment.resource_type);
  const resourceId = String(comment.resource_id);
  const preview = previewBody(String(comment.body || ""));
  const link = buildResourceLink(resourceType, resourceId);

  const result = await sendPostmarkEmail(
    {
      to: mentionedEmail,
      subject: `You were mentioned on a ${resourceType}`,
      htmlBody: mentionEmailHtml({ preview, link, resourceType }),
      textBody: `You were mentioned in a comment.\n\n"${preview}"\n\nOpen: ${link}`,
    },
    context.env,
  ).catch(() => ({ ok: false } as { ok: boolean }));

  const sent = "ok" in result && result.ok ? 1 : 0;
  return {
    comment_id: commentId,
    comments: null,
    notify: { sent, skipped: sent === 0 },
  };
}

function buildResourceLink(resourceType: string, resourceId: string): string {
  const safeType = encodeURIComponent(resourceType);
  const safeId = encodeURIComponent(resourceId);
  // Map resource_type to its workspace surface. custom_object lands on the
  // generic record route; everything else uses its dedicated page.
  switch (resourceType) {
    case "contact":      return `https://adga.ai/suite/contacts/${safeId}`;
    case "lead":         return `https://adga.ai/suite/leads/${safeId}`;
    case "deal":         return `https://adga.ai/suite/deals/${safeId}`;
    case "organization": return `https://adga.ai/suite/organizations/${safeId}`;
    default:             return `https://adga.ai/suite/records/${safeType}/${safeId}`;
  }
}

function mentionEmailHtml(input: { preview: string; link: string; resourceType: string }): string {
  // Light-mode only template; mirrors approval-notify but tuned for mention copy.
  const safePreview = escapeHtml(input.preview);
  const safeLink = escapeHtml(input.link);
  return `<!doctype html>
<html><body style="margin:0;background:#f6f3fb;font-family:Inter,Arial,sans-serif;color:#18151f;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f3fb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e8e0f4;border-radius:20px;overflow:hidden;">
        <tr><td style="padding:28px 30px 18px;border-bottom:1px solid #eee7f7;">
          <div style="font-size:26px;font-weight:800;letter-spacing:-0.02em;color:#5b21b6;">ADGA</div>
          <div style="margin-top:10px;font-size:13px;color:#6f687c;">You were mentioned on a ${escapeHtml(input.resourceType)}</div>
        </td></tr>
        <tr><td style="padding:30px;">
          <p style="margin:0 0 22px;font-size:15px;line-height:1.55;color:#4f485d;">
            &ldquo;${safePreview}&rdquo;
          </p>
          <a href="${safeLink}" style="display:inline-block;background:#5b21b6;color:#ffffff;text-decoration:none;border-radius:12px;padding:13px 18px;font-size:14px;font-weight:700;">Open the thread</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateResourceType(value: string): void {
  if (!RESOURCE_TYPES.has(value as RecordResourceType)) {
    throw new HandlerError("resource_type_unknown", `Unknown resource_type: ${value}`);
  }
}

function validateBody(body: string): void {
  if (typeof body !== "string" || body.length === 0) {
    throw new HandlerError("body_required", "body must be a non-empty string.");
  }
  if (body.length > MAX_BODY_LENGTH) {
    throw new HandlerError("comment_too_long", `body must be <= ${MAX_BODY_LENGTH} chars.`);
  }
}

function clampLimit(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(Math.floor(value), MAX_PAGE_SIZE);
}

// ─── Mention resolution (org members only) ───────────────────────────────────

function extractMentionEmails(body: string): string[] {
  const out = new Set<string>();
  for (const match of body.matchAll(MENTION_RE)) {
    const email = match[1]?.toLowerCase();
    if (email) out.add(email);
  }
  return Array.from(out);
}

interface ResolvedMention {
  user_id: string;
  email: string;
}

async function resolveMentions(
  context: SkillContext,
  emails: string[],
): Promise<ResolvedMention[]> {
  if (emails.length === 0) return [];
  const db = context.env.DB!;
  // SQLite IN-clause with placeholders. emails is bounded (mention regex
  // matches in a 4000-char body — practical ceiling tens, not thousands).
  const placeholders = emails.map(() => "?").join(", ");
  const result = await db
    .prepare(
      `SELECT u.id AS user_id, u.email AS email
         FROM users u
         JOIN organization_members om ON om.user_id = u.id
        WHERE om.organization_id = ?
          AND LOWER(u.email) IN (${placeholders})`,
    )
    .bind(context.organization_id, ...emails)
    .all<{ user_id: string; email: string }>()
    .catch(() => ({ results: [] as { user_id: string; email: string }[] }));
  return (result.results || []).map((row) => ({
    user_id: row.user_id,
    email: row.email,
  }));
}

// ─── Persistence helpers ─────────────────────────────────────────────────────

interface RecordCommentRow {
  id: string;
  organization_id: string;
  resource_type: string;
  resource_id: string;
  custom_object_slug: string | null;
  parent_comment_id: string | null;
  body: string;
  mentions_json: string;
  reactions_json: string;
  created_by: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

async function loadCommentById(
  context: SkillContext,
  id: string,
): Promise<Record<string, unknown> | null> {
  const row = await context.env.DB!
    .prepare(
      `SELECT id, organization_id, resource_type, resource_id, custom_object_slug,
              parent_comment_id, body, mentions_json, reactions_json,
              created_by, created_at, edited_at, deleted_at, deleted_by
         FROM record_comments
        WHERE id = ? AND organization_id = ?
        LIMIT 1`,
    )
    .bind(id, context.organization_id)
    .first<RecordCommentRow>()
    .catch(() => null);
  if (!row) return null;
  return rowToComment(row);
}

function rowToComment(row: RecordCommentRow): Record<string, unknown> {
  return {
    id: row.id,
    organization_id: row.organization_id,
    resource_type: row.resource_type,
    resource_id: row.resource_id,
    custom_object_slug: row.custom_object_slug,
    parent_comment_id: row.parent_comment_id,
    body: row.body,
    mentions: safeParseJson(row.mentions_json, [] as ResolvedMention[]),
    reactions: safeParseJson(row.reactions_json, [] as Array<{ emoji: string; user_id: string }>),
    created_by: row.created_by,
    created_at: row.created_at,
    edited_at: row.edited_at,
    deleted_at: row.deleted_at,
    deleted_by: row.deleted_by,
  };
}

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function previewBody(body: string): string {
  const trimmed = body.trim();
  if (trimmed.length <= 100) return trimmed;
  return `${trimmed.slice(0, 97)}...`;
}

// ─── Cursor encode/decode ────────────────────────────────────────────────────

interface CursorParts {
  createdAt: string;
  id: string;
}

function encodeCursor(parts: CursorParts): string {
  const raw = `${parts.createdAt}|${parts.id}`;
  return base64UrlEncode(raw);
}

function decodeCursor(value: string | null): CursorParts | null {
  if (!value) return null;
  try {
    const raw = base64UrlDecode(value);
    const [createdAt, id] = raw.split("|");
    if (!createdAt || !id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

function base64UrlEncode(value: string): string {
  // Workers + Node both expose btoa via globals on modern runtimes.
  const b64 = typeof btoa === "function"
    ? btoa(value)
    : Buffer.from(value, "utf8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const fill = padded.length % 4 === 0 ? padded : padded + "=".repeat(4 - (padded.length % 4));
  return typeof atob === "function"
    ? atob(fill)
    : Buffer.from(fill, "base64").toString("utf8");
}

// ─── Table defense — matches list-segment pattern ────────────────────────────

export async function ensureRecordCommentsTable(env: CloudflareEnv): Promise<void> {
  if (!env.DB) return;
  await env.DB
    .prepare(
      `CREATE TABLE IF NOT EXISTS record_comments (
         id TEXT PRIMARY KEY,
         organization_id TEXT NOT NULL,
         resource_type TEXT NOT NULL,
         resource_id TEXT NOT NULL,
         custom_object_slug TEXT,
         parent_comment_id TEXT,
         body TEXT NOT NULL,
         mentions_json TEXT NOT NULL DEFAULT '[]',
         reactions_json TEXT NOT NULL DEFAULT '[]',
         created_by TEXT NOT NULL,
         created_at TEXT NOT NULL,
         edited_at TEXT,
         deleted_at TEXT,
         deleted_by TEXT
       )`,
    )
    .run();
  await env.DB
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_record_comments_resource
         ON record_comments (organization_id, resource_type, resource_id, created_at DESC)`,
    )
    .run();
  await env.DB
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_record_comments_parent
         ON record_comments (parent_comment_id)`,
    )
    .run();
}
