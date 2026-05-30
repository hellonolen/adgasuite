/**
 * Gmail REST helpers — minimal surface for inbox-sync v1.
 *
 * Just two operations are needed:
 *   - listMessageIds: paginate message id+threadId pairs that match a query
 *   - getMessage:     load headers + snippet + internalDate for a single id
 *
 * SECURITY: never log message bodies, snippets, headers, ids, or tokens. The
 * caller decides whether to persist (and what to encrypt). The error path
 * only surfaces opaque "gmail_<status>" strings.
 */

const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

export interface ListMessageIdsInput {
  access_token: string;
  query?: string;
  page_token?: string | null;
  max_results?: number;
}

export interface ListMessageIdsResult {
  messages: Array<{ id: string; threadId: string }>;
  nextPageToken: string | null;
}

export async function listMessageIds(input: ListMessageIdsInput): Promise<ListMessageIdsResult> {
  const url = new URL(`${GMAIL_BASE}/messages`);
  if (input.query) url.searchParams.set("q", input.query);
  url.searchParams.set("maxResults", String(input.max_results ?? 100));
  if (input.page_token) url.searchParams.set("pageToken", input.page_token);
  const resp = await fetch(url, {
    headers: { authorization: `Bearer ${input.access_token}` },
  });
  if (!resp.ok) throw new Error(`gmail_list_${resp.status}`);
  const data = (await resp.json()) as {
    messages?: Array<{ id: string; threadId: string }>;
    nextPageToken?: string;
  };
  return {
    messages: data.messages || [],
    nextPageToken: data.nextPageToken || null,
  };
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  internalDate: string;        // string of ms-since-epoch per Gmail API
  payload: {
    headers: GmailHeader[];
    mimeType?: string;
    body?: { data?: string };
    parts?: GmailMessage["payload"][];
  };
}

export interface GetMessageInput {
  access_token: string;
  id: string;
  format?: "metadata" | "full" | "minimal";
  metadata_headers?: string[];
}

export async function getMessage(input: GetMessageInput): Promise<GmailMessage> {
  const url = new URL(`${GMAIL_BASE}/messages/${encodeURIComponent(input.id)}`);
  url.searchParams.set("format", input.format ?? "metadata");
  for (const header of input.metadata_headers ?? ["From", "To", "Subject", "Date", "Message-ID"]) {
    url.searchParams.append("metadataHeaders", header);
  }
  const resp = await fetch(url, {
    headers: { authorization: `Bearer ${input.access_token}` },
  });
  if (!resp.ok) throw new Error(`gmail_get_${resp.status}`);
  return (await resp.json()) as GmailMessage;
}

export function headerValue(headers: GmailHeader[] | undefined, name: string): string | null {
  if (!headers) return null;
  const lower = name.toLowerCase();
  for (const h of headers) {
    if (h.name.toLowerCase() === lower) return h.value;
  }
  return null;
}

/**
 * Parses an RFC 5322 From header into name + email parts.
 * Examples handled:
 *   "Alice Adams" <alice@adams.io>     → { name: "Alice Adams", email: "alice@adams.io" }
 *   alice@adams.io                     → { name: null,          email: "alice@adams.io" }
 *   Alice Adams <alice@adams.io>       → { name: "Alice Adams", email: "alice@adams.io" }
 */
export function parseFromHeader(raw: string | null): { name: string | null; email: string | null } {
  if (!raw) return { name: null, email: null };
  const trimmed = raw.trim();
  const angleMatch = trimmed.match(/^(.*?)<([^>]+)>\s*$/);
  if (angleMatch) {
    const namePart = angleMatch[1].trim().replace(/^"|"$/g, "").trim();
    const emailPart = angleMatch[2].trim().toLowerCase();
    return { name: namePart || null, email: emailPart || null };
  }
  if (trimmed.includes("@")) {
    return { name: null, email: trimmed.toLowerCase() };
  }
  return { name: trimmed || null, email: null };
}
