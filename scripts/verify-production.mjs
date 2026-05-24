const origin = process.env.PRODUCTION_ORIGIN || "https://adga.ai";
const host = new URL(origin).hostname;

async function assertFetch(url, options = {}) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      accept: "application/dns-json, application/json, text/html, */*",
      "user-agent": "adga-production-verifier/1.0",
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return response;
}

async function assertStatus(url, expectedStatus, options = {}) {
  const response = await fetch(url, {
    redirect: "manual",
    headers: {
      accept: "application/json, text/html, */*",
      "user-agent": "adga-production-verifier/1.0",
    },
    ...options,
  });

  if (response.status !== expectedStatus) {
    throw new Error(`${url} returned ${response.status}; expected ${expectedStatus}`);
  }

  return response;
}

async function assertDns(provider, url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/dns-json",
      "user-agent": "adga-production-verifier/1.0",
    },
  });
  if (!response.ok) {
    throw new Error(`${provider} DNS query returned ${response.status}: ${await response.text()}`);
  }
  const payload = await response.json();
  if (payload.Status !== 0 || !Array.isArray(payload.Answer) || payload.Answer.length === 0) {
    throw new Error(`${provider} did not resolve ${host}: ${JSON.stringify(payload)}`);
  }
  console.log(`${provider} resolves ${host}`);
}

function assetUrls(html) {
  const urls = new Set();
  const patterns = [
    /<link[^>]+href="([^"]*_next\/static\/[^"]+)"/g,
    /<script[^>]+src="([^"]*_next\/static\/[^"]+)"/g,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      urls.add(new URL(match[1], origin).toString());
    }
  }

  return [...urls];
}

await assertDns(
  "Cloudflare DNS",
  `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`,
);
await assertDns("Google DNS", `https://dns.google/resolve?name=${encodeURIComponent(host)}&type=A`);

const home = await assertFetch(`${origin}/`);
const homeHtml = await home.text();
if (!homeHtml.includes("ADGA")) {
  throw new Error(`${origin}/ did not return the ADGA application shell.`);
}
console.log(`${origin}/ is reachable`);

await assertFetch(`${origin}/suite`);
console.log(`${origin}/suite is reachable`);

await assertFetch(`${origin}/5-secrets`);
console.log(`${origin}/5-secrets is reachable`);

await assertFetch(`${origin}/login`);
console.log(`${origin}/login is reachable`);

const accessResponse = await fetch(`${origin}/5-secrets/access`, {
  redirect: "manual",
  headers: {
    accept: "text/html, */*",
    "user-agent": "adga-production-verifier/1.0",
  },
});
if (![302, 307, 308].includes(accessResponse.status) || accessResponse.headers.get("location") !== "/5-secrets") {
  throw new Error(`${origin}/5-secrets/access should redirect unauthenticated visitors to /5-secrets; got ${accessResponse.status}`);
}
console.log(`${origin}/5-secrets/access gate is active`);

const health = await assertFetch(`${origin}/api/health`);
const healthJson = await health.json();
if (healthJson.ok !== true || healthJson.platform !== "ADGA Suite") {
  throw new Error(`Unexpected health response: ${JSON.stringify(healthJson)}`);
}
console.log(`${origin}/api/health is ready`);

await assertStatus(`${origin}/api/agent/cron/tick`, 403, {
  method: "POST",
  headers: {
    accept: "application/json",
    "content-type": "application/json",
    "user-agent": "adga-production-verifier/1.0",
  },
  body: "{}",
});
console.log(`${origin}/api/agent/cron/tick rejects unauthenticated requests`);

await assertStatus(`${origin}/api/dealflows`, 401, {
  headers: {
    accept: "application/json",
    "user-agent": "adga-production-verifier/1.0",
  },
});
console.log(`${origin}/api/dealflows is auth-protected`);

const assets = assetUrls(homeHtml).slice(0, 8);
if (assets.length === 0) {
  throw new Error("No Next static assets found in production HTML.");
}

for (const asset of assets) {
  await assertFetch(asset);
  console.log(`asset reachable ${new URL(asset).pathname}`);
}

console.log("Production verification passed.");
