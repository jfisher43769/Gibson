import React from "react";

/* ================= VIEWS ================= */
export function Skel({ w = "100%", h = 12, style }) {
  return <div className="gb-skel" style={{ width: w, height: h, ...style }} aria-hidden="true" />;
}

export function SkelRows({ n = 3 }) {
  return (
    <div style={{ border: "1px solid rgba(240,255,245,0.1)", borderRadius: 14, overflow: "hidden" }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: i < n - 1 ? "1px solid rgba(240,255,245,0.07)" : "none" }}>
          <Skel w={20} h={20} style={{ borderRadius: "50%" }} />
          <Skel w={`${55 - i * 8}%`} h={11} />
          <Skel w={34} h={11} style={{ marginLeft: "auto" }} />
        </div>
      ))}
    </div>
  );
}
