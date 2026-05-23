import { redirect } from "next/navigation";

import { type WorkspaceContact, type WorkspaceDeal } from "@/components/suite/WorkspaceMindmap";
import { getAdminRuntime, resolveAdminSession } from "@/lib/server/admin-session";
import MapsGalleryClient from "@/components/suite/workspaces/MapsGalleryClient";

export const dynamic = "force-dynamic";

interface DealRow {
  id: string;
  name: string | null;
  company: string | null;
  stage: string | null;
  value_cents: number | null;
  updated_at: string | null;
  contact_id: string | null;
}

interface ContactRow {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
}

interface DealContactRow {
  deal_id: string;
  contact_id: string;
}

interface CountRow {
  deal_id: string;
  c: number | null;
}

const ACTIVE_STAGES = new Set([
  "qualifying",
  "discovery",
  "proposal",
  "negotiation",
  "closing",
]);

function contactName(row: ContactRow) {
  return (
    row.full_name?.trim() ||
    `${row.first_name || ""} ${row.last_name || ""}`.trim() ||
    "Unnamed contact"
  );
}

async function loadGraph(db: D1Database | undefined) {
  if (!db) {
    return { dealsForMap: seededWorkspaceDeals(), contacts: seededWorkspaceContacts(), gallery: seededGallery() };
  }

  const [dealRows, contactRows, dealContactsRows, nodeCountRows] = await Promise.all([
    db
      .prepare("SELECT id, name, company, stage, value_cents, updated_at, contact_id FROM deals ORDER BY updated_at DESC LIMIT 200")
      .all<DealRow>()
      .then((r) => r.results || [])
      .catch(() => [] as DealRow[]),
    db
      .prepare("SELECT id, full_name, first_name, last_name, company FROM contacts LIMIT 500")
      .all<ContactRow>()
      .then((r) => r.results || [])
      .catch(() => [] as ContactRow[]),
    db
      .prepare("SELECT deal_id, contact_id FROM deal_contacts LIMIT 1000")
      .all<DealContactRow>()
      .then((r) => r.results || [])
      .catch(() => [] as DealContactRow[]),
    db
      .prepare(
        `SELECT deal_id, COUNT(*) AS c FROM (
           SELECT deal_id FROM tasks WHERE deal_id IS NOT NULL
           UNION ALL SELECT deal_id FROM documents WHERE deal_id IS NOT NULL
           UNION ALL SELECT deal_id FROM calendar_events WHERE deal_id IS NOT NULL
         ) GROUP BY deal_id`,
      )
      .all<CountRow>()
      .then((r) => r.results || [])
      .catch(() => [] as CountRow[]),
  ]);

  const contactById = new Map<string, ContactRow>();
  for (const c of contactRows) contactById.set(c.id, c);

  // Build deal → contact mapping. Prefer deal_contacts join table; fall back to deals.contact_id.
  const dealsByContact = new Map<string, string[]>();
  const seen = new Set<string>();
  for (const link of dealContactsRows) {
    const key = `${link.deal_id}:${link.contact_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const arr = dealsByContact.get(link.contact_id) || [];
    arr.push(link.deal_id);
    dealsByContact.set(link.contact_id, arr);
  }
  for (const d of dealRows) {
    if (d.contact_id && !seen.has(`${d.id}:${d.contact_id}`)) {
      const arr = dealsByContact.get(d.contact_id) || [];
      arr.push(d.id);
      dealsByContact.set(d.contact_id, arr);
      seen.add(`${d.id}:${d.contact_id}`);
    }
  }

  const activeDeals = dealRows.filter((d) => ACTIVE_STAGES.has((d.stage || "").toLowerCase()));
  const dealsForMap: WorkspaceDeal[] = activeDeals.slice(0, 16).map((d) => ({
    id: d.id,
    name: d.name || d.id,
    stage: d.stage || "lead",
    value: d.value_cents ? d.value_cents / 100 : undefined,
    company: d.company,
  }));

  const activeDealIds = new Set(dealsForMap.map((d) => d.id));
  const contacts: WorkspaceContact[] = [];
  for (const [contactId, dealIds] of dealsByContact) {
    const linked = dealIds.filter((id) => activeDealIds.has(id));
    if (linked.length === 0) continue;
    const row = contactById.get(contactId);
    if (!row) continue;
    contacts.push({
      id: contactId,
      name: contactName(row),
      company: row.company,
      dealIds: Array.from(new Set(linked)),
    });
  }

  const countByDeal = new Map<string, number>();
  for (const c of nodeCountRows) countByDeal.set(c.deal_id, Number(c.c || 0));

  const gallery = dealRows.slice(0, 24).map((d) => ({
    id: d.id,
    name: d.name || d.id,
    stage: d.stage || "lead",
    updated: d.updated_at,
    nodeCount: 1 + (countByDeal.get(d.id) || 0),
  }));

  return { dealsForMap, contacts, gallery };
}

export default async function MapsGalleryPage() {
  const session = await resolveAdminSession();
  if (!session) {
    redirect("/login?redirect=/suite/maps");
  }

  const { context } = await getAdminRuntime();
  const { dealsForMap, contacts, gallery } = await loadGraph(context.env.DB);

  return <MapsGalleryClient data={{ dealsForMap, contacts, gallery }} />;
}

function seededWorkspaceDeals(): WorkspaceDeal[] {
  return [
    { id: "DEAL-1207", name: "Heliograph — Series C extension", stage: "negotiation", value: 42_000_000, company: "Heliograph Industries" },
    { id: "DEAL-1209", name: "Larkfield — Strategic partnership", stage: "proposal", value: 9_750_000, company: "Larkfield Capital" },
    { id: "DEAL-1210", name: "Meridian Cold Chain — Acquisition", stage: "closing", value: 215_000_000, company: "Meridian Cold Chain" },
    { id: "DEAL-1213", name: "Quorum Energy — JV", stage: "proposal", value: 88_000_000, company: "Quorum Energy" },
    { id: "DEAL-1214", name: "Kestrel Defense — Procurement", stage: "negotiation", value: 27_500_000, company: "Kestrel Defense" },
    { id: "DEAL-1218", name: "Tessellate — Series B", stage: "negotiation", value: 24_000_000, company: "Tessellate Robotics" },
    { id: "DEAL-1222", name: "Heliograph — Bolt-on Tessellate", stage: "discovery", value: 38_000_000, company: "Heliograph Industries" },
    { id: "DEAL-1224", name: "Quorum — Carbon credits", stage: "qualifying", value: 3_400_000, company: "Quorum Energy" },
  ];
}

function seededWorkspaceContacts(): WorkspaceContact[] {
  return [
    { id: "c-aurore", name: "Aurore Chastain", company: "Sutter Maritime", dealIds: ["DEAL-1207", "DEAL-1210"] },
    { id: "c-beni", name: "Beni Okonkwo", company: "Foundry Helix", dealIds: ["DEAL-1207"] },
    { id: "c-maren", name: "Maren Voss", company: "Concorde", dealIds: ["DEAL-1213", "DEAL-1224"] },
    { id: "c-magnus", name: "Magnus Bell", company: "Quorum", dealIds: ["DEAL-1213"] },
    { id: "c-lin", name: "Linnea Bjorne", company: "Stellaris Compute", dealIds: ["DEAL-1218", "DEAL-1222"] },
    { id: "c-pieter", name: "Pieter Voorhees", company: "Calderwood", dealIds: ["DEAL-1214"] },
    { id: "c-saskia", name: "Saskia Krieg", company: "Brunswick Spectrum", dealIds: ["DEAL-1209"] },
    { id: "c-roan", name: "Roan Iwasaki", company: "Telluride Aerospace", dealIds: ["DEAL-1214", "DEAL-1218"] },
  ];
}

function seededGallery() {
  return [
    { id: "DEAL-1210", name: "Meridian Cold Chain — Acquisition", stage: "closing", updated: "2026-05-22T06:00:00.000Z", nodeCount: 14 },
    { id: "DEAL-1207", name: "Heliograph — Series C extension", stage: "negotiation", updated: "2026-05-22T03:30:00.000Z", nodeCount: 11 },
    { id: "DEAL-1218", name: "Tessellate — Series B participation", stage: "negotiation", updated: "2026-05-22T00:10:00.000Z", nodeCount: 9 },
    { id: "DEAL-1213", name: "Quorum Energy — Joint venture", stage: "proposal", updated: "2026-05-19T14:00:00.000Z", nodeCount: 7 },
    { id: "DEAL-1214", name: "Kestrel Defense — Procurement", stage: "negotiation", updated: "2026-05-21T18:00:00.000Z", nodeCount: 8 },
    { id: "DEAL-1209", name: "Larkfield Capital — Strategic partnership", stage: "proposal", updated: "2026-05-21T11:30:00.000Z", nodeCount: 6 },
  ];
}
