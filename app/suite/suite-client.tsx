"use client";

import dynamic from "next/dynamic";

// Static shell skeleton rendered during the initial JS load so users see the platform structure
// (left nav rail, top bar shape, right AI panel placeholder) instead of a blank page on every
// /suite/<route> navigation. AdgaSuite uses window/localStorage on mount, so SSR stays off — but
// at least the chrome is visible until hydration.
function SuiteShellSkeleton() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr 340px",
        minHeight: "100vh",
        background: "#f9f7f4",
        color: "#0d0c0a",
      }}
    >
      <aside
        style={{
          borderRight: "1px solid #e8e4de",
          background: "rgba(255, 255, 255, 0.85)",
          padding: "18px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
        aria-hidden
      >
        <div style={{ height: 22, width: 60, background: "rgba(86, 36, 199, 0.18)", borderRadius: 4 }} />
        <div style={{ marginTop: 14, height: 14, width: 110, background: "#e8e4de", borderRadius: 3 }} />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} style={{ height: 28, width: "100%", background: "#eee9e2", borderRadius: 6, opacity: 0.6 - i * 0.04 }} />
        ))}
      </aside>
      <main style={{ display: "flex", flexDirection: "column", minWidth: 0 }} aria-hidden>
        <div
          style={{
            height: 56,
            borderBottom: "1px solid #e8e4de",
            display: "flex",
            alignItems: "center",
            padding: "0 24px",
            gap: 12,
            background: "rgba(255, 255, 255, 0.85)",
          }}
        >
          <div style={{ height: 18, width: 80, background: "#e8e4de", borderRadius: 4 }} />
          <div style={{ flex: 1 }} />
          <div style={{ height: 28, width: 200, background: "#f1ede8", borderRadius: 999 }} />
          <div style={{ height: 28, width: 90, background: "#5d2cd6", opacity: 0.85, borderRadius: 999 }} />
        </div>
        <div style={{ padding: "24px 32px", flex: 1 }}>
          <div style={{ height: 36, width: 220, background: "#e8e4de", borderRadius: 6, marginBottom: 12 }} />
          <div style={{ height: 14, width: 320, background: "#eee9e2", borderRadius: 4, marginBottom: 28 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ height: 86, background: "#fff", border: "1px solid #e8e4de", borderRadius: 12 }} />
            ))}
          </div>
          <div style={{ height: 240, background: "#fff", border: "1px solid #e8e4de", borderRadius: 14 }} />
        </div>
      </main>
      <aside
        style={{
          borderLeft: "1px solid #e8e4de",
          background: "rgba(255, 255, 255, 0.92)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
        aria-hidden
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ height: 22, width: 22, borderRadius: "50%", background: "linear-gradient(135deg, #5d2cd6, #b78aff)" }} />
          <div style={{ height: 16, width: 60, background: "#e8e4de", borderRadius: 4 }} />
        </div>
        <div style={{ height: 32, background: "rgba(86, 36, 199, 0.05)", borderRadius: 8 }} />
        <div style={{ height: 80, background: "#f5f1ec", borderRadius: 10, alignSelf: "flex-end", width: "75%" }} />
        <div style={{ height: 64, background: "#5d2cd6", opacity: 0.85, borderRadius: 10, alignSelf: "flex-start", width: "70%" }} />
        <div style={{ flex: 1 }} />
        <div style={{ height: 84, background: "#fff", border: "1px solid #e8e4de", borderRadius: 12 }} />
      </aside>
    </div>
  );
}

const AdgaSuite = dynamic(() => import("@/components/adga/AdgaSuite"), {
  ssr: false,
  loading: () => <SuiteShellSkeleton />,
});

export default function SuiteClient({ bootstrap = null }: { bootstrap?: any }) {
  return <AdgaSuite bootstrap={bootstrap} />;
}
