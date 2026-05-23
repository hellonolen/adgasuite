import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";
import NewContactFormClient from "@/components/suite/workspaces/NewContactFormClient";

export const dynamic = "force-dynamic";

export default async function NewContactPage() {
  const headerList = await headers();
  const cookieHeader = headerList.get("cookie") || "";
  const proxyRequest = new Request("http://localhost/", { headers: { cookie: cookieHeader } });
  const context = getRuntimeContext(proxyRequest);
  const sessionUser = await validateSession(context.env.DB, readSessionCookie(proxyRequest));
  if (!sessionUser && !context.user.isLocalAdminBypass) {
    redirect("/login?redirect=/suite/contacts/new");
  }
  return <NewContactFormClient />;
}
