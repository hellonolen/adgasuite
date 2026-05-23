import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  type ContactDetailData,
  type ContactEvent,
} from "@/components/suite/ContactDetail";
import ContactDetailClient from "@/components/suite/workspaces/ContactDetailClient";
import { getRuntimeContext } from "@/lib/server/runtime";
import { readSessionCookie, validateSession } from "@/lib/server/magic-auth";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

const ORG_ID = "org_adga_primary";

export default async function ContactDetailPage({ params }: PageProps) {
  const { id } = await params;
  const headerList = await headers();
  const cookieHeader = headerList.get("cookie") || "";
  const proxyRequest = new Request("http://localhost/", { headers: { cookie: cookieHeader } });
  const context = getRuntimeContext(proxyRequest);
  const db = context.env.DB;

  const sessionUser = await validateSession(db, readSessionCookie(proxyRequest));
  if (!sessionUser && !context.user.isLocalAdminBypass) {
    redirect(`/login?redirect=/suite/contacts/${encodeURIComponent(id)}`);
  }

  if (!db) {
    return (
      <div className="bg-[#f9f7f4] p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#e8e4de] bg-white p-8">
          <h1 className="text-xl font-semibold text-[#0d0c0a]">Database not configured</h1>
          <p className="mt-2 text-sm text-[#6b6760]">
            Contact detail pages require a Cloudflare D1 binding. Configure DB in your environment.
          </p>
        </div>
      </div>
    );
  }

  const contact = await db
    .prepare("SELECT * FROM contacts WHERE id = ? AND organization_id = ? LIMIT 1")
    .bind(id, ORG_ID)
    .first<ContactDetailData>();

  if (!contact) notFound();

  const events = await db
    .prepare(
      `SELECT id, event_type, actor_type, actor_id, payload_json, created_at
       FROM events
       WHERE resource_type = 'contact' AND resource_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
    )
    .bind(id)
    .all<ContactEvent>();

  return <ContactDetailClient contact={contact} events={events.results || []} />;
}
