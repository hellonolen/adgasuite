#!/usr/bin/env node
// CSS audit — measures the cascade so any future cleanup can prove it improved
// things (or didn't). Run: npm run css:audit.
//
// Tracks per file: lines, selectors, !important, @media count, custom-property
// declarations. Writes the snapshot to .css-audit.json so we have a baseline.

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const FILES = [
  "app/globals.css",
  "components/adga/marketing.css",
  "components/adga/styles.css",
  "components/adga/styles-v4.css",
  "components/adga/design-system.css",
  "components/adga/final-overrides.css",
];

function count(text, re) {
  const m = text.match(re);
  return m ? m.length : 0;
}

async function auditOne(rel) {
  const abs = path.join(ROOT, rel);
  if (!existsSync(abs)) return { file: rel, exists: false };
  const text = await readFile(abs, "utf-8");
  return {
    file: rel,
    exists: true,
    bytes: text.length,
    lines: text.split("\n").length,
    selectors: count(text, /^\s*[.#a-zA-Z\[][^{}\n]*\{/gm),
    important: count(text, /!important/g),
    media_queries: count(text, /@media\b/g),
    custom_properties: count(text, /^\s*--[a-z][a-z0-9-]*:/gim),
    keyframes: count(text, /@keyframes\b/g),
    has_tailwind_import: text.includes('@import "tailwindcss"'),
  };
}

const reports = await Promise.all(FILES.map(auditOne));
const totals = reports
  .filter((r) => r.exists)
  .reduce(
    (acc, r) => ({
      bytes: acc.bytes + r.bytes,
      lines: acc.lines + r.lines,
      selectors: acc.selectors + r.selectors,
      important: acc.important + r.important,
      media_queries: acc.media_queries + r.media_queries,
      custom_properties: acc.custom_properties + r.custom_properties,
      keyframes: acc.keyframes + r.keyframes,
    }),
    { bytes: 0, lines: 0, selectors: 0, important: 0, media_queries: 0, custom_properties: 0, keyframes: 0 },
  );

const snapshot = {
  generated_at: new Date().toISOString(),
  files: reports,
  totals,
};

const outPath = path.join(ROOT, ".css-audit.json");
await writeFile(outPath, JSON.stringify(snapshot, null, 2));

console.log("CSS audit:");
for (const r of reports) {
  if (!r.exists) {
    console.log(`  · ${r.file} (missing)`);
    continue;
  }
  console.log(
    `  · ${r.file.padEnd(40)}  ${String(r.lines).padStart(5)} lines  ${String(r.important).padStart(3)} !important  ${String(r.selectors).padStart(4)} selectors  ${String(r.media_queries).padStart(3)} media`,
  );
}
console.log(
  `  TOTAL                                     ${String(totals.lines).padStart(5)} lines  ${String(totals.important).padStart(3)} !important  ${String(totals.selectors).padStart(4)} selectors  ${String(totals.media_queries).padStart(3)} media`,
);
console.log(`\nSnapshot written to ${path.relative(ROOT, outPath)}`);
