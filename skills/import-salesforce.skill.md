---
name: import-salesforce
owner: operations
description: Pull Leads, Contacts, Accounts, and Opportunities from a connected Salesforce org into ADGA. Satisfies the source-agnostic ImportBatch contract.
inputs:
  - target_type: "contacts" | "leads" | "deals" | "organizations"
  - credential_id: string
  - object_id: string | null
  - field_mapping: Record<source_field, target_field>
  - dedupe_strategy: "email" | "external_id" | "name_plus_company" | "domain" | "name"
  - organization_id: string
  - actor: { type: "user" | "agent", id: string }
outputs:
  - batch_id: string
  - rows_total: number
  - rows_succeeded: number
  - rows_failed: number
events_emitted:
  - import.requested
  - import.row_succeeded
  - import.row_failed
  - import.completed
  - import.failed
state_contracts:
  - cloudflare/state/import-batch.schema.json
  - cloudflare/state/import-row.schema.json
---

# Salesforce Import — Source Adapter

## Why this exists

Salesforce buyers are the highest-LTV migration target. Anyone paying $150/seat for Salesforce is
already spending money and complaining about it. A clean import path is the wedge that lets the
buyer try ADGA on their real pipeline without burning a quarter on migration consulting.

## Source contract

Connected App OAuth credential stored in `integrations.salesforce` keyed by `credential_id`.
Skill resolves at call-time. Uses SOQL queries via REST API v60+.

## Query strategy

Per target_type, the handler issues a paginated SOQL:

| Target | SOQL |
|---|---|
| contacts | `SELECT Id, FirstName, LastName, Email, Phone, Title, AccountId FROM Contact` |
| leads | `SELECT Id, FirstName, LastName, Company, Email, Phone, Status FROM Lead` |
| deals | `SELECT Id, Name, Amount, StageName, CloseDate, AccountId FROM Opportunity` |
| organizations | `SELECT Id, Name, Website, Industry FROM Account` |

Pagination via `nextRecordsUrl` from the response envelope.

## Field mapping defaults

| Target | Salesforce source field |
|---|---|
| `contact.full_name` | `FirstName` + " " + `LastName` |
| `contact.email` | `Email` |
| `contact.organization_id` | resolved from `AccountId` |
| `deal.name` | `Name` |
| `deal.value_cents` | `Amount` * 100 |
| `deal.stage` | mapped via `stage_mapping` config |
| `organization.domain` | derived from `Website` |

## Decision rules

- **Session expired** → handler refreshes via refresh_token, retries once, then dead-letters.
- **Object permission denied** (admin connected, fields restricted) → row to dead-letter with
  `failure_reason: "permission_denied"`.
- **Custom fields** absent from default mapping → ignored; surface in preview API so user adds them.

## v1 scope

Not in MVP. Contract declared; handler ships when OAuth wiring lands.
