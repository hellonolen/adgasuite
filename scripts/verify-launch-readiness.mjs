import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertFileDoesNotInclude(relativePath, needle, message) {
  const content = read(relativePath);
  if (content.includes(needle)) failures.push(`${relativePath}: ${message}`);
}

function assertFileIncludes(relativePath, needle, message) {
  const content = read(relativePath);
  if (!content.includes(needle)) failures.push(`${relativePath}: ${message}`);
}

assertFileDoesNotInclude(
  "wrangler.toml",
  'ADGA_LOCAL_ADMIN_BYPASS = "true"',
  "production config must not enable local admin bypass",
);
assertFileDoesNotInclude(
  "wrangler.ci.toml",
  'ADGA_LOCAL_ADMIN_BYPASS = "true"',
  "CI/production config must not enable local admin bypass",
);
assertFileDoesNotInclude(
  ".github/workflows/cloudflare.yml",
  "Verification passed, deploy skipped",
  "deploy workflow must fail, not pass, when credentials are missing",
);
assertFileIncludes(
  "app/api/settings/route.ts",
  "organization_settings",
  "settings endpoint must persist to D1, not return a fake save",
);
assertFileIncludes(
  "app/api/admin/workspace/route.ts",
  "UPDATE organizations",
  "workspace admin endpoint must persist organization updates",
);
assertFileIncludes(
  "app/api/billing/checkout/route.ts",
  "Checkout provider did not return a usable checkout URL.",
  "checkout must fail closed when provider response is unusable",
);

if (failures.length) {
  console.error("Launch readiness checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Launch readiness static checks passed.");
