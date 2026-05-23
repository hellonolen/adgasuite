import { redirect } from "next/navigation";
import { headers } from "next/headers";
import ContactsList from "@/components/suite/ContactsList";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const headerList = await headers();
  const cookieHeader = headerList.get("cookie") || "";
  const proxyRequest = new Request("http://localhost/", { headers: { cookie: cookieHeader } });
  const context = getRuntimeContext(proxyRequest);
  const sessionUser = await validateSession(context.env.DB, readSessionCookie(proxyRequest));
  if (!sessionUser && !context.user.isLocalAdminBypass) {
    redirect("/login?redirect=/suite/contacts");
  }

  return <ContactsList />;
}
