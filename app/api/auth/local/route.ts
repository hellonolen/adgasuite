import { json, readJson } from "@/lib/server/http";
import { createEvent } from "@/lib/server/repository";
import { getRuntimeContext } from "@/lib/server/runtime";

export async function POST(request: Request) {
  const context = getRuntimeContext(request);
  const body = await readJson<{ email?: string }>(request);
  const email = (body.email || context.user.email).toLowerCase();

  await createEvent(context.env.DB, {
    organization_id: "org_adga_primary",
    event_type: "auth.local_accessed",
    actor_type: "user",
    actor_id: email,
    resource_type: "local_session",
    resource_id: email,
    payload: { local_admin_bypass: context.user.isLocalAdminBypass },
  });

  return json({
    ok: true,
    user: {
      email,
      role: email === "hellonolen@gmail.com" ? "owner" : "admin",
      local_admin_bypass: context.user.isLocalAdminBypass,
    },
    redirect: "/suite",
  });
}
