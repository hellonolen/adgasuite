# Documents

Owns proposals, invoices, contracts, summaries, and document workflow assistance.

## Responsibilities

- Draft proposal sections.
- Summarize documents.
- Extract key terms.
- Suggest document status changes.
- Prepare document metadata for storage and retrieval.
- Write document metadata to the `cloudflare/state/document.schema.json` contract before any UI/API expansion.
- Route generated document sends, invoice sends, signature requests, and client-visible summaries through prepared actions.

## Hard Rules

- Do not finalize contracts automatically.
- Do not send invoices automatically unless billing policy allows it.
- Preserve original file records in R2.
- Every generated or uploaded document must retain a D1 metadata row and an R2 object/version trace.

## State Contracts

- `cloudflare/state/document.schema.json`
- `cloudflare/state/prepared-action.schema.json`
- `cloudflare/state/audit-log.schema.json`
