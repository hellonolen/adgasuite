import { cookies, headers } from "next/headers";

import { getRuntimeContext, type RuntimeContext } from "@/lib/server/runtime";
import {
  AUTH_COOKIE_NAME,
  validateSession,
  type SessionUser,
} from "@/lib/server/magic-auth";

export interface AdminSession {
  email: string;
  role: "owner" | "admin" | "member";
  organizationId: string | null;
  isBypass: boolean;
}

async function buildRequest(): Promise<Request> {
  const headerList = await headers();
  const requestHeaders = new Headers();
  const bypassEmail = headerList.get("x-adga-admin-email");
  const cookieHeader = headerList.get("cookie");
  const host = headerList.get("x-forwarded-host") || headerList.get("host") || "internal.local";
  const proto = headerList.get("x-forwarded-proto") || "https";
  if (bypassEmail) requestHeaders.set("x-adga-admin-email", bypassEmail);
  if (cookieHeader) requestHeaders.set("cookie", cookieHeader);
  return new Request(`${proto}://${host}/`, { headers: requestHeaders });
}

export async function getAdminRuntime(): Promise<{
  context: RuntimeContext;
  cookieValue: string | null;
}> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null;
  const request = await buildRequest();
  return { context: getRuntimeContext(request), cookieValue };
}

export async function resolveAdminSession(): Promise<AdminSession | null> {
  const { context, cookieValue } = await getAdminRuntime();
  const dbSession: SessionUser | null = await validateSession(context.env.DB, cookieValue);

  if (dbSession) {
    return {
      email: dbSession.email,
      role: dbSession.role,
      organizationId: dbSession.organization_id,
      isBypass: false,
    };
  }

  if (context.user.isLocalAdminBypass && context.user.email) {
    const role =
      context.user.email === "hellonolen@gmail.com" ? "owner" : context.user.role;
    return {
      email: context.user.email,
      role,
      organizationId: "org_adga_primary",
      isBypass: true,
    };
  }

  return null;
}

export function isOwner(session: AdminSession | null): boolean {
  return !!session && session.role === "owner";
}
