"use client";

/**
 * Maps gallery client — fed by the server-side /suite/maps page. Renders inside the suite
 * layout's workspace area; the shell (sidebar, topbar, voice panel) is provided by the layout.
 */

import { WorkspaceMindmap, type WorkspaceContact, type WorkspaceDeal } from "@/components/suite/WorkspaceMindmap";

export interface MapsGalleryData {
  dealsForMap: WorkspaceDeal[];
  contacts: WorkspaceContact[];
  gallery: Array<{
    id: string;
    name: string;
    stage: string;
    updated: string | null;
    nodeCount: number;
  }>;
}

function relTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;
  const delta = Date.now() - t;
  const mins = Math.round(delta / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours + "h ago";
  const days = Math.round(hours / 24);
  if (days < 30) return days + "d ago";
  return new Date(iso).toLocaleDateString();
}

export default function MapsGalleryClient({ data }: { data: MapsGalleryData }) {
  const sharedCount = (data.contacts || []).filter((c) => (c.dealIds || []).length > 1).length;

  return (
    <div style={{ padding: "0 var(--suite-gutter, 32px) 48px", display: "flex", flexDirection: "column", gap: 28 }}>
      <div className="page-h">
        <div>
          <h1>Maps.</h1>
          <div className="sub">
            Every active deal as a cluster · {data.dealsForMap.length} deals · {sharedCount} shared contact{sharedCount === 1 ? "" : "s"} connect across deals.
          </div>
        </div>
        <div className="page-actions">
          <a className="btn primary" href="/suite/maps/new">
            <span style={{ fontWeight: 700, fontSize: 14, marginRight: 6 }}>+</span> New map
          </a>
        </div>
      </div>

      <section className="card" style={{ overflow: "hidden" }}>
        <div className="card-h">
          <div>
            <div className="ttl">Workspace map</div>
            <div className="sub">All active deals and the contacts that connect them.</div>
          </div>
        </div>
        <div style={{ height: 560, position: "relative" }}>
          <WorkspaceMindmap deals={data.dealsForMap} contacts={data.contacts} />
        </div>
      </section>

      <section>
        <div className="card-h" style={{ padding: "0 0 12px" }}>
          <div>
            <div className="ttl">Deal maps</div>
            <div className="sub">Open any map to see every person, file, call, and task attached to a deal.</div>
          </div>
          <span className="text-xs muted">{data.gallery.length} maps</span>
        </div>
        {data.gallery.length === 0 ? (
          <div style={{ border: "1px dashed var(--rule, #e8e4de)", borderRadius: 16, background: "#ffffff", padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text, #0d0c0a)" }}>No deal maps yet</div>
            <div className="muted text-xs" style={{ marginTop: 4 }}>Create your first map from a template to start visualizing a deal.</div>
            <a className="btn primary" style={{ marginTop: 16, display: "inline-flex" }} href="/suite/maps/new">Create a map</a>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {data.gallery.map((m) => (
              <a
                key={m.id}
                href={"/suite/map/" + encodeURIComponent(m.id)}
                className="card"
                style={{ padding: 18, display: "block", textDecoration: "none", color: "inherit", transition: "box-shadow 160ms ease" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", padding: "4px 8px", borderRadius: 999, background: "rgba(86, 36, 199, 0.08)", color: "var(--adga-accent, #5d2cd6)" }}>
                    {m.stage}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#a8a39c" }}>
                    {m.nodeCount} nodes
                  </span>
                </div>
                <div style={{ marginTop: 14, fontSize: 14, fontWeight: 600, lineHeight: 1.35, color: "var(--text, #0d0c0a)" }}>{m.name}</div>
                <div className="muted text-xs" style={{ marginTop: 4 }}>Updated {relTime(m.updated)}</div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
