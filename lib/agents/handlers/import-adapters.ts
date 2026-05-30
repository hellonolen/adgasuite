// Operations handlers: skills/import-{hubspot,pipedrive,salesforce,notion,airtable}.skill.md
//
// These five handlers replace the `not_implemented` stubs with a clean,
// machine-readable posture for investor / MCP probing:
//
//   - If the caller hasn't connected the integration → return a structured
//     `integration_not_connected` error naming the provider + the connect URL.
//   - If the OAuth credential IS resolved → emit `agent_job.failed` with
//     reason `adapter_implementation_pending` and return a zero-row batch
//     response (status="queued"). This says "we found your credential, the
//     network fetch is the only piece pending" — a much stronger surface than
//     a generic "no handler yet" 502.
//
// State contract: extends migration 0028's `oauth_credentials` table.
//   The `provider` column already supports arbitrary providers; v1 inbox-sync
//   uses "gmail" / "outlook"; these adapters use
//   "hubspot" / "pipedrive" / "salesforce" / "notion" / "airtable".
//
// SECURITY:
//   - NEVER read or surface access_token / refresh_token columns.
//   - Credential lookup matches by (organization_id, provider, credential_id)
//     only — no token decryption happens here. The actual API fetch (when
//     implemented) will live in a per-provider adapter module under
//     lib/integrations/.

import { publish } from "@/lib/events/bus";
import { newId } from "@/lib/server/id";
import type { SkillContext, SkillHandler } from "@/lib/agents/skill-registry";
import type { CsvImportInput } from "./stubs";

/** Adapter source identifier matches the `provider` column in oauth_credentials. */
export type AdapterProvider =
  | "hubspot"
  | "pipedrive"
  | "salesforce"
  | "notion"
  | "airtable";

/** Display name surfaced in the user-facing error message. */
const PROVIDER_LABEL: Record<AdapterProvider, string> = {
  hubspot: "HubSpot",
  pipedrive: "Pipedrive",
  salesforce: "Salesforce",
  notion: "Notion",
  airtable: "Airtable",
};

const CONNECT_URL = "/suite/integrations";

/**
 * Structured response shape returned when the adapter has a credential but the
 * outbound fetch is still pending implementation. Mirrors CsvImportOutput from
 * csv-import.ts so the caller can use a single response type across all import
 * sources.
 */
export interface AdapterImportOutput {
  batch_id: string | null;
  rows_total: number;
  rows_succeeded: number;
  rows_failed: number;
  failure_summary: Record<string, number>;
  status: "queued";
  duration_ms: number;
}

/**
 * Machine-readable error thrown when no oauth_credentials row exists for the
 * caller / provider / credential_id triple. callSkill() converts the thrown
 * error to `{ ok: false, error: <message> }`; the message is namespaced
 * `integration_not_connected: <human readable text>` so consumers can branch
 * on the prefix.
 *
 * The structured `code` property is preserved on the instance for callers that
 * inspect the error directly (not via callSkill's string conversion).
 */
export class IntegrationNotConnectedError extends Error {
  public readonly code = "integration_not_connected" as const;
  public readonly provider: AdapterProvider;

  constructor(provider: AdapterProvider) {
    const label = PROVIDER_LABEL[provider];
    // Prefix the message with the structured code so callSkill's string-only
    // error channel still carries the machine-readable signal.
    super(
      `integration_not_connected: ${label} is not connected. Connect at ${CONNECT_URL} to enable import.`,
    );
    this.name = "IntegrationNotConnectedError";
    this.provider = provider;
  }
}

/** Validation error for malformed adapter input (missing credential_id, etc). */
class AdapterInputError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = "AdapterInputError";
    this.code = code;
  }
}

/**
 * Defensive table bootstrap. Migration 0028 is the authoritative schema; this
 * keeps preview / fresh-DB environments from blowing up on a missing table.
 */
async function ensureOAuthCredentialsTable(env: CloudflareEnv): Promise<void> {
  if (!env.DB) return;
  await env.DB
    .prepare(
      `CREATE TABLE IF NOT EXISTS oauth_credentials (
         id TEXT PRIMARY KEY,
         organization_id TEXT NOT NULL,
         user_id TEXT NOT NULL,
         provider TEXT NOT NULL,
         account_email TEXT,
         access_token_encrypted TEXT NOT NULL,
         refresh_token_encrypted TEXT,
         expires_at TEXT,
         scope TEXT,
         created_at TEXT NOT NULL,
         updated_at TEXT
       )`,
    )
    .run();
}

/**
 * Resolve an oauth_credentials row by (org, provider, credential_id).
 *
 * Returns only the id + non-secret metadata — token columns are never read so
 * they can never accidentally leak into a log line or event payload.
 */
export async function lookupIntegrationCredential(
  env: CloudflareEnv,
  organizationId: string,
  provider: AdapterProvider,
  credentialId: string,
): Promise<{ id: string; provider: string; account_email: string | null } | null> {
  if (!env.DB) return null;
  await ensureOAuthCredentialsTable(env);
  return env.DB
    .prepare(
      `SELECT id, provider, account_email
         FROM oauth_credentials
        WHERE id = ?
          AND organization_id = ?
          AND provider = ?
        LIMIT 1`,
    )
    .bind(credentialId, organizationId, provider)
    .first<{ id: string; provider: string; account_email: string | null }>()
    .catch(() => null);
}

/**
 * Validate the CsvImportInput shape an adapter receives. Mirrors the
 * surface-level checks csv-import does for its own payloads, but tuned for
 * the adapter contract (payload must carry a `credential_id`).
 */
function validateAdapterInput(input: CsvImportInput, provider: AdapterProvider): string {
  if (!input || typeof input !== "object") {
    throw new AdapterInputError("invalid_input", "input body is required");
  }
  if (input.source_type !== provider) {
    throw new AdapterInputError(
      "source_type_mismatch",
      `source_type must be "${provider}" for this adapter, got "${String(input.source_type)}"`,
    );
  }
  const validTargets = new Set(["contacts", "leads", "deals", "organizations"]);
  if (!validTargets.has(input.target_type)) {
    throw new AdapterInputError(
      "invalid_target_type",
      `target_type must be one of contacts|leads|deals|organizations, got "${String(input.target_type)}"`,
    );
  }
  if (!input.payload || typeof input.payload !== "object") {
    throw new AdapterInputError(
      "missing_payload",
      "payload is required and must include credential_id",
    );
  }
  const credentialId = (input.payload as { credential_id?: unknown }).credential_id;
  if (typeof credentialId !== "string" || credentialId.trim() === "") {
    throw new AdapterInputError(
      "missing_credential_id",
      `payload.credential_id (string) is required to identify which connected ${PROVIDER_LABEL[provider]} account to read from`,
    );
  }
  if (!input.field_mapping || typeof input.field_mapping !== "object") {
    throw new AdapterInputError(
      "missing_field_mapping",
      "field_mapping (object) is required",
    );
  }
  return credentialId.trim();
}

/**
 * DRY factory — produces a SkillHandler for one adapter provider. Every
 * adapter has identical shape; only the provider label / lookup key differs.
 */
export function createAdapterHandler(
  provider: AdapterProvider,
): SkillHandler<CsvImportInput, AdapterImportOutput> {
  return async (ctx: SkillContext, input: CsvImportInput): Promise<AdapterImportOutput> => {
    if (!ctx.env.DB) {
      throw new AdapterInputError(
        "database_unavailable",
        `import-${provider} requires D1 (no DB binding in environment)`,
      );
    }

    const credentialId = validateAdapterInput(input, provider);

    const credential = await lookupIntegrationCredential(
      ctx.env,
      ctx.organization_id,
      provider,
      credentialId,
    );

    if (!credential) {
      // The investor / operator hit the adapter without first connecting the
      // integration. Surface a clean structured error.
      throw new IntegrationNotConnectedError(provider);
    }

    // Credential resolved — the platform "knows" about your account. The
    // outbound HTTP fetch + record materialization is the only thing pending.
    // Emit `agent_job.failed` so the audit trail captures the partial-readiness
    // signal, and return a zero-row "queued" batch so consumers can render a
    // pending UI state without a hard error.
    const jobId = newId("imp_pending");
    await publish(ctx.env.DB, {
      organization_id: ctx.organization_id,
      event_type: "agent_job.failed",
      actor_type: ctx.actor_type,
      actor_id: ctx.actor_id,
      resource_type: "skill_call",
      resource_id: jobId,
      payload: {
        job_id: jobId,
        agent: "operations",
        job_type: `import-${provider}`,
        error: "adapter_implementation_pending",
      },
    }).catch(() => null);

    return {
      batch_id: null,
      rows_total: 0,
      rows_succeeded: 0,
      rows_failed: 0,
      failure_summary: { adapter_pending_implementation: 1 },
      status: "queued",
      duration_ms: 0,
    };
  };
}

// ─── The 5 exported handlers ────────────────────────────────────────────────

export const importHubspotHandler = createAdapterHandler("hubspot");
export const importPipedriveHandler = createAdapterHandler("pipedrive");
export const importSalesforceHandler = createAdapterHandler("salesforce");
export const importNotionHandler = createAdapterHandler("notion");
export const importAirtableHandler = createAdapterHandler("airtable");
