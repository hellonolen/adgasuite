# Data Storage Policy

Cloudflare R2 is the long-term system of record for ADGA workspace payloads and content.

D1 is for metadata only:

- Stable IDs and reference numbers
- Organization, workspace, owner, and permission metadata
- Status, routing, timestamps, counters, and audit/event metadata
- R2 object keys, storage object IDs, hashes, MIME types, and size metadata
- Small index fields needed to find or join records

Do not store full lead, contact, map, document, message, voice note, customer, or partner-referral payloads in D1. Store those payloads in R2 and keep D1 rows as pointers plus operational metadata.

JSON payload R2 keys must be deterministic and organization-scoped: `payloads/{organization_id}/{resource_type}/{resource_id}.json` unless a route explicitly owns a narrower folder. Rewriting the same logical payload should overwrite the R2 object and reuse the existing `storage_objects` row for that `r2_key`; it must not create a new pointer ID for the same key.

Reads that hydrate payload pointers must use the bucket recorded on the `storage_objects` row when a `storage_object_id` is present. Falling back to the default payload bucket is only acceptable for legacy rows that have a `payload_r2_key` but no storage object metadata.

Payload reads must also enforce the tenant boundary when the caller knows the organization. Lead, contact, invoice, and similar workspace routes pass the row organization into payload hydration; if a `storage_object_id` points to another organization, the payload must not be read or merged into the response.

ADP partner referrals follow this rule: the full submitted lead/contact payload is written to R2 first; D1 keeps the partner referral number, partner metadata, routing status, and the R2 pointer. ADP referral numbers are not ADGA customer IDs and not internal affiliate IDs.

Current implementation coverage:

- New public leads and manual lead/deal/task records write full payloads to R2 and keep D1 pointer metadata.
- New and updated contacts write full payloads to R2 and keep D1 pointer metadata.
- Lead, contact, and invoice list/detail reads hydrate R2 payloads only through storage object metadata and the caller organization boundary.
- Document uploads write binary content to R2 and record the actual bucket, key, hash, MIME type, size, and owning resource metadata in D1.
- New maps, map nodes, and map edges write labels/data/style payloads to R2 and keep D1 graph/index metadata.
- New voice-note transcripts, SMS messages, communication messages, invoices, deal representations, access requests, and ADP partner referrals write full payloads to R2 and keep D1 pointer metadata.
- Voice call participants, transcripts, summaries, recordings, and agentic outputs write to R2; D1 keeps status/timing/provider metadata and the payload pointer.
- DealFlow maps, nodes, edges, and share links follow an archive/revoke policy. Routes must not hard-delete production storage rows or R2 payload records.

Production audit:

- Run `npm run audit:storage` before launch or storage-route changes. The audit checks pointer columns, archive columns, direct payload reads, and hard-delete SQL in route/server code.
