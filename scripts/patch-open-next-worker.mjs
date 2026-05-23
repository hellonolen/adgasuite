import { readFileSync, writeFileSync } from "node:fs";

const workerPath = ".open-next/worker.js";
let source = readFileSync(workerPath, "utf8");

const ORIGINAL_DEFAULT_OPEN = "export default {\n    async fetch(request, env, ctx) {";

// Step 1: inject R2 static-asset serving + rename the default export object to
// `defaultHandler` so we can wrap it with additional handlers (scheduled, etc.).
if (!source.includes("async function serveR2StaticAsset")) {
  source = source.replace(
    ORIGINAL_DEFAULT_OPEN,
    `function contentType(pathname) {
    if (pathname.endsWith(".js")) return "text/javascript; charset=utf-8";
    if (pathname.endsWith(".css")) return "text/css; charset=utf-8";
    if (pathname.endsWith(".json")) return "application/json; charset=utf-8";
    if (pathname.endsWith(".html")) return "text/html; charset=utf-8";
    if (pathname.endsWith(".svg")) return "image/svg+xml";
    if (pathname.endsWith(".png")) return "image/png";
    if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) return "image/jpeg";
    if (pathname.endsWith(".webp")) return "image/webp";
    if (pathname.endsWith(".ico")) return "image/x-icon";
    if (pathname.endsWith(".woff2")) return "font/woff2";
    return "application/octet-stream";
}

async function serveR2StaticAsset(url, env) {
    if (!env.ASSETS_BUCKET) return null;
    const pathname = decodeURIComponent(url.pathname);
    const isStaticAsset = pathname.startsWith("/_next/static/") || pathname === "/BUILD_ID";
    if (!isStaticAsset) return null;
    const key = "static/" + pathname.replace(/^\\/+/, "");
    const object = await env.ASSETS_BUCKET.get(key);
    if (!object) return null;
    const headers = new Headers();
    headers.set("content-type", object.httpMetadata?.contentType || contentType(pathname));
    headers.set("cache-control", pathname.startsWith("/_next/static/") ? "public, max-age=31536000, immutable" : "no-cache");
    if (object.httpEtag) headers.set("etag", object.httpEtag);
    return new Response(object.body, { headers });
}

const defaultHandler = {
    async fetch(request, env, ctx) {`,
  );

  source = source.replace(
    "            const url = new URL(request.url);\n",
    `            const url = new URL(request.url);
            const staticResponse = await serveR2StaticAsset(url, env);
            if (staticResponse) {
                return staticResponse;
            }
`,
  );
}

// Step 2: add scheduled() handler that drives the autonomous agent loop.
// It dispatches to internal cron endpoints (auth via SESSION_SECRET). Failures
// are logged but never thrown (scheduled handlers must not crash).
if (!source.includes("async function runScheduledCron")) {
  // If step 1 did not run (already patched in a prior build but scheduled is
  // missing), we still need to convert the export-default object into a named
  // handler so we can wrap it.
  if (source.includes(ORIGINAL_DEFAULT_OPEN)) {
    source = source.replace(
      ORIGINAL_DEFAULT_OPEN,
      "const defaultHandler = {\n    async fetch(request, env, ctx) {",
    );
  }

  // Append the cron driver and replace the final export-default block.
  // The renamed `defaultHandler` object already exists in the source; we just
  // need to add the wrapper export at the end of the file.
  source += `

async function runScheduledCron(controller, env, ctx) {
    const cron = controller && controller.cron ? controller.cron : "";
    const path = cron === "0 * * * *" ? "/api/agent/cron/hourly" : "/api/agent/cron/tick";
    const secret = env.SESSION_SECRET || "";
    if (!secret) {
        console.error("[scheduled] SESSION_SECRET not configured; skipping cron " + cron);
        return;
    }
    const req = new Request("https://cron.internal" + path, {
        method: "POST",
        headers: {
            "x-cron-secret": secret,
            "content-type": "application/json",
            "user-agent": "adga-cron/1.0",
        },
        body: "{}",
    });
    try {
        const res = await defaultHandler.fetch(req, env, ctx);
        if (!res.ok) {
            console.error("[scheduled] " + path + " returned " + res.status);
        }
    } catch (error) {
        console.error("[scheduled] " + path + " threw", error);
    }
}

export default {
    fetch: defaultHandler.fetch.bind(defaultHandler),
    async scheduled(controller, env, ctx) {
        ctx.waitUntil(runScheduledCron(controller, env, ctx));
    },
};
`;
}

writeFileSync(workerPath, source);
