import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertIncludes(relativePath, needle, message) {
  if (!read(relativePath).includes(needle)) failures.push(`${relativePath}: ${message}`);
}

function assertDoesNotInclude(relativePath, needle, message) {
  if (read(relativePath).includes(needle)) failures.push(`${relativePath}: ${message}`);
}

function assertOrder(relativePath, first, second, message) {
  const content = read(relativePath);
  const firstIndex = content.indexOf(first);
  const secondIndex = content.indexOf(second);
  if (firstIndex === -1 || secondIndex === -1 || firstIndex >= secondIndex) {
    failures.push(`${relativePath}: ${message}`);
  }
}

const adpRoute = "app/api/partners/adp/leads/route.ts";
assertIncludes(adpRoute, "resolveAdpReferralRecipient", "ADP lead route must require the configured ADP recipient.");
assertIncludes(adpRoute, "getLikelyTestAdpLeadReason", "ADP lead route must reject likely test lead payloads before email.");
assertDoesNotInclude(adpRoute, "matt.ganton@adp.com", "ADP lead route must not hardcode Matt or any ADP recipient fallback.");
assertDoesNotInclude(adpRoute, "context.env.ADGA_ADMIN_EMAIL ||", "ADP lead route must not fallback to an admin inbox for ADP routing.");
assertOrder(adpRoute, "await leadBucket.put", "await context.env.DB.prepare(\n      `INSERT INTO partner_referral_leads", "ADP payload must be stored to R2 before D1 metadata.");
assertOrder(adpRoute, "`INSERT INTO partner_referral_leads", "const emailResult = await sendPostmarkEmail", "ADP email must only send after the lead metadata insert succeeds.");

assertIncludes("app/api/email/send/route.ts", "protectedTestRecipientError", "Generic admin email route must block protected ADP test recipients.");
assertIncludes("app/api/calendar/events/route.ts", "protectedTestRecipientError", "Calendar invites must block protected ADP test recipients.");

assertIncludes("app/api/lead-magnets/five-secrets/request/route.ts", "createFiveSecretsMagicToken", "Lead magnet must use the Five Secrets magic token.");
assertIncludes("app/api/lead-magnets/five-secrets/request/route.ts", 'new URL("/5-secrets/open"', "Lead magnet magic link must open the Five Secrets flow.");
assertIncludes("app/api/auth/magic/request/route.ts", 'new URL("/auth/verify"', "Customer magic link must use the customer auth verify route.");
assertDoesNotInclude("app/api/auth/magic/request/route.ts", "createFiveSecretsMagicToken", "Customer magic link must not use lead-magnet tokens.");
assertDoesNotInclude("app/api/lead-magnets/five-secrets/request/route.ts", "randomToken()", "Five Secrets opt-in must not use customer auth tokens.");

for (const relativePath of [
  "app/api/lead-magnets/five-secrets/request/route.ts",
  "app/api/partners/adp/leads/route.ts",
  "app/api/auth/magic/request/route.ts",
]) {
  const content = read(relativePath).toLowerCase();
  for (const banned of ["background:#000", "background:#111", "background:black", "yellow", "taupe", "pink"]) {
    if (content.includes(banned)) failures.push(`${relativePath}: email template contains banned color token ${banned}.`);
  }
  if (content.includes("background:#f59e0b") || content.includes("background:#fbbf24")) {
    failures.push(`${relativePath}: email template contains banned yellow/orange button background.`);
  }
}

if (failures.length) {
  console.error("Email safety checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Email safety checks passed.");
