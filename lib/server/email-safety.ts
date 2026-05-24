type AdpLeadLike = {
  full_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  payroll_timing?: string;
  needs?: string[];
  notes?: string;
};

const EXACT_TEST_VALUES = new Set([
  "test",
  "testing",
  "fake",
  "dummy",
  "sample",
  "asdf",
  "qwerty",
  "example",
  "n/a",
  "na",
  "none",
]);

export function normalizeRecipientEmail(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

export function isProtectedAdpRecipient(value?: string | null) {
  const email = normalizeRecipientEmail(value);
  if (!email || !email.includes("@")) return false;
  const [local, domain] = email.split("@");
  return domain === "adp.com" || local === "matt" || local === "matthew" || local.startsWith("matt.") || local.startsWith("matthew.");
}

export function protectedTestRecipientError(to?: string | null) {
  if (!isProtectedAdpRecipient(to)) return null;
  return "Protected ADP/Matt recipients cannot be used for generic test or manual emails. Only the stored real ADP lead route may notify the configured ADP referral recipient.";
}

function isExactTestValue(value?: string | null) {
  return EXACT_TEST_VALUES.has(String(value || "").trim().toLowerCase());
}

export function getLikelyTestAdpLeadReason(lead: AdpLeadLike) {
  const email = normalizeRecipientEmail(lead.email);
  const [local = "", domain = ""] = email.split("@");
  if (domain === "example.com" || domain === "test.com" || domain === "invalid.test") return "test_email_domain";
  if (/^(test|fake|dummy|sample|asdf|qwerty)([+._-].*)?$/.test(local)) return "test_email_local_part";
  if (isExactTestValue(lead.full_name)) return "test_full_name";
  if (isExactTestValue(lead.company)) return "test_company";
  if (isExactTestValue(lead.phone)) return "test_phone";
  if (isExactTestValue(lead.job_title)) return "test_job_title";
  if (isExactTestValue(lead.payroll_timing)) return "test_payroll_timing";
  if (isExactTestValue(lead.notes)) return "test_notes";
  if (!lead.needs?.length || lead.needs.every((need) => isExactTestValue(need))) return "test_or_missing_needs";
  return null;
}

export function resolveAdpReferralRecipient(env: CloudflareEnv = {}) {
  const toEmail = normalizeRecipientEmail(env.ADP_REFERRAL_TO_EMAIL || process.env.ADP_REFERRAL_TO_EMAIL);
  if (!toEmail) {
    return {
      ok: false as const,
      error: "ADP_REFERRAL_TO_EMAIL is required before routing ADP leads. No fallback recipient is allowed.",
    };
  }
  if (!toEmail.includes("@")) {
    return {
      ok: false as const,
      error: "ADP_REFERRAL_TO_EMAIL must be a valid email address.",
    };
  }
  return { ok: true as const, toEmail };
}
