---
name: record-comment
owner: communication
description: Threaded comments + @mentions on any record (contact, lead, deal, organization, custom object). Slack-style attached collaboration on the record itself — replaces "let's chat about this deal in Slack" with a persistent thread the next operator can read.
inputs:
  - operation: "create" | "update" | "delete" | "list" | "react"
  - comment:
      id: string | null
      resource_type: "contact" | "lead" | "deal" | "organization" | "custom_object"
      resource_id: string
      parent_comment_id: string | null
      body: string
      mentions: string[]
  - reaction:
      comment_id: string
      emoji: string
      action: "add" | "remove"
  - organization_id: string
  - actor: { type: "user" | "agent", id: string }
outputs:
  - comment_id: string | null
  - comments: Array<Comment> | null
events_emitted:
  - record.comment.created
  - record.comment.mentioned
  - record.comment.updated
  - record.comment.deleted
  - record.comment.reacted
state_contracts:
  - cloudflare/state/record-comment.schema.json
---

# Record Comment — Threaded Collaboration on Records

## Why this exists

Buyers expect to talk about a deal where the deal lives. Today the conversation leaks into Slack
and email, and a new team member joining a deal has no history. Inline comments fix this. They
also feed the activity timeline so context never disappears.

@Mentions cause notifications via the existing approval-notification path — same Postmark
infrastructure, same template, different event type.

## Behavior

1. **create**: validate resource exists + actor has access. Parse body for `@email`-style mentions
   → resolve to user_ids → emit `record.comment.mentioned` per mention. Emit
   `record.comment.created` for the timeline.
2. **update**: edit window 15 minutes after creation. After that, edit creates an `edited_at`
   marker but body is preserved for audit.
3. **delete**: soft delete — body replaced with `[deleted by {actor}]`, original body archived.
4. **list**: returns comments in chronological order, threaded by `parent_comment_id`.
5. **react**: add/remove emoji reaction; emits `record.comment.reacted`.

## Decision rules

- **Mention of user not in workspace** → silently ignored; mention parsed away from rendered body.
- **Comment on archived/deleted resource** → reject with `error: "resource_unavailable"`.
- **Body length > 4000 chars** → reject with `error: "comment_too_long"`.

## Notification path

`record.comment.mentioned` is bound to a notification handler that sends a Postmark email + an
in-app notification (when in-app notifications land). Both use the same approval-notify
infrastructure; the body template differs.

## Recovery

Soft-delete only. Edit audit preserved. No comment is ever physically removed within the
retention window.

## v1 scope

Create + list + delete + @mentions with email notification. Reactions + edit declared in contract,
ship in a subsequent iteration.
