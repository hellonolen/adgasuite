# ADGA Suite Agents

ADGA Suite uses agents as backend workers. Agents do not own the UI. Agents react to business events, create jobs, and write structured outputs.

Agents use the Cloudflare Worker AI binding as the primary inference path. Kimi 2.6 is the intended model. External AI APIs are not the default architecture.

## Agents

- Conductor: routes work and decides next steps.
- Sales: lead scoring, follow-up recommendations, pipeline movement.
- Intelligence: company research, battlecards, market/customer insights.
- Documents: proposal, invoice, contract, and document summaries.
- Operations: onboarding, reminders, task creation, workflow hygiene.

## Rules

- Agents operate from skill files.
- Agents read/write structured JSON.
- Agents record jobs and runs.
- Agents call the Cloudflare Worker AI binding through the shared AI adapter.
- Agents do not silently mutate important data without an event/audit trail.
- Agents produce recommendations unless an action is explicitly safe and approved by policy.

## Initial Skills

- lead-scoring
- pipeline-risk
- follow-up-generation
- proposal-generation
- battlecard-generation
- knowledge-summary
- onboarding-sequence
