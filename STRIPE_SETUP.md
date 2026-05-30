# STRIPE_SETUP — Canonical Pattern (Every Project)

> Canonical doctrine for every project that takes money. Copy this file into
> every project root. Each project tailors only the **Tier list** and the
> **Webhook URL**; everything else is the same.
>
> Last updated: 2026-05-29

---

## The doctrine

**Every project has its own Stripe account.** There is no shared Stripe account
across the portfolio. Each project's `STRIPE_SECRET_KEY` is wrangler-bound to
that project's Cloudflare Worker. Products and price IDs are created inside
that project's own Stripe account.

**Each project has its own Whop account when Whop is enabled.** Same rule —
no sharing across projects.

The default checkout provider is **Whop**. Stripe is the fallback. Both run
from the same checkout endpoint, switched at runtime by the `checkout_provider`
setting in operator settings (defaults to `whop`).

---

## One-time setup — Stripe

Every project that takes money must complete these four steps for Stripe.

| Step | What to do | Where |
|------|-----------|-------|
| 1 | Create a Stripe account for **this project** | stripe.com |
| 2 | Pipe `STRIPE_SECRET_KEY` into wrangler (silent) | `echo "$VALUE" \| wrangler secret put STRIPE_SECRET_KEY` |
| 3 | Pipe `STRIPE_WEBHOOK_SECRET` into wrangler | `echo "$VALUE" \| wrangler secret put STRIPE_WEBHOOK_SECRET` |
| 4 | Configure webhook endpoint in Stripe dashboard | `https://<project>.com/api/webhooks/stripe` |

After step 4, run **Step 5** — bootstrap the products + price IDs.

| Step | What to do | Where |
|------|-----------|-------|
| 5a | If the project uses `scripts/create-stripe-products.mjs`: run it once with the secret key piped in | `STRIPE_SECRET_KEY=$VALUE node scripts/create-stripe-products.mjs` |
| 5b | OR if the project has an admin bootstrap endpoint: hit it once while logged in as admin | `POST /api/admin/stripe/bootstrap` |
| 5c | OR if the project uses inline `price_data` line items: nothing to do — no Stripe-side product IDs needed | n/a |

The script (or admin endpoint) is idempotent — safe to re-run. It looks up
existing products by name and existing prices by `lookup_key`; only creates
what's missing.

---

## One-time setup — Whop (when applicable)

| Step | What to do | Where |
|------|-----------|-------|
| 1 | Create a Whop company for **this project** | whop.com |
| 2 | Pipe `WHOP_API_KEY` into wrangler | `echo "$VALUE" \| wrangler secret put WHOP_API_KEY` |
| 3 | Pipe `WHOP_WEBHOOK_SECRET` into wrangler | `echo "$VALUE" \| wrangler secret put WHOP_WEBHOOK_SECRET` |
| 4 | Configure webhook endpoint in Whop | `https://<project>.com/api/webhooks/whop` |
| 5 | Sync plans into Whop | `curl -X POST https://<project>.com/api/admin/whop-sync -H "X-Worker-Secret: $WORKER_SHARED_SECRET"` |

Step 5 creates the product on Whop (if it doesn't exist), creates plans for
every tier, and caches the IDs in D1. Future deploys do not need this step —
the cache persists.

If you skip step 5, the **first checkout request will self-heal**: it detects
the empty cache, runs the same sync inline before resolving the requested
tier. No manual plan creation in the Whop dashboard is ever required.

---

## Tier list — single source of truth

Each project defines its tiers in one TypeScript constant (see project-specific
section below). If you change a price in that constant:

- For Whop projects: run the admin sync endpoint again. The resolver
  detects the price drift on its hourly re-verify and re-creates the plan only
  if the existing one cannot be reused.
- For Stripe projects with stored price IDs: re-run the create-stripe-products
  script (it'll create new prices and you pipe the new IDs into wrangler).
- For Stripe projects with inline `price_data`: no action needed — the new
  amount is sent on the next checkout request.

---

## How resolution works at checkout

| Step | What happens |
|------|-------------|
| 1 | Checkout receives a request with `tier: '<tier_name>'` |
| 2 | Provider router reads `checkout_provider` (whop / stripe) |
| 3 | Provider-specific resolver looks up the plan/price |
| 4 | For Whop: D1 cache → fall back to live sync if stale |
| 5 | For Stripe: D1 platform_settings → fall back to env STRIPE_*_PRICE_ID |
| 6 | Stripe/Whop creates the checkout session |
| 7 | Returns URL to the client |

The legacy env-var fallbacks (`STRIPE_*_PRICE_ID`, `WHOP_PLAN_ID`) are still
honored as hard fallbacks if D1 is unavailable at checkout time, but are no
longer required for normal operation.

---

## Admin endpoints (universal)

Every project that uses this pattern exposes these endpoints:

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/admin/stripe/bootstrap` | session=admin | Create / refresh Stripe products and prices |
| POST | `/api/admin/whop-sync` | session=admin OR `X-Worker-Secret` | Trigger a fresh Whop plan sync |
| GET | `/api/admin/billing/status` | session=admin | Return the resolved tier → product/price map |

---

## Security rules — non-negotiable

- **Never** display secret values in chat / logs / commit messages.
- **Always** pipe secrets directly: `echo "$VALUE" | wrangler secret put KEY`.
- **Never** commit a Stripe key, Whop key, or webhook secret to git.
- **Never** share a Stripe account across projects. Always one account per
  project, one wrangler binding per project.
- **Webhook secrets** are required — the receiver must verify signatures
  before trusting any payload.

---

## Files (universal pattern)

| File | Purpose |
|------|---------|
| `migrations/0030_platform_settings.sql` (or equivalent) | D1 key/value cache for Stripe price IDs |
| `lib/stripe.ts` | Tier config + resolver (D1 first, env fallback) |
| `app/api/admin/stripe/bootstrap/route.ts` | One-shot product creation endpoint |
| `app/api/webhooks/stripe/route.ts` | Stripe webhook receiver |
| `app/api/billing/checkout/route.ts` | Stripe checkout creation |
| `scripts/create-stripe-products.mjs` | Standalone script (alternative to admin endpoint) |
| `lib/billing/whop-plans.ts` | Whop tier config + cache resolver |
| `app/api/admin/whop-sync/route.ts` | Whop plan sync endpoint |
| `app/api/webhooks/whop/route.ts` | Whop webhook receiver |

---

## Project-specific section

Each project's copy of this file ends with a **Tier list** specific to that
project. See the project's actual `lib/stripe.ts` for the canonical source.
