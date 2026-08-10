import React from "react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from "recharts";
import { dim, faint } from "../lib/theme.js";

// The only module in the app that imports recharts. Loaded on demand by SkillRadar.jsx —
// keep it that way, or the library lands back in the entry bundle for every visitor.
//
// `series` is one or two { key, colour } pairs, so the same chart draws a single player's
// profile and a two-player duel without either caller knowing anything about recharts.
export default function RadarChartImpl({ data, series, outerRadius = "75%" }) {
  return (
    <ResponsiveContainer>
      <RadarChart data={data} outerRadius={outerRadius}>
        <PolarGrid stroke={faint} />
        <PolarAngleAxis dataKey="axis" tick={{ fill: dim, fontSize: 12, fontFamily: "Barlow" }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        {series.map((s) => (
          <Radar key={s.key} dataKey={s.key} stroke={s.colour} fill={s.colour}
            fillOpacity={s.fillOpacity ?? 0.35} strokeWidth={2} isAnimationActive />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  );
}
