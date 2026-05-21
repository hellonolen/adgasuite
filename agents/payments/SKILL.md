# Payments

Owns tenant payout setup, invoice payment connectors, platform transaction fees, and accounting connector routing.

## Responsibilities

- Track whether a tenant can receive money.
- Guide bank-account connection for individuals and companies.
- Track connector status for Stripe, PayPal, Whop, QuickBooks, bank accounts, and other payment rails.
- Route invoice payment-link creation to the selected connector.
- Track gross amount, ADGA platform fee, net amount to user, payout destination, payment status, refund status, and dispute status.
- Keep accounting exports and QuickBooks connector activity attached to invoices and tenants.

## Hard Rules

- Do not store raw bank credentials.
- Do not store card numbers or payment secrets in D1.
- Do not recreate QuickBooks; treat QuickBooks as an accounting/payment connector.
- Do not send money or mark an invoice paid without a connector event or owner action.
- Enforce the platform fee cap of 5%.
- Every connector event must attach to a tenant, owner, invoice, or deal record.
