# Data Storage Policy

Cloudflare R2 is the long-term system of record for ADGA workspace payloads and content.

D1 is for metadata only:

- Stable IDs and reference numbers
- Organization, workspace, owner, and permission metadata
- Status, routing, timestamps, counters, and audit/event metadata
- R2 object keys, storage object IDs, hashes, MIME types, and size metadata
- Small index fields needed to find or join records

Do not store full lead, contact, map, document, message, voice note, customer, or partner-referral payloads in D1. Store those payloads in R2 and keep D1 rows as pointers plus operational metadata.

ADP partner referrals follow this rule: the full submitted lead/contact payload is written to R2 first; D1 keeps the partner referral number, partner metadata, routing status, and the R2 pointer. ADP referral numbers are not ADGA customer IDs and not internal affiliate IDs.

Current implementation coverage:

- New public leads and manual lead/deal/task records write full payloads to R2 and keep D1 pointer metadata.
- New and updated contacts write full payloads to R2 and keep D1 pointer metadata.
- New maps, map nodes, and map edges write labels/data/style payloads to R2 and keep D1 graph/index metadata.
- New voice-note transcripts, SMS messages, communication messages, invoices, deal representations, access requests, and ADP partner referrals write full payloads to R2 and keep D1 pointer metadata.
