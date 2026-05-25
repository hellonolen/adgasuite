import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function assertFileDoesNotInclude(relativePath, needle, message) {
  const content = read(relativePath);
  if (content.includes(needle)) failures.push(`${relativePath}: ${message}`);
}

function assertFileIncludes(relativePath, needle, message) {
  const content = read(relativePath);
  if (!content.includes(needle)) failures.push(`${relativePath}: ${message}`);
}

function assertFileExists(relativePath, message) {
  if (!exists(relativePath)) failures.push(`${relativePath}: ${message}`);
}

function assertAnyFileIncludes(relativePaths, needle, message) {
  if (!relativePaths.some((relativePath) => exists(relativePath) && read(relativePath).includes(needle))) {
    failures.push(`${relativePaths.join(" or ")}: ${message}`);
  }
}

function assertNoRegex(relativePath, pattern, message) {
  const content = read(relativePath);
  for (const match of content.matchAll(pattern)) {
    const line = content.slice(0, match.index).split("\n").length;
    failures.push(`${relativePath}:${line}: ${message}`);
  }
}

function walkFiles(dir, predicate) {
  const absoluteDir = path.join(root, dir);
  const files = [];
  if (!fs.existsSync(absoluteDir)) return files;

  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    const absolutePath = path.join(absoluteDir, entry.name);
    const relativePath = path.relative(root, absolutePath);
    if (entry.isDirectory()) {
      if ([".next", ".open-next", "node_modules", ".git"].includes(entry.name)) continue;
      files.push(...walkFiles(relativePath, predicate));
    } else if (predicate(relativePath)) {
      files.push(relativePath);
    }
  }

  return files;
}

const customerReadyRoutes = [
  { url: "/", file: "app/page.tsx" },
  { url: "/pricing", file: "app/pricing/page.tsx" },
  { url: "/login", file: "app/login/page.tsx" },
  { url: "/checkout", file: "app/checkout/page.tsx" },
  { url: "/suite", file: "app/suite/page.tsx" },
  { url: "/suite/deals", file: "app/suite/deals/page.tsx" },
  { url: "/suite/dealflow/[id]", file: "app/suite/dealflow/[id]/page.tsx" },
];

for (const route of customerReadyRoutes) {
  assertFileExists(route.file, `${route.url} customer-ready route must exist.`);
}

assertAnyFileIncludes(["app/page.tsx", "components/adga/layout/MarketingLayout.tsx"], "/pricing", "homepage or marketing shell must link customers to pricing.");
assertFileIncludes("app/pricing/page.tsx", "/checkout?plan=pro", "pricing must route Pro customers to checkout.");
assertFileIncludes("app/pricing/page.tsx", "/checkout?plan=team", "pricing must route Team customers to checkout.");
assertFileIncludes("app/pricing/page.tsx", "/checkout?plan=enterprise", "pricing must route Enterprise customers to checkout.");
assertFileIncludes("app/login/page.tsx", "/suite", "login must return signed-in customers to the suite by default.");
assertFileIncludes("app/checkout/page.tsx", "/api/billing/stripe/checkout", "checkout page must start the Stripe checkout flow.");
assertFileIncludes("app/suite/page.tsx", "redirect(\"/suite/deals\")", "/suite must land customers on deals when no DealFlow exists.");
assertFileIncludes("app/suite/page.tsx", "redirect(`/suite/dealflow/${", "/suite must land customers on the latest DealFlow when one exists.");
assertFileIncludes("app/suite/deals/page.tsx", "DealsPageClient", "/suite/deals must render the deals workspace.");
assertAnyFileIncludes(
  ["app/suite/dealflow/[id]/page.tsx", "components/suite/workspaces/DealFlowClient.tsx", "components/suite/DealFlow.tsx"],
  "DealFlow",
  "/suite/dealflow/[id] must render the DealFlow workspace.",
);

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
assertFileIncludes(
  "lib/integrations/stripe.ts",
  "/checkout?plan=",
  "Stripe cancellation must return customers to checkout, not signup",
);

const bannedCopyByFile = new Map([
  ["app/page.tsx", ["Open ADGA", "Get Started", "Request Access"]],
  ["app/pricing/page.tsx", ["Open ADGA", "Get Started", "Request Access", "Close 40% more", "Add 6 deals"]],
  ["app/process/page.tsx", ["Open ADGA", "Get Started", "Request Access"]],
  ["app/cases/page.tsx", ["Open ADGA", "Get Started", "Request Access"]],
  ["app/about/page.tsx", ["Open ADGA", "Get Started", "Request Access"]],
  ["app/contact/page.tsx", ["Open ADGA", "Get Started"]],
  ["components/adga/layout/MarketingLayout.tsx", ["Open ADGA", "Get Started", "Request Access"]],
]);

for (const [relativePath, bannedWords] of bannedCopyByFile) {
  if (!exists(relativePath)) continue;
  for (const banned of bannedWords) {
    assertFileDoesNotInclude(relativePath, banned, `banned public marketing copy "${banned}" must not ship.`);
  }
}

const marketingStyleFiles = ["components/adga/marketing.css"].filter(exists);

for (const relativePath of marketingStyleFiles) {
  assertNoRegex(
    relativePath,
    /repeat\(\s*auto-(?:fit|fill)\s*,\s*minmax\([^)]*\)\s*\)/gi,
    "marketing/readiness grids must not use auto-fit or auto-fill; use explicit balanced grid classes to avoid orphan cards.",
  );
}

const marketingPageFiles = walkFiles("app", (relativePath) => {
  if (!relativePath.endsWith("/page.tsx")) return false;
  return !relativePath.startsWith("app/api/") && !relativePath.startsWith("app/suite/");
});

for (const relativePath of marketingPageFiles) {
  assertNoRegex(
    relativePath,
    /gridTemplateColumns\s*:\s*["'`]repeat\(\s*auto-(?:fit|fill)\s*,/gi,
    "inline marketing grids must not use auto-fit or auto-fill; use balanced grid classes to avoid orphan cards.",
  );
}

if (failures.length) {
  console.error("Launch readiness checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Launch readiness static checks passed.");
