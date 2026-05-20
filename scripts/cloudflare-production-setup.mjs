const token = process.env.CLOUDFLARE_API_TOKEN;
const zoneName = process.env.CLOUDFLARE_ZONE_NAME || "adga.ai";
const workerName = process.env.CLOUDFLARE_WORKER_NAME || "adga-suite";

if (!token) {
  throw new Error("CLOUDFLARE_API_TOKEN is required.");
}

const api = "https://api.cloudflare.com/client/v4";

async function cf(path, init = {}) {
  const response = await fetch(`${api}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    const detail = JSON.stringify(payload.errors || payload, null, 2);
    throw new Error(`Cloudflare API failed for ${path}: ${detail}`);
  }
  return payload.result;
}

async function getZone() {
  const zones = await cf(`/zones?name=${encodeURIComponent(zoneName)}`);
  const zone = zones[0];
  if (!zone) throw new Error(`Cloudflare zone not found: ${zoneName}`);
  if (zone.status !== "active") {
    throw new Error(`Cloudflare zone ${zoneName} is ${zone.status}, not active.`);
  }
  return zone;
}

async function upsertDnsRecord(zoneId, desired) {
  const params = new URLSearchParams({ type: desired.type, name: desired.name });
  const records = await cf(`/zones/${zoneId}/dns_records?${params.toString()}`);
  const existing = records[0];
  const body = JSON.stringify(desired);

  if (existing) {
    await cf(`/zones/${zoneId}/dns_records/${existing.id}`, {
      method: "PUT",
      body,
    });
    console.log(`Updated DNS ${desired.type} ${desired.name}`);
    return;
  }

  await cf(`/zones/${zoneId}/dns_records`, {
    method: "POST",
    body,
  });
  console.log(`Created DNS ${desired.type} ${desired.name}`);
}

async function ensureWorkerRoute(zoneId, pattern) {
  const routes = await cf(`/zones/${zoneId}/workers/routes`);
  const existing = routes.find((route) => route.pattern === pattern);
  const body = JSON.stringify({ pattern, script: workerName });

  if (existing) {
    if (existing.script !== workerName) {
      await cf(`/zones/${zoneId}/workers/routes/${existing.id}`, {
        method: "PUT",
        body,
      });
      console.log(`Updated Worker route ${pattern}`);
    } else {
      console.log(`Worker route already correct ${pattern}`);
    }
    return;
  }

  await cf(`/zones/${zoneId}/workers/routes`, {
    method: "POST",
    body,
  });
  console.log(`Created Worker route ${pattern}`);
}

const zone = await getZone();

await upsertDnsRecord(zone.id, {
  type: "A",
  name: zoneName,
  content: "192.0.2.1",
  ttl: 1,
  proxied: true,
});

await upsertDnsRecord(zone.id, {
  type: "CNAME",
  name: `www.${zoneName}`,
  content: zoneName,
  ttl: 1,
  proxied: true,
});

await ensureWorkerRoute(zone.id, `${zoneName}/*`);
await ensureWorkerRoute(zone.id, `www.${zoneName}/*`);

console.log(`Cloudflare production zone is configured for ${zoneName}.`);
