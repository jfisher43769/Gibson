// GIBSON dynamic Open Graph cards — /api/og?type=club&id=LAR  |  ?type=section&id=table
// Renders a 1200x630 social card in GIBSON house style on Vercel's edge runtime.
// Every value comes from data.js — nothing here is invented. A club with no final-table
// row (e.g. a promoted side) shows "Promoted", never a fabricated position.
import React from "react";
import { ImageResponse } from "@vercel/og";
import { CLUBS, FULL_TABLE, MARKET_VALUES } from "../data.js";

export const config = { runtime: "edge" };

const BG_A = "#0B1512";
const BG_B = "#10241B";
const AMBER = "#FFB627";
const CHALK = "#EDF5EF";
const DIM = "rgba(237,245,239,0.62)";

// Section copy — editorial, mirrors the per-route <title>/description in App.jsx.
const SECTIONS = {
  table: { name: "The Table", desc: "Final 25/26 Premiership standings, form and squad values" },
  fixtures: { name: "Fixtures", desc: "Every 26/27 fixture, by club and by round, plus the Euro ties" },
  predictor: { name: "The Predictor", desc: "Predict the table and every gameweek — then share your card" },
  stats: { name: "Stats Lab", desc: "xG, discipline and the GIBSON Index for the NIFL Premiership" },
};

const ordinal = (n) =>
  n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th");

// The Gibson Cup on terrace steps — same geometry as LogoMark in App.jsx, as a data URI
// so satori renders it as an image (its SVG subset is limited; an <img> is reliable).
function logoDataUri(size) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 200 200">` +
    `<defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#FFD873"/><stop offset="1" stop-color="#FFA51F"/>` +
    `</linearGradient></defs><g fill="url(#a)">` +
    `<path d="M54 38 L146 38 L138 76 C133 101 118 114 100 114 C82 114 67 101 62 76 Z"/>` +
    `<path d="M56 46 C30 46 26 78 49 88 L54 78 C40 71 44 55 56 55 Z"/>` +
    `<path d="M144 46 C170 46 174 78 151 88 L146 78 C160 71 156 55 144 55 Z"/>` +
    `<rect x="92" y="114" width="16" height="15" rx="3"/>` +
    `<rect x="70" y="132" width="60" height="10" rx="2"/>` +
    `<rect x="57" y="145" width="86" height="10" rx="2"/>` +
    `<rect x="43" y="158" width="114" height="10" rx="2"/>` +
    `</g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Barlow Condensed to match the house type. Non-fatal: if the fetch fails, the card still
// renders in @vercel/og's default font rather than erroring — an OG image must never 500.
async function loadCondensedFont(weight) {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@${weight}`,
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; rv:1.0) Gecko" } }
    ).then((r) => r.text());
    const url = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
    if (!url) return null;
    const buf = await fetch(url).then((r) => (r.ok ? r.arrayBuffer() : null));
    return buf ? { name: "Barlow Condensed", data: buf, weight, style: "normal" } : null;
  } catch {
    return null;
  }
}

// Real React elements (via createElement) — @vercel/og/satori consume these directly,
// no JSX transpile step needed in this plain-JS edge function.
const h = React.createElement;

function shell(children) {
  return h(
    "div",
    {
      style: {
        width: "1200px", height: "630px", display: "flex", flexDirection: "column",
        justifyContent: "space-between", padding: "64px 72px",
        background: `linear-gradient(135deg, ${BG_A}, ${BG_B})`,
        color: CHALK, fontFamily: "Barlow Condensed, sans-serif",
      },
    },
    children
  );
}

function header() {
  return h(
    "div",
    { style: { display: "flex", alignItems: "center", gap: "20px" } },
    h("img", { src: logoDataUri(84), width: 84, height: 84 }),
    h(
      "div",
      { style: { display: "flex", flexDirection: "column" } },
      h("div", { style: { fontSize: "56px", fontWeight: 800, letterSpacing: "2px", color: CHALK, lineHeight: 1 } }, "GIBSON"),
      h("div", { style: { fontSize: "22px", letterSpacing: "5px", textTransform: "uppercase", color: DIM } }, "The home of Irish League stats")
    )
  );
}

function statTile(label, value, accent) {
  return h(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: "4px" } },
    h("div", { style: { fontSize: "64px", fontWeight: 800, color: accent || CHALK, lineHeight: 1 } }, value),
    h("div", { style: { fontSize: "24px", letterSpacing: "3px", textTransform: "uppercase", color: DIM } }, label)
  );
}

function clubBody(code) {
  const c = CLUBS[code];
  const idx = FULL_TABLE.findIndex((r) => r.club === code);
  const row = idx >= 0 ? FULL_TABLE[idx] : null;
  const mv = MARKET_VALUES.find((m) => m.club === code);
  const accent = (c.colors && c.colors[0]) || AMBER;

  const tiles = [];
  if (row) {
    tiles.push(statTile("Final · 25/26", ordinal(idx + 1), AMBER));
    tiles.push(statTile("Points", String(row.pts)));
  } else {
    tiles.push(statTile("25/26", "Promoted", AMBER));
  }
  if (mv) tiles.push(statTile("Squad value", `€${mv.total.toFixed(2)}m`));

  return [
    // Club colour accent bar
    h("div", { style: { display: "flex", width: "220px", height: "12px", background: accent, borderRadius: "6px", marginBottom: "10px" } }),
    h("div", { style: { fontSize: "120px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: CHALK, lineHeight: 0.95 } }, c.name),
    h("div", { style: { fontSize: "26px", letterSpacing: "4px", textTransform: "uppercase", color: DIM, marginTop: "6px" } }, c.ground),
    h("div", { style: { display: "flex", gap: "56px", marginTop: "34px" } }, ...tiles),
  ];
}

function sectionBody(id) {
  const s = SECTIONS[id];
  return [
    h("div", { style: { display: "flex", width: "220px", height: "12px", background: AMBER, borderRadius: "6px", marginBottom: "10px" } }),
    h("div", { style: { fontSize: "128px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: CHALK, lineHeight: 0.95 } }, s.name),
    h("div", { style: { fontSize: "34px", color: DIM, marginTop: "20px", maxWidth: "980px", lineHeight: 1.25 } }, s.desc),
  ];
}

function footer() {
  return h(
    "div",
    { style: { display: "flex", alignItems: "center", gap: "16px" } },
    h("div", { style: { display: "flex", width: "48px", height: "8px", background: AMBER, borderRadius: "4px" } }),
    h("div", { style: { fontSize: "26px", letterSpacing: "4px", textTransform: "uppercase", color: DIM } }, "gibsonstats.com")
  );
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");

  let body;
  if (type === "club" && id && CLUBS[id] && id !== "GLV") {
    body = clubBody(id);
  } else if (type === "section" && id && SECTIONS[id]) {
    body = sectionBody(id);
  } else {
    // Unknown request: still return a branded card, never an error image.
    body = [
      h("div", { style: { display: "flex", width: "220px", height: "12px", background: AMBER, borderRadius: "6px", marginBottom: "10px" } }),
      h("div", { style: { fontSize: "128px", fontWeight: 800, textTransform: "uppercase", color: CHALK, lineHeight: 0.95 } }, "GIBSON"),
      h("div", { style: { fontSize: "34px", color: DIM, marginTop: "20px" } }, "The home of Irish League stats"),
    ];
  }

  const middle = h("div", { style: { display: "flex", flexDirection: "column" } }, ...body);
  const tree = shell([header(), middle, footer()]);

  const font = await loadCondensedFont(700);
  const options = { width: 1200, height: 630 };
  if (font) options.fonts = [font];

  return new ImageResponse(tree, options);
}
