import { readFileSync, writeFileSync } from "node:fs";

const workerPath = ".open-next/worker.js";
let source = readFileSync(workerPath, "utf8");

if (!source.includes("async function serveR2StaticAsset")) {
  source = source.replace(
    "export default {\n    async fetch(request, env, ctx) {",
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

export default {
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

  writeFileSync(workerPath, source);
}
