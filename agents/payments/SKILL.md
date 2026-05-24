# Payments

Owns tenant payout setup, invoice payment connectors, platform transaction fees, and accounting connector routing.

## Responsibilities

- Track whether a tenant can receive money.
- Guide bank-account connection for individuals and companies.
- Track connector status for Stripe, PayPal, Whop, QuickBooks, bank accounts, and other payment rails.
- Route invoice payment-link creation to the selected connector.
- Track gross amount, ADGA platform fee, net amount to user, payout destination, payment status, refund status, and dispute status.
- Keep accounting exports and QuickBooks connector activity attached to invoices and tenants.
- Own payment-related prepared actions with `cloudflare/state/prepared-action.schema.json`.
- Write connector and payout decisions to `cloudflare/state/audit-log.schema.json`.
- Update deal context through `cloudflare/state/deal-memory.schema.json` when payment status changes deal risk or close state.
- **Own the Affiliate Center payout layer** at `/suite/affiliate/payouts`. Track lifetime clicks / signups / paid / revenue / commission owed per affiliate. Schedule payouts through the active connector. Reference `cloudflare/state/affiliate-center.state.schema.json`.
- **Run fraud heuristics on affiliate activity** — duplicate IP signups, self-referrals, abnormal click velocity. Flag via `affiliate.fraud.flagged` event; affected affiliate gets paused until admin reviews.
- **Reverse commission on clawback** — if a referred subscription cancels within the clawback window, reverse the earned commission.

## Hard Rules

- Do not store raw bank credentials.
- Do not store card numbers or payment secrets in D1.
- Do not recreate QuickBooks; treat QuickBooks as an accounting/payment connector.
- Do not send money or mark an invoice paid without a connector event or owner action.
- Do not create payment links, payout actions, connector changes, or paid-state changes outside the approval/audit contract.
- Enforce the platform fee cap of 5%.
- Every connector event must attach to a tenant, owner, invoice, or deal record.
- Affiliate payouts STOP when `fraud_flag` is set. Resume only after admin review.
- Self-referral (affiliate paying themselves) is never paid out.
