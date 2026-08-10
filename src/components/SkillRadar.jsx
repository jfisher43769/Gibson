import React, { Suspense, lazy, useEffect, useState } from "react";
import { SURFACE, dim, faint } from "../lib/theme.js";

// The Skill Radar, split out so recharts is not in the first bundle.
//
// recharts (plus the d3 packages it drags in) is around 7MB installed and was the bulk of a
// single 685KB / 193KB-gzipped bundle that every visitor downloaded before the app became
// interactive — to draw two charts, on one sub-tab, of one tab. On a mid-range Android that
// is parse and compile time the nav and the Predictor steppers are all waiting on.
//
// Why a lazy COMPONENT and not a lazy TAB: all 17 routes are prerendered with
// renderToString, which does not resolve React.lazy — lazy-loading StatsTab would replace
// /stats's real content with a spinner in the static HTML, losing the SEO and the first
// paint. A chart is the one thing on the page that cannot prerender usefully anyway, because
// ResponsiveContainer needs a measured DOM box. So the numbers, tables and copy stay in the
// static HTML and only the drawing arrives later.
const Chart = lazy(() => import("./RadarChartImpl.jsx"));

function Placeholder({ height }) {
  return (
    <div style={{
      height, display: "flex", alignItems: "center", justifyContent: "center",
      ...SURFACE.flat, borderRadius: 10, color: dim, fontSize: 12, fontStyle: "italic",
      border: `1px solid ${faint}`,
    }}>
      Drawing the radar…
    </div>
  );
}

export function SkillRadar({ height = 240, ...props }) {
  // Never attempt the chart during prerender: renderToString would hit the lazy boundary and
  // render the fallback into the static HTML for no benefit. Mount it after hydration.
  const [onClient, setOnClient] = useState(false);
  useEffect(() => { setOnClient(true); }, []);
  if (!onClient) return <Placeholder height={height} />;
  return (
    <Suspense fallback={<Placeholder height={height} />}>
      <div style={{ height }}><Chart {...props} /></div>
    </Suspense>
  );
}
