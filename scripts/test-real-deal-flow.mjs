const baseUrl = process.env.BASE_URL || "http://localhost:3010";
const checks = [];

async function check(name, fn) {
  try {
    await fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function get(path) {
  return fetch(`${baseUrl}${path}`, { redirect: "manual" });
}

async function postJson(path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    redirect: "manual",
  });
}

await check("home page responds", async () => {
  const response = await get("/");
  assert(response.status === 200, `expected 200, got ${response.status}`);
  const html = await response.text();
  assert(html.includes("ADGA"), "homepage did not render ADGA content");
});

await check("suite opens locally without login", async () => {
  const response = await get("/suite");
  assert(response.status === 200, `expected 200, got ${response.status}`);
});

await check("suite state returns local owner context", async () => {
  const response = await get("/api/suite/state");
  assert(response.status === 200, `expected 200, got ${response.status}`);
  const data = await response.json();
  assert(data.ok === true, "suite state did not return ok");
  assert(data.user?.isLocalAdminBypass === true, "local bypass user was not active on localhost");
});

await check("stripe checkout validates email", async () => {
  const response = await postJson("/api/billing/stripe/checkout", {
    email: "not-an-email",
    plan: "team",
    seats: 5,
    cadence: "month",
  });
  assert(response.status === 400, `expected 400, got ${response.status}`);
});

await check("stripe checkout creates a controlled response", async () => {
  const response = await postJson("/api/billing/stripe/checkout", {
    email: "launch-test@example.com",
    name: "Launch Test",
    plan: "pro",
    seats: 99,
    cadence: "month",
  });
  const data = await response.json();
  assert(response.status === 200 || response.status === 502 || response.status === 503, `unexpected status ${response.status}`);
  assert(data.ok === true || data.ok === false, "checkout response missing ok flag");
  if (response.status === 200) {
    assert(data.provider === "stripe", "checkout did not use stripe provider");
    assert(data.seats === 1 || data.configured === false, "pro checkout must not allow team seats");
  }
});

const failed = checks.filter((item) => !item.ok);
for (const item of checks) {
  console.log(`${item.ok ? "ok" : "not ok"} - ${item.name}${item.ok ? "" : `: ${item.error}`}`);
}

if (failed.length) process.exit(1);
