#!/usr/bin/env bash
# Configure Stripe for ADGA Suite. Project-scoped, not global.
# Prompts for your Stripe SECRET KEY in your terminal — input is hidden,
# never echoed, never logged, never sent to chat. The script then creates
# the 10 products+prices in your Stripe account, creates the webhook
# endpoint, and pushes all secrets to this project's Cloudflare worker
# via wrangler.
#
# Usage:
#   npm run setup:stripe
#
# Requirements: curl, jq, wrangler (all already installed in this project).
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

bold() { printf "\033[1m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
red() { printf "\033[31m%s\033[0m\n" "$*"; }
dim() { printf "\033[2m%s\033[0m\n" "$*"; }

cat <<'BANNER'

 ADGA · Stripe setup
 ───────────────────
 This will:
   1) Prompt for your Stripe SECRET KEY (hidden input, never logged)
   2) Validate the key against the Stripe API
   3) Create 10 products + recurring prices in your Stripe account
   4) Create the webhook endpoint → https://adga.ai/api/webhooks/stripe
   5) Push every secret to THIS project's Cloudflare worker via wrangler
   6) Print a one-line summary

BANNER

read -rsp "Paste your Stripe SECRET KEY (sk_live_… or sk_test_…): " STRIPE_SECRET_KEY
echo ""

if [[ -z "$STRIPE_SECRET_KEY" ]]; then
  red "No key provided. Aborting."
  exit 1
fi

if [[ ! "$STRIPE_SECRET_KEY" =~ ^sk_(live|test)_ ]]; then
  red "Key does not look like a Stripe secret key (should start with sk_live_ or sk_test_)."
  exit 1
fi

dim "→ Validating against Stripe..."
ACCOUNT_JSON=$(curl -sS -u "$STRIPE_SECRET_KEY:" https://api.stripe.com/v1/account)
ACCOUNT_ID=$(echo "$ACCOUNT_JSON" | jq -r '.id // empty')
if [[ -z "$ACCOUNT_ID" ]]; then
  red "Could not authenticate with Stripe."
  red "$(echo "$ACCOUNT_JSON" | jq -r '.error.message // "Unknown error"')"
  exit 1
fi
ACCOUNT_NAME=$(echo "$ACCOUNT_JSON" | jq -r '.business_profile.name // .settings.dashboard.display_name // empty')
green "✓ Connected to Stripe account ${ACCOUNT_ID}${ACCOUNT_NAME:+ ($ACCOUNT_NAME)}"

stripe_call() {
  local path="$1"; shift
  curl -sS -u "$STRIPE_SECRET_KEY:" "https://api.stripe.com/v1/$path" "$@"
}

create_product_and_price() {
  local product_name="$1" amount_cents="$2" interval="$3" lookup_key="$4"

  local existing
  existing=$(stripe_call "prices?lookup_keys[]=$lookup_key&active=true&limit=1" | jq -r '.data[0].id // empty')
  if [[ -n "$existing" ]]; then
    dim "  · Reusing existing $lookup_key → $existing"
    echo "$existing"
    return 0
  fi

  local product_id
  product_id=$(stripe_call "products" \
    -d "name=$product_name" \
    -d "metadata[adga_lookup_key]=$lookup_key" \
    -d "type=service" | jq -r '.id')

  if [[ -z "$product_id" || "$product_id" == "null" ]]; then
    red "  ✗ Failed to create product $product_name"
    exit 1
  fi

  local price_id
  price_id=$(stripe_call "prices" \
    -d "product=$product_id" \
    -d "unit_amount=$amount_cents" \
    -d "currency=usd" \
    -d "recurring[interval]=$interval" \
    -d "lookup_key=$lookup_key" \
    -d "nickname=$lookup_key" | jq -r '.id')

  if [[ -z "$price_id" || "$price_id" == "null" ]]; then
    red "  ✗ Failed to create price for $product_name"
    exit 1
  fi

  dim "  · Created $lookup_key → $price_id"
  echo "$price_id"
}

bold ""
bold "→ Creating products + prices..."

PRICE_PRO_MONTHLY=$(create_product_and_price       "ADGA Pro"             9700   month adga_pro_monthly)
PRICE_PRO_ANNUAL=$(create_product_and_price        "ADGA Pro (Annual)"    97000  year  adga_pro_annual)
PRICE_TEAM_BASE_MONTHLY=$(create_product_and_price "ADGA Team"            29700  month adga_team_base_monthly)
PRICE_TEAM_BASE_ANNUAL=$(create_product_and_price  "ADGA Team (Annual)"   297000 year  adga_team_base_annual)
PRICE_TEAM_SEAT_MONTHLY=$(create_product_and_price "ADGA Team Seat"       3000   month adga_team_seat_monthly)
PRICE_TEAM_SEAT_ANNUAL=$(create_product_and_price  "ADGA Team Seat (Annual)" 30000 year adga_team_seat_annual)
PRICE_ENT_BASE_MONTHLY=$(create_product_and_price  "ADGA Enterprise"      59700  month adga_enterprise_base_monthly)
PRICE_ENT_BASE_ANNUAL=$(create_product_and_price   "ADGA Enterprise (Annual)" 597000 year adga_enterprise_base_annual)
PRICE_ENT_SEAT_MONTHLY=$(create_product_and_price  "ADGA Enterprise Seat" 2000   month adga_enterprise_seat_monthly)
PRICE_ENT_SEAT_ANNUAL=$(create_product_and_price   "ADGA Enterprise Seat (Annual)" 20000 year adga_enterprise_seat_annual)

bold ""
bold "→ Creating webhook endpoint..."

WEBHOOK_URL="https://adga.ai/api/webhooks/stripe"

EXISTING_WEBHOOK=$(stripe_call "webhook_endpoints?limit=100" \
  | jq -r --arg url "$WEBHOOK_URL" '.data[] | select(.url == $url) | .id' \
  | head -n1)

if [[ -n "$EXISTING_WEBHOOK" ]]; then
  dim "  · Reusing existing webhook endpoint → $EXISTING_WEBHOOK"
  WEBHOOK_ID="$EXISTING_WEBHOOK"
  WEBHOOK_SECRET=$(stripe_call "webhook_endpoints/$WEBHOOK_ID" | jq -r '.secret // empty')
  if [[ -z "$WEBHOOK_SECRET" || "$WEBHOOK_SECRET" == "null" ]]; then
    dim "    (Existing webhook found but secret is not retrievable — rotating)"
    stripe_call "webhook_endpoints/$WEBHOOK_ID" -X DELETE >/dev/null
    EXISTING_WEBHOOK=""
  fi
fi

if [[ -z "$EXISTING_WEBHOOK" ]]; then
  WEBHOOK_JSON=$(stripe_call "webhook_endpoints" \
    -d "url=$WEBHOOK_URL" \
    -d "enabled_events[]=checkout.session.completed" \
    -d "enabled_events[]=customer.subscription.updated" \
    -d "enabled_events[]=customer.subscription.deleted" \
    -d "enabled_events[]=customer.subscription.created" \
    -d "enabled_events[]=invoice.paid" \
    -d "enabled_events[]=invoice.payment_failed" \
    -d "api_version=2024-09-30.acacia")
  WEBHOOK_ID=$(echo "$WEBHOOK_JSON" | jq -r '.id // empty')
  WEBHOOK_SECRET=$(echo "$WEBHOOK_JSON" | jq -r '.secret // empty')

  if [[ -z "$WEBHOOK_SECRET" || "$WEBHOOK_SECRET" == "null" ]]; then
    red "Failed to create webhook endpoint."
    echo "$WEBHOOK_JSON" | jq -r '.error.message // .'
    exit 1
  fi
  dim "  · Created webhook → $WEBHOOK_ID"
fi

bold ""
bold "→ Pushing secrets to Cloudflare (via wrangler)..."
dim "  Each value is piped silently to wrangler — nothing prints to your terminal."

push_secret() {
  local name="$1" value="$2"
  if [[ -z "$value" || "$value" == "null" ]]; then
    red "  ✗ Skipping $name (empty value)"
    return 1
  fi
  echo "$value" | wrangler secret put "$name" >/dev/null 2>&1 \
    && dim "  · $name pushed" \
    || { red "  ✗ Failed to push $name"; return 1; }
}

push_secret STRIPE_SECRET_KEY                       "$STRIPE_SECRET_KEY"
push_secret STRIPE_WEBHOOK_SECRET                   "$WEBHOOK_SECRET"
push_secret STRIPE_PRICE_PRO_MONTHLY                "$PRICE_PRO_MONTHLY"
push_secret STRIPE_PRICE_PRO_ANNUAL                 "$PRICE_PRO_ANNUAL"
push_secret STRIPE_PRICE_TEAM_BASE_MONTHLY          "$PRICE_TEAM_BASE_MONTHLY"
push_secret STRIPE_PRICE_TEAM_BASE_ANNUAL           "$PRICE_TEAM_BASE_ANNUAL"
push_secret STRIPE_PRICE_TEAM_SEAT_MONTHLY          "$PRICE_TEAM_SEAT_MONTHLY"
push_secret STRIPE_PRICE_TEAM_SEAT_ANNUAL           "$PRICE_TEAM_SEAT_ANNUAL"
push_secret STRIPE_PRICE_ENTERPRISE_BASE_MONTHLY    "$PRICE_ENT_BASE_MONTHLY"
push_secret STRIPE_PRICE_ENTERPRISE_BASE_ANNUAL     "$PRICE_ENT_BASE_ANNUAL"
push_secret STRIPE_PRICE_ENTERPRISE_SEAT_MONTHLY    "$PRICE_ENT_SEAT_MONTHLY"
push_secret STRIPE_PRICE_ENTERPRISE_SEAT_ANNUAL     "$PRICE_ENT_SEAT_ANNUAL"

unset STRIPE_SECRET_KEY WEBHOOK_SECRET

bold ""
green "✓ ADGA is connected to Stripe."
dim "  Account:  $ACCOUNT_ID${ACCOUNT_NAME:+ ($ACCOUNT_NAME)}"
dim "  Webhook:  $WEBHOOK_URL"
dim "  Prices:   10 created or reused"
dim "  Secrets:  12 pushed to Cloudflare worker"
bold ""
dim "Verify secret names (values stay hidden):  wrangler secret list"
echo ""
