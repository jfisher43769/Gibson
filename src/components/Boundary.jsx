import React from "react";

/* ================= APP ================= */
// Full-app crash screen — mirrored by the pre-React window.onerror fallback in index.html
function CrashScreen({ minHeight = "100vh" }) {
  return (
    <div style={{ minHeight, background: "#0B1512", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", fontFamily: "'Barlow', sans-serif" }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>🏆</div>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 26, color: "#EDF5EF", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>GIBSON hit a post</div>
      <div style={{ fontSize: 13, color: "#8FA69B", lineHeight: 1.6, maxWidth: 340, marginBottom: 18 }}>
        Refresh to retry — if it keeps happening, a fix is usually live within the hour.
      </div>
      <button onClick={() => window.location.reload()} style={{
        padding: "12px 28px", borderRadius: 12, border: "none", cursor: "pointer",
        background: "#FFB627", color: "#0B1512", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: "0.08em", textTransform: "uppercase",
      }}>Refresh to retry</button>
    </div>
  );
}

// Top-level boundary around the whole app — catches render crashes the per-tab
// GibsonBoundary can't (header, nav, footer, the boundary machinery itself)
export class TopBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (this.state.err) return <CrashScreen />;
    return this.props.children;
  }
}

export class GibsonBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    // One crash screen, one voice — reduced min-height so the header/nav stay usable
    // around it. Sections pass a compact minHeight so one failing block stays contained.
    if (this.state.err) return <CrashScreen minHeight={this.props.minHeight || "60vh"} />;
    return this.props.children;
  }
}
