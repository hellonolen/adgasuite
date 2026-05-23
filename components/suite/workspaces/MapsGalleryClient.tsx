"use client";

/**
 * Maps gallery — list of deal maps. The "workspace mindmap" overview graph that used to
 * sit above the list was deleted: only one mind map exists in the product, and that's the
 * deal map at /suite/map/<id>.
 */

export interface MapsGalleryData {
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
  return (
    <div style={{ padding: "0 var(--suite-gutter, 32px) 48px", display: "flex", flexDirection: "column", gap: 28 }}>
      <div className="page-h">
        <div>
          <h1>Maps.</h1>
          <div className="sub">
            {data.gallery.length} {data.gallery.length === 1 ? "deal map" : "deal maps"}. Open any one to see every person, file, call, and task attached.
          </div>
        </div>
        <div className="page-actions">
          <a className="btn primary" href="/suite/maps/new">
            <span style={{ fontWeight: 700, fontSize: 14, marginRight: 6 }}>+</span> New map
          </a>
        </div>
      </div>

      <section>
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
