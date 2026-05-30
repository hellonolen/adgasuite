/**
 * Suite route contract — single source of truth for every /suite/* URL.
 *
 * The sidebar, layout, breadcrumbs, command bar, and route matchers all consume this
 * registry. Adding a new route or sub-route means editing this file, not hand-writing
 * a new page.tsx wrapper somewhere in the tree.
 *
 * Each entry maps:
 *   - id       : internal route key used by AdgaSuite's workspace render switch
 *   - path     : canonical /suite/<segment> URL
 *   - label    : sidebar / breadcrumb display string
 *   - section  : sidebar group ("" = top, "LIBRARY", "PERSONAL", "OWNER", "HIDDEN")
 *   - badge    : optional numeric badge for the sidebar item
 *   - indicator: optional pulse dot tone (e.g. "accent")
 *   - ownerOnly: hide unless user.role === "owner"
 *   - sections : sub-routes under this route (e.g. settings has profile / notifications / billing)
 *   - capabilities: declared agentic capabilities the page surfaces; consumed by mcp-server.ts
 */

export type RouteSection = "" | "VIEWS" | "LIBRARY" | "PERSONAL" | "OWNER" | "HIDDEN";

export interface SuiteSubSection {
  /** Internal section key the workspace component reads (e.g. SettingsPage's `section` state). */
  id: string;
  /** URL path under the parent route (e.g. "/suite/settings/billing"). */
  path: string;
  /** Visible label inside the parent workspace's section nav. */
  label: string;
}

export interface SuiteRoute {
  id: string;
  path: string;
  label: string;
  section: RouteSection;
  badge?: number;
  indicator?: "accent";
  ownerOnly?: boolean;
  sections?: SuiteSubSection[];
  capabilities?: string[];
}

export const SUITE_ROUTES: SuiteRoute[] = [
  // Top — the platform's primitives. A deal opens onto its canvas.
  { id: "home",         path: "/suite",             label: "Home",         section: "HIDDEN",    capabilities: ["deal.read", "task.read"] },
  { id: "today",        path: "/suite/home",        label: "Today",        section: "",          capabilities: ["brief.read"] },
  { id: "maps",         path: "/suite/deals",       label: "Deals",        section: "",          capabilities: ["map.read", "map.create", "deal.read"] },

  // Lens views — every entry below is a projection of the same deal data.
  { id: "pipeline",     path: "/suite/pipeline",    label: "Pipeline",     section: "VIEWS",     capabilities: ["deal.read", "deal.update_stage"] },
  { id: "leads",        path: "/suite/leads",       label: "Leads",        section: "VIEWS",     capabilities: ["lead.read", "lead.qualify"] },
  { id: "crm",          path: "/suite/contacts",    label: "Contacts",     section: "VIEWS",     capabilities: ["contact.read", "contact.create"] },
  { id: "documents",    path: "/suite/documents",   label: "Documents",    section: "VIEWS",     capabilities: ["document.read", "document.upload"] },
  { id: "calendar",     path: "/suite/calendar",    label: "Calendar",     section: "VIEWS",     badge: 3, capabilities: ["calendar.read", "meeting.schedule"] },
  { id: "inbox",        path: "/suite/inbox",       label: "Inbox",        section: "VIEWS",     badge: 7, capabilities: ["message.read"] },
  { id: "pending",      path: "/suite/pending",     label: "Approvals",    section: "HIDDEN",    badge: 8, indicator: "accent", capabilities: ["approval.read", "approval.decide"] },

  { id: "knowledge",    path: "/suite/templates",   label: "Templates",    section: "LIBRARY",   capabilities: ["template.read"] },
  { id: "lists",        path: "/suite/lists",       label: "Lists",        section: "LIBRARY",   capabilities: ["list.read", "list.create", "list.query"] },
  { id: "intelligence", path: "/suite/intelligence",label: "Analytics",    section: "LIBRARY",   capabilities: ["forecast.read", "analytics.read"] },
  { id: "import",       path: "/suite/import",      label: "Import",       section: "LIBRARY",   capabilities: ["import.upload", "import.preview", "import.run", "import.retry"] },
  { id: "inbox-sync",   path: "/suite/inbox-sync",  label: "Inbox sync",   section: "LIBRARY",   capabilities: ["inbox.connect", "inbox.sync_full", "inbox.sync_incremental", "inbox.disconnect"] },

  {
    id: "settings",
    path: "/suite/settings",
    label: "Settings",
    section: "PERSONAL",
    sections: [
      { id: "profile",      path: "/suite/settings/profile",      label: "Profile" },
      { id: "notif",        path: "/suite/settings/notifications", label: "Notifications" },
      { id: "display",      path: "/suite/settings",               label: "Display" },
      { id: "shortcuts",    path: "/suite/settings",               label: "Keyboard shortcuts" },
      { id: "ws",           path: "/suite/settings",               label: "General" },
      { id: "brand",        path: "/suite/settings",               label: "Branding" },
      { id: "integrations", path: "/suite/settings/integrations",  label: "Integrations" },
      { id: "user-billing", path: "/suite/settings/billing",       label: "Billing" },
      { id: "seats",        path: "/suite/settings/seats",         label: "Seats" },
    ],
    capabilities: ["settings.read", "settings.update", "seats.read", "seats.update"],
  },

  {
    id: "admin",
    path: "/suite/admin",
    label: "Admin",
    section: "OWNER",
    ownerOnly: true,
    sections: [
      { id: "users",     path: "/suite/admin/team",      label: "Team" },
      { id: "roles",     path: "/suite/admin/roles",     label: "Roles" },
      { id: "audit",     path: "/suite/admin/audit",     label: "Audit log" },
      { id: "workspace", path: "/suite/admin/workspace", label: "Workspace" },
    ],
    capabilities: ["admin.read", "role.assign", "audit.read"],
  },
  {
    id: "affiliates",
    path: "/suite/affiliate",
    label: "Affiliate Center",
    section: "OWNER",
    ownerOnly: true,
    sections: [
      { id: "overview",    path: "/suite/affiliate",             label: "Overview" },
      { id: "leaderboard", path: "/suite/affiliate/leaderboard", label: "Leaderboard" },
      { id: "links",       path: "/suite/affiliate/links",       label: "Links" },
      { id: "payouts",     path: "/suite/affiliate/payouts",     label: "Payouts" },
    ],
    capabilities: ["affiliate.read", "payout.process"],
  },
  { id: "invoicing", path: "/suite/invoicing", label: "Invoicing", section: "OWNER", ownerOnly: true, capabilities: ["invoice.read", "invoice.send"] },

  // Hidden / programmatic — reachable but not in sidebar
  { id: "billing",     path: "/suite/billing",     label: "Billing",     section: "HIDDEN", capabilities: ["billing.read"] },
  { id: "onboarding",  path: "/suite/onboarding",  label: "Onboarding",  section: "HIDDEN", capabilities: ["settings.update", "billing.read"] },
  { id: "story",       path: "/suite/story",       label: "Story",       section: "HIDDEN", capabilities: ["story.read"] },
  { id: "tasks",       path: "/suite/tasks",       label: "Tasks",       section: "HIDDEN", capabilities: ["task.read"] },
  { id: "teams",       path: "/suite/teams",       label: "Teams",       section: "HIDDEN", capabilities: ["team.read"] },
  { id: "reports",     path: "/suite/reports",     label: "Reports",     section: "HIDDEN", capabilities: ["report.read"] },
  { id: "messaging",   path: "/suite/messaging",   label: "Messaging",   section: "HIDDEN", capabilities: ["message.read"] },
  { id: "voice-notes", path: "/suite/voice-notes", label: "Voice Notes", section: "HIDDEN", capabilities: ["voice.read", "voice.transcribe"] },
  { id: "map",         path: "/suite/dealflow",    label: "Dealflow",    section: "HIDDEN", capabilities: ["map.read", "map.update"] },
];

const ROUTE_BY_ID = new Map<string, SuiteRoute>(SUITE_ROUTES.map((r) => [r.id, r]));
const ROUTE_BY_PATH = new Map<string, SuiteRoute>(SUITE_ROUTES.map((r) => [r.path, r]));

export const SUITE_ROUTE_IDS = SUITE_ROUTES.map((r) => r.id);

export const ROUTE_PATHS: Record<string, string> = Object.fromEntries(
  SUITE_ROUTES.map((r) => [r.id, r.path]),
);

export const ROUTE_LABELS: Record<string, string> = Object.fromEntries(
  SUITE_ROUTES.map((r) => [r.id, r.label]),
);

/** Resolve a /suite/* pathname to its route + (optional) sub-section. Returns null if unknown. */
export function resolveSuitePathname(pathname: string): { route: SuiteRoute; section?: SuiteSubSection } | null {
  if (!pathname) return null;
  const path = pathname.replace(/\/+$/, "") || "/suite";

  // Exact path match wins (handles /suite, /suite/pipeline, /suite/settings/billing).
  const exact = ROUTE_BY_PATH.get(path);
  if (exact) return { route: exact };

  // Try sub-section match (e.g. /suite/settings/profile).
  for (const route of SUITE_ROUTES) {
    if (!route.sections) continue;
    const sub = route.sections.find((s) => s.path === path);
    if (sub) return { route, section: sub };
  }

  // Dynamic segments: /suite/dealflow/<id>, /suite/deals/new. /suite/map and /suite/maps are legacy aliases.
  const segments = path.replace(/^\/+/, "").split("/");
  if (segments[0] === "suite") {
    if (segments[1] === "dealflow" && segments[2]) return { route: ROUTE_BY_ID.get("map")! };
    if (segments[1] === "map" && segments[2]) return { route: ROUTE_BY_ID.get("map")! };
    if (segments[1] === "deals") return { route: ROUTE_BY_ID.get("maps")! };
    if (segments[1] === "maps") return { route: ROUTE_BY_ID.get("maps")! };
  }

  return null;
}

export function getSuiteRouteById(id: string): SuiteRoute | undefined {
  return ROUTE_BY_ID.get(id);
}

/** Sidebar groups, ordered for rendering. */
export function getSidebarGroups(opts: { ownerView: boolean } = { ownerView: true }) {
  const sections: RouteSection[] = ["", "VIEWS", "LIBRARY", "PERSONAL", "OWNER"];
  return sections
    .map((section) => ({
      section,
      items: SUITE_ROUTES.filter((r) => r.section === section)
        .filter((r) => !r.ownerOnly || opts.ownerView)
        .map((r) => ({
          id: r.id,
          path: r.path,
          label: r.label,
          badge: r.badge,
          indicator: r.indicator,
        })),
    }))
    .filter((group) => group.items.length > 0);
}
