import { headers } from "next/headers";
import ProfileSettingsForm from "./profile-settings-form";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import { getRuntimeContext } from "@/lib/server/runtime";
import { organizationIdForSession } from "@/lib/server/tenant";

export const dynamic = "force-dynamic";

export default async function SuiteSettingsProfilePage() {
  const headerList = await headers();
  const cookieHeader = headerList.get("cookie");
  const request = new Request("https://internal.local/suite/settings/profile", {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
  const context = getRuntimeContext(request);
  const sessionUser = await validateSession(context.env.DB, readSessionCookie(request));
  const email = sessionUser?.email || context.user.email || "";
  const savedProfile: Record<string, unknown> = context.env.DB
    ? await context.env.DB
        .prepare("SELECT values_json FROM organization_settings WHERE organization_id = ? AND panel = 'profile' LIMIT 1")
        .bind(organizationIdForSession(sessionUser))
        .first<{ values_json: string }>()
        .then((row) => safeJson(row?.values_json))
        .catch((): Record<string, unknown> => ({}))
    : {};

  return (
    <ProfileSettingsForm
      defaults={{
        firstName: stringValue(savedProfile.first_name) || email.split("@")[0] || "",
        lastName: stringValue(savedProfile.last_name),
        email: stringValue(savedProfile.email) || email,
        title: stringValue(savedProfile.title),
        phone: stringValue(savedProfile.phone),
        timezone: stringValue(savedProfile.timezone) || "America/New_York",
        signature: stringValue(savedProfile.signature),
      }}
    />
  );
}

function safeJson(value?: string) {
  if (!value) return {};
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}
