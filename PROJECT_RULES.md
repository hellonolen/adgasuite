# Project Rules

## Source Of Truth

This folder is the source of truth for the new Cloudflare-native ADGA Suite build:

`/Users/savantrock/Workspace/active/ADGAsuite`

The legacy ADGA repo is reference only for current UI/UX and product behavior.

## Naming

Use:

- ADGA
- ADGA Suite
- adga.ai

Do not introduce alternate product names for the assistant/agent layer.

## Platform Boundary

Production platform:

- Cloudflare
- D1
- R2
- Workers/API routes
- Cloudflare Worker AI binding
- Cloudflare secrets

Do not add legacy backend dependencies, URLs, scripts, providers, or environment variables.

AI runtime rule:

- Use the Cloudflare Worker runtime to power ADGA Suite agents.
- Kimi 2.6 is the intended primary model.
- Do not make Gemini, Claude, OpenAI, or another external model API the primary path.
- External model APIs may only be added later as explicit fallback integrations if approved.

## Production Standard

This is not an MVP, demo, or investor mockup. Features must be real production workflows before they are marked done.

## Agentic Development Standard

Agentic platform work must start with documentation and state contracts before UI or API implementation.

Required order:

1. Markdown requirement or operating-spine update.
2. Agent ownership in `agents/*/SKILL.md`.
3. JSON state/schema file when durable state is involved.
4. Event, approval, and audit contract.
5. Implementation.
6. Browser verification.
7. Production deployment.

Reference:

- `docs/ADGA_AGENTIC_OPERATING_SPINE.md`
- `docs/ADGA_AGENTIC_TASKS.json`
- `docs/AGENT_FEATURE_MAP.md`

## Admin Access

- Platform owner/admin email: `hellonolen@gmail.com`.
- Additional admin email: `kamarokyle5@gmail.com`.
- Localhost must not lock the owner out of the project.
- Local development may use an admin bypass for these emails.
- Production must use real session security and audit logging.

## Integrations

- Email delivery: Postmark.
- Payments and subscriptions: Whop.
- AI runtime: Cloudflare Worker AI with Kimi 2.6.

## UI Standard

- Premium light SaaS interface.
- Business-tool density.
- Sidebar/tool layout for the ADGA workspace app.
- Two-panel login pattern.
- Clear tables, drawers, filters, forms, settings, and empty states.
- No dark mode as the primary product surface.
- No bloated cards or decorative placeholder sections.
- Text inside cards, pills, badges, accordions, filters, and buttons must have comfortable side padding. Do not make content barely fit its container or appear clipped at the start or end.

## Marketing Navigation

- Every primary top-menu item must resolve to its own standalone page route.
- Do not use homepage hash anchors as primary top-menu destinations.
- Primary marketing routes must use one clear word after the slash. Do not use dashed page slugs for primary menu pages.
- The current primary marketing menu is Platform (`/product`), Deal Process (`/process`), Use Cases (`/cases`), and Pricing (`/pricing`).
- Security belongs in footer/legal or trust-context placement, not the primary top menu.
- Main marketing CTA language is Sign in and Start closing deals. Do not use Open ADGA, Get Started, or Request Access as public primary CTA language.
