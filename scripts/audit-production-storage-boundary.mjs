import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const schemaPath = path.join(root, "cloudflare/db/schema.sql");
const schema = fs.readFileSync(schemaPath, "utf8");

const requiredPointerTables = [
  "leads",
  "contacts",
  "sms_messages",
  "communication_messages",
  "client_invoices",
  "deal_representations",
  "voice_notes",
  "voice_calls",
  "maps",
  "map_nodes",
  "map_edges",
];

const archiveTables = ["leads", "contacts", "deals", "maps", "map_nodes", "map_edges", "map_shares"];
const scopedRoutes = ["app/api", "lib/server"];
const failures = [];

function tableBody(table) {
  const pattern = new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\((?<body>[\\s\\S]*?)\\n\\);`, "m");
  return schema.match(pattern)?.groups?.body || "";
}

for (const table of requiredPointerTables) {
  const body = tableBody(table);
  if (!body) {
    failures.push(`Missing table in schema: ${table}`);
    continue;
  }
  if (!body.includes("payload_r2_key TEXT")) failures.push(`${table} missing payload_r2_key pointer`);
  if (!body.includes("storage_object_id TEXT")) failures.push(`${table} missing storage_object_id pointer`);
}

for (const table of archiveTables) {
  const body = tableBody(table);
  if (!body) {
    failures.push(`Missing archive-policy table in schema: ${table}`);
    continue;
  }
  if (!body.includes("archived_at TEXT")) failures.push(`${table} missing archived_at archive-policy column`);
}

const hardDeletePattern = /DELETE\s+FROM\s+(leads|contacts|deals|maps|map_nodes|map_edges|map_shares|voice_notes|voice_calls|sms_messages|communication_messages|client_invoices|documents|storage_objects)\b/i;
const directPayloadReadPattern = /\breadJsonPayload\s*</;
const requiredTenantHydrationRoutes = new Set([
  "app/api/leads/route.ts",
  "app/api/contacts/route.ts",
  "app/api/contacts/[id]/route.ts",
  "app/api/invoices/route.ts",
]);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (!/\.(ts|tsx|mjs|js)$/.test(entry.name)) return [];
    return [fullPath];
  });
}

for (const scope of scopedRoutes) {
  for (const file of walk(path.join(root, scope))) {
    const rel = path.relative(root, file);
    const source = fs.readFileSync(file, "utf8");
    const hardDelete = source.match(hardDeletePattern);
    if (hardDelete) failures.push(`${rel} contains hard delete for ${hardDelete[1]}; archive or revoke instead`);
    if (rel !== "lib/server/payload-storage.ts" && directPayloadReadPattern.test(source)) {
      failures.push(`${rel} reads JSON payloads without storage_object bucket metadata; use readStoredJsonPayload`);
    }
    if (requiredTenantHydrationRoutes.has(rel)) {
      const calls = source.match(/readStoredJsonPayload<[\s\S]*?\);/g) || [];
      for (const call of calls) {
        if (!/\b(organizationId|ORG_ID|session\.organizationId)\b/.test(call)) {
          failures.push(`${rel} hydrates R2 payloads without an organization boundary`);
        }
      }
    }
  }
}

const payloadStorage = fs.readFileSync(path.join(root, "lib/server/payload-storage.ts"), "utf8");
if (!payloadStorage.includes("storageObject.organization_id !== organizationId")) {
  failures.push("lib/server/payload-storage.ts must reject storage_object payload reads outside the requested organization");
}

const documentUpload = fs.readFileSync(path.join(root, "app/api/documents/upload/route.ts"), "utf8");
if (!documentUpload.includes("const bucketName = context.env.DOCUMENTS_BUCKET ? \"documents\" : \"uploads\"")) {
  failures.push("app/api/documents/upload/route.ts must record the actual R2 bucket used for document uploads");
}

if (failures.length) {
  console.error("Production storage boundary audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Production storage boundary audit passed.");
console.log(`Checked ${requiredPointerTables.length} pointer tables, ${archiveTables.length} archive tables, and route/server source for hard deletes and direct payload reads.`);
