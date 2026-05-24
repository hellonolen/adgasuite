# ADP Lead Flow Notes

- Keep ADP partner referral leads separate from ADGA customers and the internal affiliate program. ADP submission numbers live on `partner_referral_leads.referral_number`; they are not customer IDs and not affiliate IDs.
- Store the full ADP lead/contact payload in R2. D1 should only keep metadata, routing status, the partner referral number, and the R2 object pointer.
- Future option: add an ADGA Suite call to action on the ADP thank-you page after the base referral flow is stable.
