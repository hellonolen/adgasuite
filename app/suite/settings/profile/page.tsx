import { headers } from "next/headers";
import ProfileSettingsForm from "./profile-settings-form";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { getRuntimeContext } from "@/lib/server/runtime";

export const dynamic = "force-dynamic";

export default async function SuiteSettingsProfilePage() {
  const headerList = await headers();
  const cookieHeader = headerList.get("cookie");
  const request = new Request("https://internal.local/suite/settings/profile", {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
  const context = getRuntimeContext(request);
  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));

  return (
    <ProfileSettingsForm
      defaults={{
        email: sessionUser?.email || context.user.email || "",
        firstName: (sessionUser?.email || context.user.email || "").split("@")[0] || "",
      }}
    />
  );
}
