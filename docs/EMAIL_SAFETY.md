# Email Safety

ADGA uses Postmark or Cloudflare Email for transactional mail. Production email paths must stay separated by purpose.

## Protected Recipients

Do not use Matt, Matthew, ADP, or ADP-company recipients for generic tests, manual admin sends, or calendar invite tests.

The only path allowed to notify the configured ADP referral recipient is the real ADP partner lead route:

- The submitted ADP lead must include full name, email, phone, company, position, payroll timing, at least one need, notes, and consent.
- Obvious test, fake, dummy, sample, or incomplete lead payloads are rejected before storage or email.
- The full lead payload is stored in R2 first.
- D1 stores only metadata, referral number, routing status, and the R2 pointer.
- The email is sent only after the D1 lead metadata insert succeeds.
- `ADP_REFERRAL_TO_EMAIL` is required. There is no hardcoded Matt/ADP fallback.

## Magic Link Separation

Five Secrets opt-in links are not customer sign-in links. They use the Five Secrets token purpose and open `/5-secrets/open`, which grants access only to `/5-secrets/access`.

Paying-customer magic links use the customer auth route `/auth/verify`, the customer auth session cookie, and the ADGA Suite workspace flow.

## Template Rules

Transactional email templates must use ADGA brand colors with purple buttons where a button is needed. Do not use black buttons or yellow, taupe, pink, or solid-black email header treatments.

Run `npm run verify:launch` before committing; it includes the email safety checks in `scripts/verify-email-safety.mjs`.
